import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { generatePatchPlan } from "@/services/ai/generatePatchPlan";
import { GitHubService } from "@/services/github";
import { RepositoryContextCollector } from "@/lib/repository-context-collector";
import { FailureLocalizationEngine } from "@/lib/failure-localization-engine";
import { FailureEvidenceCollector } from "@/lib/failure-evidence-collector";
import { RootCauseValidator, ValidationResult } from "@/lib/root-cause-validator";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: issueId } = await params;

  if (!session?.user?.id || !session.accessToken) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        incident: {
          include: {
            repository: true,
            workflowRun: {
              include: {
                workflow: true,
                analyses: { orderBy: { createdAt: 'desc' }, take: 1 }
              }
            }
          }
        }
      }
    });

    if (!issue) return errorResponse("Issue not found", 404);
    if (issue.type !== 'FAILURE') {
        console.error(`[GENERATE_FIX] REJECTED: Issue is not a FAILURE.`);
        console.error(`- Issue ID: ${issue.id}`);
        console.error(`- Issue Type: ${issue.type}`);
        
        return jsonResponse({
          success: false,
          code: "INVALID_ISSUE_TYPE",
          reason: `Remediation is only available for actionable FAILURE issues. This issue is a ${issue.type}.`,
          confidence: issue.confidence / 100
        }, 422);
    }

    const incident = issue.incident;
    const repository = incident.repository;
    const workflowRun = incident.workflowRun;
    const analysis = workflowRun.analyses[0];

    if (!analysis) return errorResponse("No analysis found for this issue", 400);

    const github = new GitHubService(session.accessToken);
    const branch = workflowRun.branch || repository.defaultBranch;

    const repoContext = await RepositoryContextCollector.collect({
      github,
      owner: repository.owner!,
      repo: repository.name,
      branch: branch,
      logs: analysis.rawLogs || "",
      rootCause: issue.rootCause 
    });

    // Stage 1: Failure Localization
    const logsText = analysis.rawLogs || "";
    
    console.log(`[PIPELINE_AUDIT] Issue from DB: file=${issue.file}, confidence=${issue.confidence}`);

    const localization = await FailureLocalizationEngine.localizeAsync(logsText, repoContext.structure, issue.rootCause);
    
    const THRESHOLD = 0.85;
    if (localization === 'UNCERTAIN_ROOT_CAUSE') {
       const deterministicResults = FailureLocalizationEngine.localize(logsText, repoContext.structure, issue.rootCause);
       const confidence = deterministicResults.length > 0 ? deterministicResults[0].confidence : 0;
       
       console.error(`[GENERATE_FIX] REJECTED: Confidence too low.`);
       console.error(`- Threshold: ${THRESHOLD}`);
       console.error(`- Confidence: ${confidence}`);
       console.error(`- Localized File: ${deterministicResults[0]?.file || 'None'}`);
       console.error(`- Rejection Reason: UNCERTAIN_ROOT_CAUSE`);

       if (confidence === 0 && !deterministicResults[0]?.file) {
          return jsonResponse({
            success: false,
            code: "LOCALIZATION_DATA_MISSING",
            reason: "The localization engine could not find any evidence for this issue in the logs.",
            missingFields: ["confidence", "file"]
          }, 422);
       }

       return jsonResponse({
         success: false,
         code: "UNCERTAIN_ROOT_CAUSE",
         reason: "Automatic remediation blocked because localization confidence is too low.",
         confidence: confidence,
         threshold: THRESHOLD
       }, 422);
    }

    const primaryFailure = localization[0];
    console.log(`[PIPELINE_AUDIT] Engine accepted: file=${primaryFailure.file}, workspace=${primaryFailure.workspace}, confidence=${primaryFailure.confidence}`);
    console.log(`[GENERATE_FIX] ACCEPTED: Localization successful.`);
    console.log(`- File: ${primaryFailure.file}`);
    console.log(`- Workspace: ${primaryFailure.workspace}`);
    console.log(`- Confidence: ${primaryFailure.confidence}`);
    console.log(`- Threshold: ${THRESHOLD}`);

    // Stage 2: Evidence Collection
    const failingFile = issue.file;
    let failingFileContent = "";
    if (failingFile) {
       const fetched = await github.getFileContentSafe(repository.owner!, repository.name, failingFile, branch);
       if (fetched) failingFileContent = fetched.content;
    }
    
    const evidence = FailureEvidenceCollector.collect({ 
        context: repoContext, 
        failure: primaryFailure,
        failingFileContent
    });

    // Stage 4: Patch Planning
    console.log(`[STAGE 4] Generating AI Patch Plan...`);
    const plan = await generatePatchPlan({
      logs: logsText,
      context: repoContext,
      evidence
    });
    console.log(`[FIX_AUDIT] AI response received`);

    // Stage 3: Root Cause Validation
    const validation = RootCauseValidator.validate(evidence, plan.rootCause);
    if (validation === ValidationResult.FALSE_ROOT_CAUSE) {
       console.error(`[GENERATE_FIX] REJECTED: False root cause detected.`);
       console.error(`- Claimed Root Cause: ${plan.rootCause}`);
       console.error(`- Evidence Category: ${evidence.category}`);
       
       return jsonResponse({
         success: false,
         code: "FALSE_ROOT_CAUSE",
         reason: "Automatic remediation blocked: AI-claimed root cause was contradicted by repository evidence.",
         confidence: primaryFailure.confidence
       }, 422);
    }

    console.log(`[FIX_AUDIT] Patch parsed`);

    // Store in IssueFix
    const issueFix = await prisma.issueFix.create({
      data: {
        issueId: issue.id,
        explanation: plan.explanation,
        suggestedFix: plan.title,
        confidence: plan.confidence
      }
    });

    console.log(`[FIX_AUDIT] Patch saved`);
    console.log(`[FIX_AUDIT] Patch id ${issueFix.id}`);
    console.log(`[FIX_AUDIT] API response sent`);

    return jsonResponse(issueFix);
  } catch (error: any) {
    console.error("Generate fix error:", error);
    return errorResponse(`Failed to generate fix: ${error.message}`);
  }
}

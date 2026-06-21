import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { generatePatchWithAI } from "@/services/ai/generatePatch";
import { GitHubService } from "@/services/github";
import { RepositoryContextCollector } from "@/lib/repository-context-collector";
import { FailureLocalizationEngine } from "@/lib/failure-localization-engine";
import { FailureEvidenceCollector } from "@/lib/failure-evidence-collector";
import { PatchValidator } from "@/lib/patch-validator";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: issueId } = await params;
  const { issueFixId } = await req.json();

  console.log(`[DIFF_AUDIT] Request received`);
  console.log(`[DIFF_AUDIT] Issue id: ${issueId}`);
  console.log(`[DIFF_AUDIT] Patch id / Fix id: ${issueFixId}`);

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
            workflowRun: { include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } } }
          }
        },
        fixes: { where: { id: issueFixId } }
      }
    });

    if (!issue || !issue.fixes[0]) {
       console.log(`[DIFF_AUDIT] Diff generation failed: Issue or approved fix not found`);
       return jsonResponse({
           code: "NOT_FOUND",
           reason: "Issue or approved fix not found",
           issueId,
           patchId: issueFixId
       }, 404);
    }
    
    console.log(`[DIFF_AUDIT] Fix found`);

    if (issue.type !== 'FAILURE') {
        console.log(`[DIFF_AUDIT] Diff generation failed: Not a FAILURE issue`);
        return jsonResponse({
           code: "INVALID_ISSUE_TYPE",
           reason: "Remediation is only available for FAILURE issues.",
           issueId,
           patchId: issueFixId
        }, 422);
    }

    const fix = issue.fixes[0];
    const incident = issue.incident;
    const repository = incident.repository;
    const workflowRun = incident.workflowRun;
    const analysis = workflowRun.analyses[0];
    const github = new GitHubService(session.accessToken);
    const branch = workflowRun.branch || repository.defaultBranch;

    const repoContext = await RepositoryContextCollector.collect({
      github, owner: repository.owner!, repo: repository.name, branch, logs: analysis.rawLogs || "", rootCause: issue.rootCause 
    });

    const localization = await FailureLocalizationEngine.localizeAsync(analysis.rawLogs || "", repoContext.structure, issue.rootCause);
    if (localization === 'UNCERTAIN_ROOT_CAUSE') {
        console.log(`[DIFF_AUDIT] Diff generation failed: Localization failed`);
        return jsonResponse({
           code: "LOCALIZATION_FAILED",
           reason: "Failed to securely localize the issue context.",
           issueId,
           patchId: issueFixId
        }, 422);
    }

    let failingFileContent = "";
    if (issue.file) {
       const fetched = await github.getFileContentSafe(repository.owner!, repository.name, issue.file, branch);
       if (fetched) failingFileContent = fetched.content;
    }
    
    const evidence = FailureEvidenceCollector.collect({ 
        context: repoContext, failure: localization[0], failingFileContent
    });

    // Stage 5: Patch Generation
    const plan = {
        title: fix.suggestedFix,
        rootCause: issue.rootCause,
        explanation: fix.explanation,
        confidence: fix.confidence,
        requiredChanges: [], // Reconstructed or simplified
        affectedFiles: [issue.file].filter(Boolean) as string[]
    };

    console.log(`[DIFF_AUDIT] Diff generation started`);
    const generated = await generatePatchWithAI({
      plan: plan as any,
      evidence,
      context: repoContext,
      failingFileContent
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { confidenceThreshold: true }
    });
    const threshold = user?.confidenceThreshold ?? 85;

    // Stage 6: Patch Validation
    const validation = PatchValidator.validate(generated, repoContext, issue.rootCause, failingFileContent, undefined, threshold);
    if (!validation.valid) {
        console.log(`[DIFF_AUDIT] Diff generation failed: Patch Validation Failed`);
        console.log(`[DIFF_AUDIT] Exact rejection reason: ${validation.reason}`);
        return jsonResponse({
           code: "PATCH_VALIDATION_FAILED",
           reason: `Patch Validation Failed: ${validation.reason}`,
           issueId,
           patchId: issueFixId
        }, 422);
    }

    const issuePatch = await prisma.issuePatch.create({
      data: {
        issueId: issue.id,
        diff: generated.diff,
        affectedFiles: generated.affectedFiles,
        status: "GENERATED"
      }
    });

    return jsonResponse(issuePatch);
  } catch (error: any) {
    console.error("Generate diff error:", error);
    console.log(`[DIFF_AUDIT] Diff generation failed`);
    console.log(`[DIFF_AUDIT] Exact rejection reason: ${error.message}`);
    
    return jsonResponse({
        code: "GENERATION_ERROR",
        reason: `Failed to generate diff: ${error.message}`,
        issueId,
        patchId: issueFixId
    }, 500);
  }
}

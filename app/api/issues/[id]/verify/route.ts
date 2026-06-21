import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { RemediationExecutionEngine, RemediationStatus } from "@/lib/remediation-execution-engine";
import { GitHubService } from "@/services/github";
import { RepositoryContextCollector } from "@/lib/repository-context-collector";
import { FailureLocalizationEngine } from "@/lib/failure-localization-engine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: issueId } = await params;
  const { issuePatchId } = await req.json();

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
        patches: { where: { id: issuePatchId } }
      }
    });

    if (!issue || !issue.patches[0]) return errorResponse("Issue or patch not found", 404);
    if (issue.type !== 'FAILURE') return errorResponse("Remediation is only available for FAILURE issues.", 422);

    const patch = issue.patches[0];
    const incident = issue.incident;
    const repository = incident.repository;
    const workflowRun = incident.workflowRun;
    const github = new GitHubService(session.accessToken);
    const branch = workflowRun.branch || repository.defaultBranch;

    const repoContext = await RepositoryContextCollector.collect({
      github, owner: repository.owner!, repo: repository.name, branch, logs: workflowRun.analyses[0]?.rawLogs || "", rootCause: issue.rootCause 
    });

    const originalContents: Record<string, string> = {};
    for (const file of patch.affectedFiles) {
      const fetched = await github.getFileContentSafe(repository.owner!, repository.name, file, branch);
      if (fetched) originalContents[file] = fetched.content;
    }

    const prevFailureContext = {
        file: issue.file,
        message: issue.rootCause,
        confidence: issue.confidence / 100,
        errorType: issue.category
    };

    // Stage 7: Verification
    const result = await RemediationExecutionEngine.execute({
      affectedFiles: patch.affectedFiles,
      originalContents,
      diff: patch.diff,
      context: repoContext,
      previousFailureContext: prevFailureContext as any,
      fetchFile: (p) => github.getFileContentSafe(repository.owner!, repository.name, p, branch).then(f => f?.content || null)
    });

    // Stage 9: Loop Protection
    let finalStatus = result.success ? "VERIFIED" : "FAILED";
    
    if (!result.success) {
      if (result.status === RemediationStatus.SAME_FAILURE || result.status === RemediationStatus.VERIFICATION_ENV_FAILED) {
        finalStatus = "MANUAL_REVIEW_REQUIRED";
      } else if (result.newFailureContext && result.newFailureContext.confidence < 0.85) {
        finalStatus = "MANUAL_REVIEW_REQUIRED";
      }
    }

    await prisma.issue.update({
      where: { id: issue.id },
      data: { status: finalStatus }
    });

    await prisma.issuePatch.update({
      where: { id: patch.id },
      data: { status: finalStatus }
    });

    return jsonResponse({
        success: result.success,
        status: finalStatus,
        verification: result.verificationResult
    });

  } catch (error: any) {
    console.error("Verification error:", error);
    return errorResponse(`Verification failed: ${error.message}`);
  }
}

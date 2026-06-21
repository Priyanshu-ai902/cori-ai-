import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const userId = session.user.id;

    const patches = await prisma.patch.findMany({
      where: { repository: { userId } },
      include: {
        repository: true,
        workflowRun: {
          include: { 
            workflow: true,
            issues: { take: 1 }
          }
        },
        analysis: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const verifications = patches.map(patch => {
      const issue = patch.workflowRun.issues[0];
      return {
        id: patch.id,
        patchTitle: patch.title,
        repository: patch.repository.fullName,
        repoName: patch.repository.name,
        status: patch.status,
        prNumber: patch.prNumber,
        prUrl: patch.prUrl,
        workflow: patch.workflowRun.workflow.name,
        branch: patch.workflowRun.branch,
        commitSha: patch.workflowRun.commitSha,
        failureType: issue?.category || 'General Failure',
        createdAt: patch.createdAt,
        updatedAt: patch.updatedAt,
        verifiedAt: patch.verifiedAt,
        verificationStatus: patch.verificationStatus,
        patchType: patch.patchType,
        confidence: patch.confidence
      };
    });

    return jsonResponse(verifications);
  } catch (error) {
    console.error("Fetch verifications error:", error);
    return errorResponse("Failed to fetch verifications");
  }
}

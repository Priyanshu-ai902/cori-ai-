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
      where: { 
        repository: { userId },
        prNumber: { not: null }
      },
      include: {
        repository: true,
        workflowRun: {
          include: {
            workflow: true,
            incidents: { take: 1 }
          }
        },
        analysis: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    const pullRequests = patches.map(patch => ({
      id: patch.id,
      title: patch.title,
      description: patch.description,
      repository: patch.repository.fullName,
      repoName: patch.repository.name,
      prNumber: patch.prNumber,
      prUrl: patch.prUrl,
      status: patch.status,
      verificationStatus: patch.verificationStatus,
      verificationResult: patch.verificationResult,
      confidence: patch.confidence,
      createdAt: patch.createdAt,
      updatedAt: patch.updatedAt,
      verifiedAt: patch.verifiedAt,
      workflow: patch.workflowRun.workflow.name,
      incidentId: patch.workflowRun.incidents[0]?.id,
      analysisId: patch.analysisId
    }));

    return jsonResponse(pullRequests);
  } catch (error) {
    console.error("Fetch pull requests error:", error);
    return errorResponse("Failed to fetch pull requests");
  }
}

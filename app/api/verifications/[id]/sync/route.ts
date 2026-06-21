import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { GitHubService } from "@/services/github";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id || !session.accessToken) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const patch = await prisma.patch.findUnique({
      where: { id },
      include: { repository: true }
    });

    if (!patch) {
      return errorResponse("Verification not found", 404);
    }

    // If there's no PR number, we can't sync against GitHub PR state yet
    if (!patch.prNumber) {
      return jsonResponse({ message: "No PR to sync", status: patch.status });
    }

    const github = new GitHubService(session.accessToken);
    const pr = await github.getPR(patch.repository.owner!, patch.repository.name, patch.prNumber);

    let newStatus = patch.status;

    if (pr.merged) {
      newStatus = "RESOLVED";
    } else if (pr.state === "open") {
      newStatus = "PR_CREATED";
    } else if (pr.state === "closed" && !pr.merged) {
        // Handle closed but not merged? Maybe 'FAILED' or 'CLOSED'?
        // For now, let's keep it as is or move to a 'CLOSED' state if it exists.
        // User requirements focus on 'PR Created' and 'Resolved' (merged).
    }

    if (newStatus !== patch.status) {
      await prisma.patch.update({
        where: { id: patch.id },
        data: { 
          status: newStatus,
          verifiedAt: pr.merged ? newStatus === "RESOLVED" ? new Date() : patch.verifiedAt : patch.verifiedAt
        }
      });
      
      // Also update the associated Issue status if it exists
      const workflowRun = await prisma.workflowRun.findUnique({
        where: { id: patch.workflowRunId },
        include: { issues: { take: 1 } }
      });

      if (workflowRun?.issues[0]) {
          await prisma.issue.update({
              where: { id: workflowRun.issues[0].id },
              data: { status: newStatus }
          });
      }
    }

    return jsonResponse({ 
      message: "Sync complete", 
      status: newStatus,
      merged: pr.merged,
      state: pr.state
    });

  } catch (error: any) {
    console.error("Verification sync error:", error);
    return errorResponse(`Sync failed: ${error.message}`);
  }
}

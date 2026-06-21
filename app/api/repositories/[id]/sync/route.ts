import { auth } from "@/auth";
import { GitHubService } from "@/services/github";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  try {
    const { id } = await params;
    console.log("[Sync] Repository ID:", id);

    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }

    // Get token from Account table
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });

    if (!account?.access_token) {
      return errorResponse("GitHub not connected", 401);
    }

    const githubService = new GitHubService(account.access_token);

    const result = await githubService.syncRepository(id);
    
    return jsonResponse({ 
      message: "Sync complete", 
      repositoryId: id,
      workflowsSynced: result.workflowsSynced,
      workflowRunsSynced: result.workflowRunsSynced
    });
  } catch (error: any) {
    console.error(`[API] Targeted sync error:`, error);
    return errorResponse(error.message || "Failed to sync repository");
  }
}

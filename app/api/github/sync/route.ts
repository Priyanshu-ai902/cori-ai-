import { auth } from "@/auth";
import { GitHubService } from "@/services/github";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  const body = await req.json();
  const { repositories: selectedRepos } = body;

  // Get token from Account table
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
  });

  if (!account?.access_token) {
    return errorResponse("GitHub not connected", 401);
  }

  const githubService = new GitHubService(account.access_token);

  try {
    const selectedGithubIds = selectedRepos ? selectedRepos.map((r: any) => r.id) : undefined;
    
    // Use the consolidated sync service
    await githubService.syncUserRepositories(session.user.id, selectedGithubIds);

    return jsonResponse({ message: "Sync complete" });
  } catch (error) {
    console.error("Sync error:", error);
    return errorResponse("Failed to sync with GitHub");
  }
}

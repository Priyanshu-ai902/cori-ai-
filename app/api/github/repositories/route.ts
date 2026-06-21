import { auth } from "@/auth";
import { GitHubService } from "@/services/github";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken || !session?.user?.id) {
    // Try to find the token in the Account table if not in session
    const account = await prisma.account.findFirst({
      where: { userId: session?.user?.id, provider: "github" },
    });

    if (!account?.access_token) {
      return errorResponse("GitHub not connected", 401);
    }
    
    const githubService = new GitHubService(account.access_token);
    try {
        const repos = await githubService.listRepositories();
        return jsonResponse(repos);
    } catch (error) {
        return errorResponse("Failed to fetch repositories");
    }
  }

  const githubService = new GitHubService(session.accessToken);

  try {
    const repos = await githubService.listRepositories();
    return jsonResponse(repos);
  } catch (error) {
    console.error("Fetch repos error:", error);
    return errorResponse("Failed to fetch repositories");
  }
}

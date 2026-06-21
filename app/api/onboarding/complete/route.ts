import { auth } from "@/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";
import { GitHubService } from "@/services/github";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { repositoryId } = await req.json();

    // Mark onboarding as complete
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    });

    // If a repository was selected, add it
    if (repositoryId) {
      const account = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: "github" },
      });

      if (account?.access_token) {
        const githubService = new GitHubService(account.access_token);
        // repositoryId from GitHub API is a number
        await githubService.syncUserRepositories(session.user.id, [Number(repositoryId)]);
      }
    }

    return jsonResponse({ message: "Onboarding complete" });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return errorResponse("Failed to complete onboarding");
  }
}

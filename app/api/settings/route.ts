import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { GitHubService } from "@/services/github";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      autoPRCreation: true,
      autoVerification: true,
      manualApprovalRequired: true,
      confidenceThreshold: true,
      accounts: {
        where: { provider: "github" },
        select: { providerAccountId: true }
      },
      _count: {
        select: { repositories: true }
      }
    }
  });

  if (!user) {
    return errorResponse("User not found", 404);
  }

  const account = user.accounts[0];
  let githubUsername = null;

  if (account && session?.accessToken) {
    try {
      const githubService = new GitHubService(session.accessToken as string);
      const profile = await githubService.getUserProfile();
      githubUsername = profile.login;
    } catch (error) {
      console.error("Failed to fetch GitHub profile:", error);
    }
  }

  return jsonResponse({
    account: {
      name: user.name,
      email: user.email,
      githubConnected: user.accounts.length > 0,
      githubUsername
    },
    github: {
      connected: user.accounts.length > 0,
      repositoryCount: user._count.repositories
    },
    remediation: {
      autoPRCreation: user.autoPRCreation,
      autoVerification: user.autoVerification,
      manualApprovalRequired: user.manualApprovalRequired,
      confidenceThreshold: user.confidenceThreshold
    }
  });
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    
    // Whitelist fields to update
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.autoPRCreation !== undefined) updateData.autoPRCreation = body.autoPRCreation;
    if (body.autoVerification !== undefined) updateData.autoVerification = body.autoVerification;
    if (body.manualApprovalRequired !== undefined) updateData.manualApprovalRequired = body.manualApprovalRequired;
    if (body.confidenceThreshold !== undefined) updateData.confidenceThreshold = body.confidenceThreshold;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });

    return jsonResponse(updatedUser);
  } catch (error: any) {
    return errorResponse(error.message, 400);
  }
}

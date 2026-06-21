import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { GitHubService } from "@/services/github";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const userId = session.user.id;
    const repositories = await prisma.repository.findMany({
      where: { userId },
      include: {
        workflows: {
          include: {
            workflowRuns: {
              orderBy: { githubRunId: 'desc' },
              take: 1
            }
          }
        },
        incidents: {
          where: { status: { not: 'RESOLVED' } },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        patches: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { syncedAt: "desc" },
    });

    const enrichedRepositories = await Promise.all(repositories.map(async (repo) => {
      const [
        activeIncidentsCount,
        awaitingVerificationCount,
        openPRCount,
        lastFailure,
        lastAnalysis
      ] = await Promise.all([
        prisma.incident.count({ where: { repositoryId: repo.id, status: { not: 'RESOLVED' } } }),
        prisma.patch.count({ where: { repositoryId: repo.id, status: 'GENERATED' } }),
        prisma.patch.count({ where: { repositoryId: repo.id, status: 'PR_CREATED' } }),
        prisma.workflowRun.findFirst({
          where: { workflow: { repositoryId: repo.id }, conclusion: 'failure' },
          orderBy: { startedAt: 'desc' }
        }),
        prisma.analysis.findFirst({
          where: { workflowRun: { workflow: { repositoryId: repo.id } } },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      let healthStatus = 'Healthy';
      if (activeIncidentsCount > 2) {
        healthStatus = 'Critical';
      } else if (activeIncidentsCount > 0) {
        healthStatus = 'Degraded';
      }

      return {
        ...repo,
        activeIncidentsCount,
        awaitingVerificationCount,
        openPRCount,
        lastFailureAt: lastFailure?.startedAt || null,
        lastAnalysisAt: lastAnalysis?.createdAt || null,
        healthStatus
      };
    }));

    // Get global recent activity
    const recentActivity = await prisma.incidentEvent.findMany({
      where: { incident: { repository: { userId } } },
      include: {
        incident: {
          include: { repository: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return jsonResponse({
      repositories: enrichedRepositories,
      recentActivity
    });
  } catch (error) {
    console.error("Fetch repositories error:", error);
    return errorResponse("Failed to fetch repositories");
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { githubId } = await req.json();

    if (!githubId) {
      return errorResponse("githubId is required", 400);
    }

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });

    if (!account?.access_token) {
      return errorResponse("GitHub not connected", 401);
    }

    const githubService = new GitHubService(account.access_token);
    const results = await githubService.syncUserRepositories(session.user.id, [Number(githubId)]);

    if (results.length === 0) {
      return errorResponse("Repository not found or could not be added", 404);
    }

    return jsonResponse({
      message: "Repository added successfully",
      repository: results[0]
    });
  } catch (error) {
    console.error("Add repository error:", error);
    return errorResponse("Failed to add repository");
  }
}

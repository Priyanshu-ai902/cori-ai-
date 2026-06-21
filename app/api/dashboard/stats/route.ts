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

    const [
      totalRepos,
      totalWorkflows,
      totalRuns,
      successRuns,
      failedRuns,
      recentFailures,
      prCreatedCount,
      prMergedCount,
      verifiedFixesCount,
      activeIncidentsCount,
      recentPatches,
      diagnosisCount,
      fixesCount,
      verificationCount,
    ] = await Promise.all([
      prisma.repository.count({ where: { userId } }),
      prisma.workflow.count({ where: { repository: { userId } } }),
      prisma.workflowRun.count({ where: { workflow: { repository: { userId } } } }),
      prisma.workflowRun.count({ 
        where: { 
          workflow: { repository: { userId } },
          conclusion: 'success'
        } 
      }),
      prisma.workflowRun.count({ 
        where: { 
          workflow: { repository: { userId } },
          conclusion: 'failure'
        } 
      }),
      prisma.workflowRun.findMany({
        where: { 
          workflow: { repository: { userId } },
          conclusion: 'failure',
        },
        include: {
          workflow: {
            include: { repository: true }
          },
          incidents: {
            include: {
              issues: true,
              events: {
                orderBy: { createdAt: 'asc' }
              }
            }
          }
        },
        orderBy: { githubRunId: 'desc' },
        take: 10
      }),
      prisma.patch.count({ where: { repository: { userId }, status: 'PR_CREATED' } }),
      prisma.patch.count({ where: { repository: { userId }, status: { in: ['PR_MERGED', 'WORKFLOW_RETRIGGERED', 'BUILD_PASSED', 'BUILD_FAILED'] } } }),
      prisma.patch.count({ where: { repository: { userId }, status: 'VERIFIED' } }),
      prisma.incident.count({ where: { repository: { userId }, status: { not: 'RESOLVED' } } }),
      prisma.patch.findMany({
        where: { repository: { userId } },
        include: {
          repository: true,
          workflowRun: {
            include: { workflow: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.incident.count({ 
        where: { 
          repository: { userId }, 
          status: { not: 'RESOLVED' },
          workflowRun: {
            analyses: { none: {} }
          }
        } 
      }),
      prisma.patch.count({ where: { repository: { userId }, status: 'GENERATED' } }),
      prisma.patch.count({ where: { repository: { userId }, status: { in: ['VERIFYING', 'VERIFIED'] }, prNumber: null } }),
    ]);

    const latestRuns = await prisma.workflowRun.findMany({
      where: { workflow: { repository: { userId } } },
      include: {
        workflow: {
          include: { repository: true }
        }
      },
      orderBy: { githubRunId: 'desc' },
      take: 10
    });

    return jsonResponse({
      stats: {
        totalRepos,
        totalWorkflows,
        totalRuns,
        successRuns,
        failedRuns,
        successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0,
        prCreatedCount,
        prMergedCount,
        verifiedFixesCount,
        activeIncidentsCount,
        diagnosisCount,
        fixesCount,
        verificationCount,
      },
      recentFailures,
      latestRuns,
      recentPatches
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return errorResponse("Failed to fetch dashboard stats");
  }
}

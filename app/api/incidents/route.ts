import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const incidents = await prisma.incident.findMany({
      where: { repository: { userId: session.user.id } },
      include: {
        repository: true,
        issues: {
          include: {
            patches: true
          }
        },
        events: {
          orderBy: { createdAt: 'asc' }
        },
        workflowRun: {
          include: {
            workflow: true,
            analyses: {
              orderBy: { createdAt: 'desc' }
            },
            patches: {
              orderBy: { createdAt: 'desc' },
              include: {
                verificationAttempts: {
                  orderBy: { attemptNumber: 'asc' }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[ATTEMPT_QUERY_RESULT] Found ${incidents.length} incidents. First incident patch 0 verification attempts: ${incidents[0]?.workflowRun?.patches[0]?.verificationAttempts?.length}`);

    return jsonResponse(incidents);
  } catch (error) {
    console.error("Fetch incidents error:", error);
    return errorResponse("Failed to fetch incidents");
  }
}

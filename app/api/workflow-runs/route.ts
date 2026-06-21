import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get("repositoryId");
  const status = searchParams.get("status");

  try {
    const runs = await prisma.workflowRun.findMany({
      where: {
        workflow: {
          repository: {
            userId: session.user.id,
            ...(repoId ? { id: repoId } : {}),
          },
        },
        ...(status ? { status } : {}),
      },
      include: {
        workflow: {
          include: {
            repository: true,
          },
        },
        analyses: true,
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return jsonResponse(runs);
  } catch (error) {
    return errorResponse("Failed to fetch workflow runs");
  }
}

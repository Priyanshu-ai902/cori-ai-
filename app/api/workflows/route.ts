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

  try {
    const workflows = await prisma.workflow.findMany({
      where: {
        repository: {
          userId: session.user.id,
          ...(repoId ? { id: repoId } : {}),
        },
      },
      include: {
        _count: {
          select: { workflowRuns: true },
        },
      },
    });

    return jsonResponse(workflows);
  } catch (error) {
    return errorResponse("Failed to fetch workflows");
  }
}

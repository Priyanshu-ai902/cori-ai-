import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  const { runId } = await params;

  try {
    const analysis = await prisma.analysis.findFirst({
      where: { workflowRunId: runId },
      orderBy: { createdAt: "desc" },
    });

    if (!analysis) {
      return errorResponse("Analysis not found", 404);
    }

    return jsonResponse(analysis);
  } catch (error) {
    return errorResponse("Failed to fetch analysis");
  }
}

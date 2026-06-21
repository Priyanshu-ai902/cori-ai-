import { auth } from "@/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: workflowRunId } = await params;

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const logEntry = await prisma.logEntry.findFirst({
      where: { workflowRunId: workflowRunId },
      orderBy: { createdAt: 'desc' }
    });

    if (!logEntry) {
      return errorResponse("Logs not found", 404);
    }

    return jsonResponse({ logs: logEntry.rawLogs });
  } catch (error) {
    console.error("Fetch logs error:", error);
    return errorResponse("Failed to fetch logs");
  }
}

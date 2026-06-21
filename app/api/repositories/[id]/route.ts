import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await params;

    // Verify ownership
    const repository = await prisma.repository.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!repository) {
      return errorResponse("Repository not found", 404);
    }

    if (repository.userId !== session.user.id) {
      return errorResponse("Forbidden", 403);
    }

    // Delete repository (cascades to workflows, runs, and incidents per schema)
    await prisma.repository.delete({
      where: { id }
    });

    return jsonResponse({ success: true, message: "Repository removed successfully" });
  } catch (error) {
    console.error("Delete repository error:", error);
    return errorResponse("Failed to remove repository", 500);
  }
}

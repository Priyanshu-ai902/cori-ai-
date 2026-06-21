import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: incidentId } = await params;

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const issues = await prisma.issue.findMany({
      where: { incidentId: incidentId },
      include: {
        fixes: {
          include: {
            approvals: true
          }
        },
        patches: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const fixesCount = issues.reduce((acc, i) => acc + i.fixes.length, 0);
    const patchesCount = issues.reduce((acc, i) => acc + i.patches.length, 0);
    console.log(`[FIX_AUDIT] Issues endpoint returning fix: issues=${issues.length}, fixes=${fixesCount}, patches=${patchesCount}`);

    return jsonResponse(issues);
  } catch (error) {
    console.error("Fetch issues error:", error);
    return errorResponse("Failed to fetch issues");
  }
}

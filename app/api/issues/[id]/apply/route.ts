import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: issueId } = await params;

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { patchId, status } = await req.json();

    if (!patchId || !status) {
      return errorResponse("Missing patchId or status", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update patch status
      const updatedPatch = await tx.issuePatch.update({
        where: { id: patchId },
        data: { status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED' }
      });

      // If approved, create an approval record for the latest fix
      if (status === 'APPROVED') {
        const latestFix = await tx.issueFix.findFirst({
          where: { issueId: issueId },
          orderBy: { createdAt: 'desc' }
        });

        if (latestFix) {
          await tx.issueApproval.create({
            data: {
              issueFixId: latestFix.id,
              status: 'APPROVED'
            }
          });
        }

        // Update issue status
        await tx.issue.update({
          where: { id: issueId },
          data: { status: 'APPROVED' }
        });
      }

      return updatedPatch;
    });

    return jsonResponse(result);
  } catch (error: any) {
    console.error("Apply fix error:", error);
    return errorResponse(`Failed to apply fix: ${error.message}`);
  }
}

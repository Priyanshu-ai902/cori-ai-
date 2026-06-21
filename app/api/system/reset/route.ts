import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    // Delete user's repositories (cascades to workflows, incidents, patches, etc.)
    await prisma.repository.deleteMany({
      where: { userId: session.user.id }
    });

    // We could also reset onboarding status if we want a full reset
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: false }
    });

    return jsonResponse({ message: "Workspace reset successfully" });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

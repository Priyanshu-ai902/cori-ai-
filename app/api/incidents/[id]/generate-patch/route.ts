import { errorResponse } from "@/lib/api-helpers";

/**
 * DEPRECATED: Autonomous remediation loop has been refactored into an evidence-driven, 
 * issue-centric manual approval pipeline.
 * Use /api/issues/[id]/generate-fix instead.
 */
export async function POST() {
  return errorResponse("The autonomous incident-wide remediation loop is deprecated. Please use the issue-centric remediation pipeline.", 410);
}

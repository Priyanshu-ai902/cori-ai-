import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { GitHubService } from "@/services/github";
import { PatchApplier } from "@/lib/patch-applier";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: issueId } = await params;

  if (!session?.user?.id || !session.accessToken) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        incident: {
          include: {
            repository: true,
            workflowRun: true
          }
        },
        patches: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!issue || !issue.patches[0]) {
      return errorResponse("Approved patch not found for this issue", 404);
    }

    const patch = issue.patches[0];
    const incident = issue.incident;
    const repository = incident.repository;
    const github = new GitHubService(session.accessToken);
    
    const baseBranch = incident.workflowRun.branch || repository.defaultBranch;
    const newBranch = `stella-fix-${issue.id.slice(-6)}`;

    console.log(`[PR] Starting PR flow for Issue: ${issue.title}`);

    // 1. Get Base Branch SHA
    const baseSha = await github.getDefaultBranchSha(repository.owner!, repository.name, baseBranch);

    // 2. Create New Branch
    await github.createBranch(repository.owner!, repository.name, newBranch, baseSha);

    // 3. Apply Patch and Commit Files
    for (const filePath of patch.affectedFiles) {
      const original = await github.getFileContent(repository.owner!, repository.name, filePath, baseBranch);
      const updatedContent = PatchApplier.apply(original.content, patch.diff, filePath);

      await github.updateFile({
        owner: repository.owner!,
        repo: repository.name,
        path: filePath,
        content: updatedContent,
        sha: original.sha,
        branch: newBranch,
        message: `Fix: ${issue.title}`
      });
    }

    // 4. Create PR
    const pr = await github.createPR({
      owner: repository.owner!,
      repo: repository.name,
      title: `Fix: ${issue.title}`,
      body: `This PR resolves the issue: **${issue.title}**\n\n### Root Cause\n${issue.rootCause}\n\n### Suggested Fix\n${issue.manualFix}`,
      head: newBranch,
      base: baseBranch
    });

    // 5. Update Issue and Incident status
    await prisma.$transaction(async (tx) => {
      await tx.issue.update({
        where: { id: issue.id },
        data: { status: 'PR_CREATED' }
      });

      await tx.incident.update({
        where: { id: incident.id },
        data: { 
          status: 'PR_OPENED',
          events: {
            create: {
              status: 'PR Created',
              details: `Pull Request created: ${pr.html_url}`,
              prNumber: pr.number,
              workflowRunId: incident.workflowRunId
            }
          }
        }
      });
    });

    return jsonResponse({ prUrl: pr.html_url, prNumber: pr.number });
  } catch (error: any) {
    console.error("Create PR error:", error);
    return errorResponse(`Failed to create PR: ${error.message}`);
  }
}

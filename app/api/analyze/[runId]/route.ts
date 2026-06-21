import { auth } from "@/auth";
import { GitHubService } from "@/services/github";
import { analyzeFailure } from "@/services/ai/analyzeFailure";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();

  if (!session?.accessToken) {
    return errorResponse("Unauthorized", 401);
  }

  const { runId } = await params;

  try {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!run) {
      return errorResponse("Workflow run not found", 404);
    }

    const githubService = new GitHubService(session.accessToken);
    const [owner, repoName] = run.workflow.repository.fullName.split("/");

    // 1. Fetch logs
    const logs = await githubService.fetchWorkflowLogs(
      owner,
      repoName,
      Number(run.githubRunId)
    );

    if (!logs) {
      return errorResponse("No logs found for this run");
    }

    // 2. Fetch workflow YAML
    const workflowYaml = await githubService.getWorkflowYaml(
      owner,
      repoName,
      `.github/workflows/${run.workflow.name}.yml` // Assumption on path, might need improvement
    );

    // 3. Analyze
    const analysis = await analyzeFailure({
      workflowName: run.workflow.name,
      workflowYaml,
      repoMetadata: run.workflow.repository,
      logs: logs,
    });

    // 4. Store analysis
    const savedAnalysis = await prisma.analysis.create({
      data: {
        workflowRunId: run.id,
        rootCause: analysis.rootCause,
        explanation: analysis.explanation,
        suggestedFix: analysis.suggestedFix,
        confidence: analysis.confidence,
      },
    });

    // 5. Create an incident if it's a failure
    if (run.conclusion === "failure") {
      await prisma.incident.create({
        data: {
          repositoryId: run.workflow.repository.id,
          workflowRunId: run.id,
          title: analysis.rootCause,
          severity: "high", // AI could determine this
          status: "open",
        },
      });
    }

    return jsonResponse(savedAnalysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return errorResponse("Failed to analyze run");
  }
}

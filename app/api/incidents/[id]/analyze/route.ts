import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { GitHubService } from "@/services/github";
import { RCAService } from "@/services/rca";
import { extractIssues } from "@/services/ai/extractIssues";
import { RepositoryContextCollector } from "@/lib/repository-context-collector";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: incidentId } = await params;

  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  console.log(`[ANALYSIS] Re-run started for Incident ID: ${incidentId}`);

  try {
    // 1. Fetch Incident and related data
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        repository: true,
        workflowRun: {
          include: {
            workflow: true
          }
        }
      }
    });

    if (!incident) {
      return errorResponse("Incident not found", 404);
    }

    const workflowRun = incident.workflowRun;
    const repository = incident.repository;

    // 2. Clean up existing data for re-run
    await prisma.$transaction(async (tx) => {
      // Delete existing issues
      await tx.issue.deleteMany({
        where: { incidentId: incidentId }
      });

      // Find and delete existing patches
      const existingPatches = await tx.patch.findMany({
        where: { workflowRunId: workflowRun.id }
      });
      
      if (existingPatches.length > 0) {
        await tx.patch.deleteMany({
          where: { workflowRunId: workflowRun.id }
        });
        console.log(`[PATCH] Existing patches deleted: ${existingPatches.length}`);
      }

      // Find and delete existing analyses
      const existingAnalyses = await tx.analysis.findMany({
        where: { workflowRunId: workflowRun.id }
      });

      if (existingAnalyses.length > 0) {
        await tx.analysis.deleteMany({
          where: { workflowRunId: workflowRun.id }
        });
        console.log(`[ANALYSIS] Existing analyses deleted: ${existingAnalyses.length}`);
      }

      // Reset incident title to default
      await tx.incident.update({
        where: { id: incidentId },
        data: { title: `Failure in ${workflowRun.workflow.name}` }
      });
      console.log(`[RCA] Incident state reset`);
    });

    // 2. Get GitHub Token
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });

    if (!account?.access_token) {
      return errorResponse("GitHub not connected", 401);
    }

    const githubService = new GitHubService(account.access_token);

    // 3. Fetch GitHub Run Details, Jobs and Logs
    if (!workflowRun.githubRunId) {
      return errorResponse("Workflow Run has no GitHub Run ID", 400);
    }

    const githubRunId = Number(workflowRun.githubRunId);
    
    // Fetch logs
    const rawLogs = await githubService.fetchWorkflowLogs(
      repository.owner!,
      repository.name,
      githubRunId
    );

    console.log(`[RCA] Logs Retrieved. Length: ${rawLogs.length}`);

    // 4. Perform RCA
    const analysisResult = RCAService.analyze(rawLogs, workflowRun.workflow.name);
    console.log(`[RCA_AUDIT] Detected Root Cause: ${analysisResult.rootCause}`);

    // 4.5 Extract Structured Issues
    console.log(`[RCA_AUDIT] Collecting Repository Context...`);
    const branch = workflowRun.branch || repository.defaultBranch;
    const repoContext = await RepositoryContextCollector.collect({
      github: githubService,
      owner: repository.owner!,
      repo: repository.name,
      branch: branch,
      logs: rawLogs,
      rootCause: analysisResult.rootCause
    });

    if (repoContext.failureLocalization.failingFile) {
      console.log(`[RCA_AUDIT] Localized Failure: ${repoContext.failureLocalization.failingFile}:${repoContext.failureLocalization.failures[0]?.line || 'unknown'}`);
    } else {
      console.log(`[RCA_AUDIT] Localized Failure: NONE`);
    }

    console.log(`[RCA_AUDIT] Extracting structured issues guided by: ${analysisResult.rootCause}`);
    const extractedIssues = await extractIssues({
      workflowName: workflowRun.workflow.name,
      logs: rawLogs,
      repoStructure: repoContext.structure,
      detectedRootCause: analysisResult.rootCause
    });

    console.log(`[RCA_AUDIT] Extracted Issue Titles: ${extractedIssues.map(i => i.title).join(', ')}`);

    // 5. Store Analysis, Logs and Issues
    const analysis = await prisma.$transaction(async (tx) => {
      // Create LogEntry if logs exist
      if (rawLogs) {
        await tx.logEntry.create({
          data: {
            workflowRunId: workflowRun.id,
            rawLogs: rawLogs
          }
        });
      }

      // Update incident title and status
      await tx.incident.update({
        where: { id: incidentId },
        data: { 
          title: analysisResult.rootCause,
          status: "ANALYZED"
        }
      });

      // Create Issues
      for (const issue of extractedIssues) {
        await tx.issue.create({
          data: {
            incidentId: incidentId,
            workflowRunId: workflowRun.id,
            type: issue.type,
            severity: issue.severity,
            category: issue.category,
            file: issue.file,
            line: issue.line,
            title: issue.title,
            rootCause: issue.rootCause,
            manualFix: issue.manualFix,
            aiFixSummary: issue.aiFixSummary,
            confidence: issue.confidence,
            status: "OPEN"
          }
        });
      }

      // Create Analysis
      return await tx.analysis.create({
        data: {
          incidentId: incidentId,
          workflowRunId: workflowRun.id,
          rootCause: analysisResult.rootCause,
          explanation: analysisResult.summary,
          suggestedFix: analysisResult.recommendation,
          confidence: analysisResult.confidence,
          rawLogs: rawLogs
        }
      });
    });

    console.log(`[RCA] Analysis stored. ID: ${analysis.id}`);
    console.log(`[RCA] Incident updated`);

    return jsonResponse(analysis);
  } catch (error) {
    console.error("[RCA] Analysis failed:", error);
    return errorResponse("Failed to perform RCA", 500);
  }
}

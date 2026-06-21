import { Octokit } from "octokit";
import prisma from "@/lib/prisma";
import { analyzeFailure } from "./ai/analyzeFailure";

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async getUserProfile() {
    const { data: user } = await this.octokit.rest.users.getAuthenticated();
    return user;
  }

  async listRepositories() {
    const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });
    return repos;
  }

  /**
   * Main sync service entry point
   */
  async syncUserRepositories(userId: string, selectedGithubIds?: number[]) {
    const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });

    console.log(`[Sync] Found ${repos.length} repositories on GitHub for user ${userId}`);

    const results = [];

    for (const repo of repos) {
      // If we provided selected IDs, only sync those
      if (selectedGithubIds && !selectedGithubIds.includes(repo.id)) continue;

      const syncedRepo = await prisma.repository.upsert({
        where: { githubId: repo.id },
        update: {
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch,
          private: repo.private,
          syncedAt: new Date(),
        },
        create: {
          githubId: repo.id,
          userId: userId,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch,
          private: repo.private,
          syncedAt: new Date(),
        },
      });

      console.log(`[Sync] Syncing repository: ${repo.full_name}`);
      
      // Sync workflows for this repo
      await this.syncWorkflows(syncedRepo.id, repo.owner.login, repo.name);
      
      results.push(syncedRepo);
    }
    
    return results;
  }

  /**
   * Sync a single repository by its local ID
   */
  async syncRepository(repoId: string) {
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      console.error(`[Sync] Repository with ID ${repoId} not found`);
      throw new Error(`Repository with ID ${repoId} not found`);
    }

    console.log(`[Sync] Repository found: ${repo.fullName}`);
    console.log(`[Sync] Targeted sync for repository: ${repo.fullName}`);

    // Update repository metadata from GitHub
    const { data: githubRepo } = await this.octokit.rest.repos.get({
      owner: repo.owner!,
      repo: repo.name,
    });

    const updatedRepo = await prisma.repository.update({
      where: { id: repoId },
      data: {
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        owner: githubRepo.owner.login,
        defaultBranch: githubRepo.default_branch,
        private: githubRepo.private,
        syncedAt: new Date(),
      },
    });

    // Sync workflows and runs
    const syncResults = await this.syncWorkflows(updatedRepo.id, updatedRepo.owner!, updatedRepo.name);

    return {
      repository: updatedRepo,
      ...syncResults
    };
  }

  async syncWorkflows(repoId: string, owner: string, repoName: string) {
    console.log(`[Sync] Fetching workflows for ${owner}/${repoName}`);
    const { data: { workflows } } = await this.octokit.rest.actions.listRepoWorkflows({
      owner,
      repo: repoName,
    });

    console.log(`[Sync] Workflows found: ${workflows.length}`);

    let totalRunsSynced = 0;
    for (const workflow of workflows) {
      const syncedWorkflow = await prisma.workflow.upsert({
        where: { githubId: workflow.id },
        update: {
          name: workflow.name,
          path: workflow.path,
          state: workflow.state,
        },
        create: {
          githubId: workflow.id,
          repositoryId: repoId,
          name: workflow.name,
          path: workflow.path,
          state: workflow.state,
        },
      });

      // Sync recent runs for this workflow
      const runsSynced = await this.syncWorkflowRuns(syncedWorkflow.id, owner, repoName, workflow.id);
      totalRunsSynced += runsSynced;
    }

    return {
      workflowsSynced: workflows.length,
      workflowRunsSynced: totalRunsSynced
    };
  }

  async syncWorkflowRuns(workflowId: string, owner: string, repoName: string, githubWorkflowId: number) {
    console.log(`[Sync] Fetching runs for workflow ${githubWorkflowId} in ${owner}/${repoName}`);
    const { data: { workflow_runs } } = await this.octokit.rest.actions.listWorkflowRuns({
      owner,
      repo: repoName,
      workflow_id: githubWorkflowId,
      per_page: 20,
    });

    console.log(`[Sync] Workflow runs found: ${workflow_runs.length} for workflow ${githubWorkflowId}`);

    let insertedCount = 0;
    for (const run of workflow_runs) {
      const duration = run.updated_at && run.run_started_at 
        ? Math.floor((new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 1000)
        : null;

      const syncedRun = await prisma.workflowRun.upsert({
        where: { githubRunId: BigInt(run.id) },
        update: {
          status: run.status || "unknown",
          conclusion: run.conclusion,
          branch: run.head_branch,
          commitSha: run.head_sha,
          actor: run.actor?.login,
          duration: duration,
          htmlUrl: run.html_url,
          startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
          completedAt: run.updated_at ? new Date(run.updated_at) : null,
        },
        create: {
          githubRunId: BigInt(run.id),
          workflowId: workflowId,
          status: run.status || "unknown",
          conclusion: run.conclusion,
          branch: run.head_branch,
          commitSha: run.head_sha,
          actor: run.actor?.login,
          duration: duration,
          htmlUrl: run.html_url,
          startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
          completedAt: run.updated_at ? new Date(run.updated_at) : null,
        },
      });

      insertedCount++;

      // If failed, auto-generate an incident and potentially analyze
      if (syncedRun.conclusion === "failure") {
        await this.handleFailedRun(syncedRun.id, owner, repoName, syncedRun.workflowId);
      }
    }
    console.log(`[Sync] Workflow runs inserted: ${insertedCount} for workflow ${githubWorkflowId}`);
    return insertedCount;
  }

  private async handleFailedRun(runId: string, owner: string, repoName: string, workflowId: string) {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { workflow: { include: { repository: true } } }
    });

    if (!run || !run.githubRunId) return;

    // Create Incident if it doesn't exist
    const incidentId = `inc_${run.githubRunId.toString()}`;
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    
    await prisma.incident.upsert({
      where: { 
        id: incidentId
      },
      update: {
        status: run.status === "completed" ? "open" : "investigating"
      },
      create: {
        id: incidentId,
        repositoryId: run.workflow.repositoryId,
        workflowRunId: run.id,
        title: `Failure in ${run.workflow.name}`,
        severity: "high",
        status: "open",
        events: {
          create: {
            status: "Workflow Failed",
            details: `Workflow ${run.workflow.name} failed on branch ${run.branch}`,
            workflowRunId: run.id
          }
        }
      }
    });

    // Optionally trigger AI analysis (not doing it automatically for every run to save tokens)
  }

  async analyzeFailedRun(runId: string, owner: string, repoName: string, workflowName: string) {
    const run = await prisma.workflowRun.findUnique({ 
      where: { id: runId },
      include: { workflow: { include: { repository: true } } }
    });
    
    if (!run || run.conclusion !== "failure" || !run.githubRunId) return;

    const existingAnalysis = await prisma.analysis.findFirst({
      where: { workflowRunId: runId }
    });
    if (existingAnalysis) return;

    const logs = await this.fetchWorkflowLogs(owner, repoName, Number(run.githubRunId));
    if (!logs) return;

    const workflowYaml = await this.getWorkflowYaml(owner, repoName, run.workflow.path);

    try {
      const analysis = await analyzeFailure({
        workflowName,
        workflowYaml,
        repoMetadata: { fullName: `${owner}/${repoName}` },
        logs,
      });

      await prisma.analysis.create({
        data: {
          workflowRunId: runId,
          rootCause: analysis.rootCause,
          explanation: analysis.explanation,
          suggestedFix: analysis.suggestedFix,
          confidence: analysis.confidence,
        },
      });

      // Update incident title with root cause and add event
      const incidentId = `inc_${run.githubRunId.toString()}`;
      await prisma.incident.update({
        where: { id: incidentId },
        data: { 
          title: analysis.rootCause,
          events: {
            create: {
              status: "RCA Generated",
              details: `Root cause identified: ${analysis.rootCause}`,
              workflowRunId: runId
            }
          }
        }
      });
    } catch (error) {
      console.error("AI Analysis failed:", error);
    }
  }

  async getTree(owner: string, repo: string, treeSha: string) {
    console.log(`[GitHub] Fetching recursive tree for ${owner}/${repo} at ${treeSha}`);
    const { data } = await this.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "1",
    });
    return data.tree;
  }

  async getRepo(owner: string, repo: string) {
    console.log(`[PR] Fetching repository: ${owner}/${repo}`);
    const { data } = await this.octokit.rest.repos.get({ owner, repo });
    console.log(`[PR] Repository found`);
    return data;
  }

  async getDefaultBranchSha(owner: string, repo: string, defaultBranch: string) {
    console.log(`[PR] Fetching SHA for branch: ${defaultBranch}`);
    const { data } = await this.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    return data.object.sha;
  }

  async createBranch(owner: string, repo: string, branch: string, sha: string) {
    console.log(`[PR] Creating branch: ${branch}`);
    const { data } = await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha,
    });
    console.log(`[PR] Branch created`);
    return data;
  }

  async deleteBranch(owner: string, repo: string, branch: string) {
    console.log(`[PR] Deleting branch: ${branch} (Rollback)`);
    try {
      await this.octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      console.log(`[PR] Branch ${branch} deleted successfully`);
    } catch (error: any) {
      console.error(`[PR] Failed to delete branch ${branch}: ${error.message}`);
    }
  }

  async getFileContentSafe(owner: string, repo: string, path: string, ref: string) {
    try {
      return await this.getFileContent(owner, repo, path, ref);
    } catch (error) {
      return null;
    }
  }

  async getFileContent(owner: string, repo: string, path: string, ref: string) {
    console.log(`[PR] Fetching file: ${path} (ref: ${ref})`);
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    
    if ("content" in data && !Array.isArray(data)) {
      console.log(`[PR] File fetched`);
      return {
        content: Buffer.from(data.content, "base64").toString(),
        sha: data.sha,
      };
    }
    throw new Error(`Could not fetch content for ${path}`);
  }

  async updateFile(params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    sha?: string;
    branch: string;
    message: string;
  }) {
    console.log(`[PR] Creating commit for ${params.path}`);
    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      message: params.message,
      content: Buffer.from(params.content).toString("base64"),
      sha: params.sha,
      branch: params.branch,
    });
    console.log(`[PR] File updated`);
    console.log(`[PR] Commit created`);
    return data;
  }

  async createPR(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }) {
    console.log(`[PR] Creating GitHub PR`);
    const { data } = await this.octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    });
    console.log(`[PR] Pull request created`);
    console.log(`[PR] GitHub response received:`, JSON.stringify(data, null, 2));
    return data;
  }

  async getPR(owner: string, repo: string, prNumber: number) {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    return data;
  }

  async listWorkflowRuns(params: {
    owner: string;
    repo: string;
    workflowId?: number;
    branch?: string;
    per_page?: number;
  }) {
    if (params.workflowId) {
      console.log(`[GitHub] Fetching runs for workflow ${params.workflowId} on branch ${params.branch}`);
      const { data } = await this.octokit.rest.actions.listWorkflowRuns({
        owner: params.owner,
        repo: params.repo,
        workflow_id: params.workflowId,
        branch: params.branch,
        per_page: params.per_page || 5,
      });
      return data.workflow_runs;
    } else {
      console.log(`[GitHub] Fallback: Fetching repo-wide runs for branch ${params.branch}`);
      const { data } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        per_page: params.per_page || 5,
      });
      return data.workflow_runs;
    }
  }

  async findWorkflowId(owner: string, repo: string, workflowNameOrPath: string) {
    console.log(`[GitHub] Discovering workflow ID for: ${workflowNameOrPath}`);
    const { data: { workflows } } = await this.octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
    });
    const match = workflows.find(w => w.name === workflowNameOrPath || w.path === workflowNameOrPath);
    return match?.id;
  }

  async triggerWorkflow(owner: string, repo: string, workflowId: string | number, ref: string) {
    console.log(`[GitHub] Triggering workflow ${workflowId} on ref ${ref}`);
    const { data } = await this.octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowId,
      ref,
    });
    return data;
  }

  async getWorkflowRunJobs(owner: string, repo: string, runId: number) {
    const { data } = await this.octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    return data.jobs;
  }

  async fetchWorkflowLogs(owner: string, repo: string, runId: number) {
    try {
      const { data: { jobs } } = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });

      console.log(`[RCA] Jobs Found: ${jobs.length}`);

      let allLogs = "";
      for (const job of jobs) {
        const failedSteps = job.steps?.filter(s => s.conclusion === "failure") || [];
        if (failedSteps.length > 0) {
          console.log(`[RCA] Job '${job.name}' has ${failedSteps.length} failed steps`);
          failedSteps.forEach(step => {
            console.log(`[RCA] Failed Step Found: ${step.name}`);
          });
        }

        if (job.conclusion === "failure" || job.status === "in_progress") {
          try {
            const { data: logs } = await this.octokit.rest.actions.downloadJobLogsForWorkflowRun({
              owner,
              repo,
              job_id: job.id,
            });
            allLogs += `--- Job: ${job.name} ---\n${logs}\n`;
          } catch (e) {
            console.error(`Failed to download logs for job ${job.id}`);
          }
        }
      }

      return allLogs;
    } catch (error) {
      console.error("Error fetching logs:", error);
      return "";
    }
  }

  async getWorkflowYaml(owner: string, repo: string, path: string) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      
      if ("content" in data) {
        return Buffer.from(data.content, "base64").toString();
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
}

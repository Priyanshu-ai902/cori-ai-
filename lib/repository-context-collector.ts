import { GitHubService } from '@/services/github';
import { FailureLocalizationEngine, FailureContext } from './failure-localization-engine';
import { languageAdapters } from './languages';

export interface RepositoryContext {
  rootPackageJson?: any;
  workspacePackageJsons: { path: string; content: any }[];
  configFiles: { path: string; content: any }[];
  structure: string[];
  dependencies: Record<string, string>;
  buildCommands: string[];
  detectedWorkspaces: string[];
  failureLocalization: {
    failingWorkspace?: string;
    failingFile?: string;
    failingStep?: string;
    failures: FailureContext[];
  };
}

export class RepositoryContextCollector {
  static async collect(params: {
    github: GitHubService;
    owner: string;
    repo: string;
    branch: string;
    logs: string;
    rootCause?: string;
  }): Promise<RepositoryContext> {
    const { github, owner, repo, branch, logs, rootCause } = params;
    const context: RepositoryContext = {
      workspacePackageJsons: [],
      configFiles: [],
      structure: [],
      dependencies: {},
      buildCommands: [],
      detectedWorkspaces: [],
      failureLocalization: {
        failures: []
      }
    };

    console.log(`[DISCOVERY] Starting dynamic repository traversal for ${owner}/${repo}`);

    try {
      const branchSha = await github.getDefaultBranchSha(owner, repo, branch);
      const tree = await github.getTree(owner, repo, branchSha);
      
      context.structure = tree
        .map((item: any) => item.path)
        .filter((path: string) => !path.includes('node_modules/') && !path.includes('.git/'));

      console.log(`[DISCOVERY] Mapped ${context.structure.length} files/directories.`);

      // 1. Determine active adapters
      const activeAdapters = languageAdapters.filter(a => a.isApplicable(context.structure));
      console.log(`[ADAPTERS] Active adapters: ${activeAdapters.map(a => a.name).join(', ')}`);

      // 2. Collect target configuration files
      const targetConfigs = new Set<string>();
      activeAdapters.forEach(a => a.getFilterPatterns().forEach(p => targetConfigs.add(p)));
      
      // Ensure specific GitHub workflows are always tracked
      const foundConfigs = context.structure.filter(path => 
        Array.from(targetConfigs).some(config => path.endsWith(config)) || path.startsWith('.github/workflows/')
      );

      console.log(`[WORKSPACE] Found ${foundConfigs.length} configuration files.`);

      for (const configPath of foundConfigs) {
        const fileContent = await github.getFileContentSafe(owner, repo, configPath, branch);
        if (fileContent) {
          try {
            const content = configPath.endsWith('.json') ? JSON.parse(fileContent.content) : fileContent.content;
            
            // 3. Process via adapters
            let processed = false;
            for (const adapter of activeAdapters) {
              if (adapter.getFilterPatterns().some(p => configPath.endsWith(p))) {
                adapter.processConfig(configPath, content, context);
                processed = true;
              }
            }

            if (!processed) {
              context.configFiles.push({ path: configPath, content });
            }
          } catch (e) {
            console.warn(`[CONTEXT] Failed to parse config file: ${configPath}`);
            context.configFiles.push({ path: configPath, content: fileContent.content });
          }
        }
      }

      console.log(`[LOCALIZATION] Analyzing logs with High-Precision Engine...`);
      const localizedFailures = FailureLocalizationEngine.localize(logs, context.structure, rootCause);
      context.failureLocalization.failures = localizedFailures;

      if (localizedFailures.length > 0) {
        const topFailure = localizedFailures[0];
        context.failureLocalization.failingFile = topFailure.file;
        context.failureLocalization.failingWorkspace = topFailure.workspace;
        console.log(`[LOCALIZATION] Detected Primary Failure in: ${topFailure.file} (${topFailure.errorType})`);
        console.log(`[LOCALIZATION] Confidence: ${topFailure.confidence}`);
      } else {
        console.log(`[LOCALIZATION] No structured failures detected. Falling back to keyword search.`);
        const logLines = logs.split('\n');
        const sortedStructure = [...context.structure].sort((a, b) => b.length - a.length);
        
        for (const line of logLines) {
          if (line.includes('Error') || line.includes('error') || line.includes('failed') || line.includes('Failed')) {
            for (const path of sortedStructure) {
              // HARD INVARIANT: failingFile may never be a directory
              if (line.includes(path) && !context.failureLocalization.failingFile && FailureLocalizationEngine.isLikelyFile(path)) {
                 context.failureLocalization.failingFile = path;
                 const parts = path.split('/');
                 if (parts.length > 1) {
                    context.failureLocalization.failingWorkspace = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
                 }
                 break;
              }
            }
          }
        }
      }

      // TERMINAL VALIDATION
      if (context.failureLocalization.failingFile && !FailureLocalizationEngine.isLikelyFile(context.failureLocalization.failingFile)) {
         throw new Error(`LocalizationError: Localization resolved to directory instead of file: ${context.failureLocalization.failingFile}`);
      }

      console.log(`[LOCALIZATION_AUDIT] failingWorkspace: ${context.failureLocalization.failingWorkspace || 'None'}, failingFile: ${context.failureLocalization.failingFile || 'None'}`);

      return context;
    } catch (error) {
      console.error('[CONTEXT] Failed to collect repository context:', error);
      return context;
    }
  }
}

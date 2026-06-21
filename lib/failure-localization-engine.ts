import { RepositoryContext } from './repository-context-collector';
import { generateContentWithFallback } from '@/services/ai/gemini-service';
import { z } from 'zod';

export interface FailureContext {
  file?: string;
  line?: number;
  column?: number;
  errorType: string;
  message: string;
  workspace?: string;
  confidence: number;
  rawLine?: string;
}

export interface LocalizationRule {
  name: string;
  regex: RegExp;
  mappings: {
    file: number;
    line?: number;
    column?: number;
    message: number;
    errorType?: string;
  };
  confidenceBoost: number;
}

export class FailureLocalizationEngine {
  private static readonly CONFIDENCE = {
    EXPLICIT_PATH: 1.00,
    WORKSPACE_PACKAGE: 0.85,
    STACK_TRACE: 0.80,
    COMPILER_OUTPUT: 0.75,
    MANIFEST_RESOLUTION: 0.85,
    RCA_INFERENCE: 0.50,
    HEURISTIC: 0.30
  };

  private static readonly RULES: LocalizationRule[] = [
    // --- STAGE 1: Explicit Path & Compiler Parsers (High Confidence) ---
    {
      name: 'TypeScript/Next.js',
      regex: /([a-zA-Z0-9\/\._\-\\]+\.tsx?)\((\d+),(\d+)\): error (TS\d+): (.*)/,
      mappings: { file: 1, line: 2, column: 3, message: 5, errorType: 'TypeScript' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'ESLint',
      regex: /([a-zA-Z0-9\/\._\-\\]+\.[jt]sx?): line (\d+), col (\d+), (.*)/,
      mappings: { file: 1, line: 2, column: 3, message: 4, errorType: 'ESLint' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Java/Maven/Gradle',
      regex: /\[ERROR\]\s+([a-zA-Z0-9\/\._\-\\]+\.java):\[(\d+),(\d+)\]\s+(.*)/,
      mappings: { file: 1, line: 2, column: 3, message: 4, errorType: 'Java' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Go',
      regex: /([a-zA-Z0-9\/\._\-\\]+\.go):(\d+):(\d+):\s+(.*)/,
      mappings: { file: 1, line: 2, column: 3, message: 4, errorType: 'Go' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Rust',
      regex: /error(?:\[E\d+\])?:\s+(.*)\n\s+-->\s+([a-zA-Z0-9\/\._\-\\]+\.rs):(\d+):(\d+)/,
      mappings: { file: 2, line: 3, column: 4, message: 1, errorType: 'Rust' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Python Traceback',
      regex: /File "([a-zA-Z0-9\/\._\-\\]+\.py)", line (\d+), in (.*)/,
      mappings: { file: 1, line: 2, message: 3, errorType: 'Python' },
      confidenceBoost: this.CONFIDENCE.STACK_TRACE
    },
    {
      name: 'Terraform',
      regex: /Error: (.*)\s+on ([a-zA-Z0-9\/\._\-\\]+\.tf) line (\d+)/,
      mappings: { file: 2, line: 3, message: 1, errorType: 'Terraform' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Docker',
      regex: /ERROR:\s+build failed in ([a-zA-Z0-9\/\._\-\\]+?Dockerfile[a-zA-Z0-9\/\._\-\\]*):\s+(.*)/i,
      mappings: { file: 1, message: 2, errorType: 'Docker' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Next.js Runtime',
      regex: /Error: (.*)\n\s+at\s+(?:.*)\s+\((.*\.tsx?):(\d+):(\d+)\)/,
      mappings: { file: 2, line: 3, column: 4, message: 1, errorType: 'Next.js' },
      confidenceBoost: this.CONFIDENCE.STACK_TRACE
    },
    {
      name: 'Node Module Resolve',
      regex: /Cannot find module '(.*)' or its corresponding type declarations.\n\s+Imported from (.*\.tsx?)/,
      mappings: { file: 2, message: 1, errorType: 'Node' },
      confidenceBoost: this.CONFIDENCE.COMPILER_OUTPUT
    },
    {
      name: 'Jest',
      regex: /FAIL\s+([a-zA-Z0-9\/\._\-\\]+\.[jt]sx?)/,
      mappings: { file: 1, message: 0, errorType: 'Jest' },
      confidenceBoost: this.CONFIDENCE.EXPLICIT_PATH
    },
    {
      name: 'Stack Trace',
      regex: /\s+at\s+.*?\s+\(?([a-zA-Z0-9\/\._\-\\]+\.[a-zA-Z0-9]+):(\d+):(\d+)\)?/,
      mappings: { file: 1, line: 2, column: 3, message: 0, errorType: 'Stack Trace' },
      confidenceBoost: this.CONFIDENCE.STACK_TRACE
    },
    
    // --- STAGE 2: Workspace/Package Locations (Medium Confidence) ---
    {
      name: 'Package Level Error',
      regex: /Error in package '([a-zA-Z0-9\-_\.@\/]+)': (.*)/i,
      mappings: { file: 1, message: 2, errorType: 'Infrastructure' },
      confidenceBoost: this.CONFIDENCE.WORKSPACE_PACKAGE
    },

    // --- STAGE 3: Generic Patterns (Low Confidence) ---
    {
      name: 'GenericFileLineCol',
      regex: /([a-zA-Z0-9\/\._\-\\]+\.[a-zA-Z0-9]+):(\d+):(\d+):\s+(?:error|fatal|panic|Exception):\s+(.*)/i,
      mappings: { file: 1, line: 2, column: 3, message: 4, errorType: 'Generic' },
      confidenceBoost: this.CONFIDENCE.COMPILER_OUTPUT
    }
  ];

  static localize(logs: string, structure: string[], rootCause?: string): FailureContext[] {
    const contexts: FailureContext[] = [];
    const sortedStructure = [...structure].sort((a, b) => b.length - a.length);

    // 1. Evidence-Based Deterministic Parsers
    for (const rule of this.RULES) {
      const globalRegex = new RegExp(rule.regex, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
      const matches = logs.matchAll(globalRegex);
      
      for (const match of matches) {
        const extracted = match[rule.mappings.file];
        const absoluteFile = this.resolveFile(extracted, sortedStructure);
        
        if (absoluteFile && this.isLikelyFile(absoluteFile)) {
          contexts.push({
            file: absoluteFile,
            line: rule.mappings.line ? parseInt(match[rule.mappings.line], 10) : undefined,
            column: rule.mappings.column ? parseInt(match[rule.mappings.column], 10) : undefined,
            message: match[rule.mappings.message]?.trim() || match[0].trim(),
            errorType: rule.mappings.errorType || rule.name,
            confidence: rule.confidenceBoost,
            rawLine: match[0].trim(),
            workspace: this.inferWorkspace(absoluteFile)
          });
        }
      }
    }

    // 2. Secondary Evidence Layer: Manifest Resolution
    if (contexts.length === 0 && rootCause) {
       const rootCauseLower = rootCause.toLowerCase();
       const isDependencyIssue = rootCauseLower.includes('dependency') || 
                                 rootCauseLower.includes('package') ||
                                 rootCauseLower.includes('module') ||
                                 rootCauseLower.includes('typing') ||
                                 rootCauseLower.includes('resolution');

       if (isDependencyIssue) {
          const manifestMarkers = ['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml'];
          const availableManifests = sortedStructure.filter(s => manifestMarkers.some(m => s.endsWith(m)));
          
          let targetManifest: string | undefined;
          
          // Determine which workspace owns the failing build step by checking logs
          for (const manifest of availableManifests) {
              const workspaceDir = manifest.split('/').slice(0, -1).join('/');
              if (workspaceDir && logs.includes(workspaceDir)) {
                  targetManifest = manifest;
                  break;
              }
          }

          // Fallback to root-most manifest if workspace not explicitly matched
          if (!targetManifest && availableManifests.length > 0) {
              targetManifest = availableManifests.sort((a, b) => a.length - b.length)[0];
          }

          if (targetManifest) {
              contexts.push({
                  file: targetManifest,
                  message: `Manifest Resolution: ${rootCause}`,
                  errorType: 'Dependency',
                  confidence: this.CONFIDENCE.MANIFEST_RESOLUTION,
                  workspace: this.inferWorkspace(targetManifest)
              });
          }
       }
    }

    // 3. RCA-Derived Inference (Lower Priority)
    if (contexts.length === 0 && rootCause) {
       const inference = this.inferFromRCA(rootCause, structure, logs);
       if (inference) contexts.push(inference);
    }

    // 4. Generic Heuristics (Lowest Priority)
    if (contexts.length === 0) {
       for (const file of sortedStructure) {
          if (this.isLikelyFile(file) && logs.includes(file)) {
             contexts.push({
                file,
                message: 'File mentioned in failure logs',
                errorType: 'Contextual',
                confidence: this.CONFIDENCE.HEURISTIC,
                workspace: this.inferWorkspace(file)
             });
          }
       }
    }

    // Sort by confidence and deduplicate
    return contexts
      .sort((a, b) => b.confidence - a.confidence)
      .filter((ctx, index, self) => 
        index === self.findIndex((t) => t.file === ctx.file && t.message === ctx.message)
      );
  }

  private static inferFromRCA(rootCause: string, structure: string[], logs: string): FailureContext | null {
    const isDependencyIssue = rootCause.toLowerCase().includes('dependency') || 
                              rootCause.toLowerCase().includes('package') ||
                              rootCause.toLowerCase().includes('module');

    if (isDependencyIssue) {
       const manifestMarkers = ['package.json', 'Cargo.toml', 'go.mod', 'pom.xml', 'requirements.txt'];
       for (const marker of manifestMarkers) {
          const match = structure.find(s => s === marker || s.endsWith('/' + marker));
          if (match && (logs.includes(match.split('/')[0]) || match === marker)) {
             return {
                file: match,
                message: `RCA inference: ${rootCause}`,
                errorType: 'Inference',
                confidence: this.CONFIDENCE.RCA_INFERENCE,
                workspace: this.inferWorkspace(match)
             };
          }
       }
    }
    return null;
  }

  public static isLikelyFile(path: string): boolean {
    const fileName = path.split('/').pop() || '';
    return fileName.includes('.') || 
           ['Dockerfile', 'Makefile', 'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock', 'mvnw', 'gradlew', 'Rakefile', 'Gemfile'].includes(fileName);
  }

  static async localizeAsync(logs: string, structure: string[], rootCause?: string): Promise<FailureContext[] | 'UNCERTAIN_ROOT_CAUSE'> {
    let deterministicResults = this.localize(logs, structure, rootCause);
    
    if (deterministicResults.length > 0) {
      console.log(`[PIPELINE_AUDIT] Engine(deterministic) found: file=${deterministicResults[0].file}, workspace=${deterministicResults[0].workspace}, confidence=${deterministicResults[0].confidence}`);
    }

    if (deterministicResults.length > 0 && deterministicResults[0].confidence >= 0.85) {
       return deterministicResults;
    }

    try {
      const prompt = `
        You are a senior build engineer analyzing deployment failures.
        Analyze the logs and identify the root cause failure file.

        STRUCTURE:
        ${structure.slice(0, 100).join('\n')}

        LOGS:
        ${logs.substring(0, 3000)}

        Format:
        {
           "file": "path/to/file",
           "line": 42,
           "errorType": "type",
           "message": "message"
        }
      `;

      const result = await generateContentWithFallback(prompt, { responseMimeType: "application/json" });
      const schema = z.object({
        file: z.string().nullable().optional(),
        line: z.number().nullable().optional(),
        errorType: z.string(),
        message: z.string()
      });

      const parsed = schema.parse(JSON.parse(result.response.text()));
      const extractedFile = parsed.file === null ? undefined : parsed.file;
      const absoluteFile = extractedFile ? this.resolveFile(extractedFile, structure) : undefined;
      
      if (absoluteFile && !this.isLikelyFile(absoluteFile)) {
        return deterministicResults.length > 0 && deterministicResults[0].confidence >= 0.85 ? deterministicResults : 'UNCERTAIN_ROOT_CAUSE';
      }

      const llmContext: FailureContext = {
         file: absoluteFile || extractedFile,
         line: parsed.line === null ? undefined : parsed.line,
         errorType: parsed.errorType || 'LLM_Fallback',
         message: parsed.message || 'Failure determined via LLM',
         confidence: this.CONFIDENCE.RCA_INFERENCE, // 0.50
         workspace: absoluteFile ? this.inferWorkspace(absoluteFile) : undefined
      };

      deterministicResults.push(llmContext);
      const finalResults = deterministicResults
        .sort((a, b) => b.confidence - a.confidence)
        .filter((ctx, index, self) => 
          index === self.findIndex((t) => t.file === ctx.file && t.message === ctx.message)
        );

      if (finalResults.length === 0 || finalResults[0].confidence < 0.85) {
        return 'UNCERTAIN_ROOT_CAUSE';
      }

      return finalResults;
    } catch (err) {
      if (deterministicResults.length > 0 && deterministicResults[0].confidence >= 0.85) {
        return deterministicResults;
      }
      return 'UNCERTAIN_ROOT_CAUSE';
    }
  }

  private static resolveFile(extractedPath: string, structure: string[]): string | undefined {
    if (structure.includes(extractedPath)) return extractedPath;
    let normalizedExtracted = extractedPath.replace(/\\/g, '/').replace(/^(\.\/|\.\.\/|\/)+/, '');
    const match = structure.find(s => s.endsWith(normalizedExtracted));
    return match;
  }

  private static inferWorkspace(filePath: string): string {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      if (['apps', 'packages', 'services'].includes(parts[0]) && parts.length > 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return parts[0];
    }
    return 'root';
  }
}

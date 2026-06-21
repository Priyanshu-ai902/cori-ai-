import { RepositoryContext } from './repository-context-collector';
import { FailureContext } from './failure-localization-engine';

export enum FailureCategory {
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  IMPORT_FAILURE = 'IMPORT_FAILURE',
  BUILD_CONFIGURATION = 'BUILD_CONFIGURATION',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  API_SIGNATURE_MISMATCH = 'API_SIGNATURE_MISMATCH',
  TEST_FAILURE = 'TEST_FAILURE',
  RUNTIME_EXCEPTION = 'RUNTIME_EXCEPTION',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface FailureEvidence {
  category: FailureCategory;
  confidence: number;
  failingFile: string;
  failingLine?: number;
  failingWorkspace?: string;
  exactError?: string;
  symbols: string[]; // Existing symbols identified in the file or related files
  imports: string[]; // Existing imports
  exports: string[]; // Exported symbols from the failing file
  manifestDependencies: string[]; // Dependencies found in package.json/Cargo.toml etc.
  installedDependencies: string[]; // Dependencies found in lockfiles
  missingDependencies: string[]; // Dependencies identified as missing from logs
  relatedFiles: { path: string; purpose: string }[];
  contextSnippets: { path: string; content: string }[];
}

export class FailureEvidenceCollector {
  static collect(params: {
    context: RepositoryContext;
    failure: FailureContext;
    failingFileContent?: string;
    relatedFileContent?: string;
    relatedFilePath?: string;
    lockfileContent?: string;
  }): FailureEvidence {
    const { context, failure, failingFileContent, relatedFileContent, relatedFilePath, lockfileContent } = params;

    const evidence: FailureEvidence = {
      category: this.categorize(failure),
      confidence: failure.confidence,
      failingFile: failure.file || 'unknown',
      failingLine: failure.line,
      failingWorkspace: failure.workspace,
      exactError: failure.message,
      symbols: [],
      imports: [],
      exports: [],
      manifestDependencies: Object.keys(context.dependencies),
      installedDependencies: lockfileContent ? this.extractLockfileDeps(lockfileContent) : [],
      missingDependencies: this.detectMissingDependencies([failure]),
      relatedFiles: [],
      contextSnippets: []
    };

    if (failingFileContent) {
      evidence.contextSnippets.push({ path: evidence.failingFile, content: failingFileContent });
      
      // Extract imports
      const importRegex = /(?:import|from|require|use|extern crate)\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(failingFileContent)) !== null) {
        evidence.imports.push(match[1]);
      }

      // Extract exports
      const exportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      while ((match = exportRegex.exec(failingFileContent)) !== null) {
        evidence.exports.push(match[1]);
      }

      // Basic symbol extraction
      const jsKeywords = new Set([
        'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'import', 'from', 'export', 'default', 
        'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return', 'await', 'async',
        'true', 'false', 'null', 'undefined'
      ]);
      const symbolRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
      const seenSymbols = new Set<string>();
      while ((match = symbolRegex.exec(failingFileContent)) !== null) {
        if (!jsKeywords.has(match[1])) {
           seenSymbols.add(match[1]);
        }
      }
      evidence.symbols = Array.from(seenSymbols);
    }

    if (relatedFileContent && relatedFilePath) {
      evidence.contextSnippets.push({ path: relatedFilePath, content: relatedFileContent });
      evidence.relatedFiles.push({ path: relatedFilePath, purpose: 'Imported/Related context' });
    }

    // Inspect repository structure for matching file names as potential evidence
    const fileName = evidence.failingFile.split('/').pop()?.split('.')[0];
    if (fileName) {
       const potentialMatches = context.structure.filter(p => p.includes(fileName) && p !== evidence.failingFile);
       for (const p of potentialMatches) {
          evidence.relatedFiles.push({ path: p, purpose: 'Structural match' });
       }
    }

    return evidence;
  }

  private static extractLockfileDeps(content: string): string[] {
    const deps = new Set<string>();
    // Simple regex for package.json / lockfile style dependency names
    const depRegex = /"([^"]+)":\s+\{/g;
    let match;
    while ((match = depRegex.exec(content)) !== null) {
      deps.add(match[1]);
    }
    // Also try to match yarn/pnpm style
    const yamlRegex = /^"?([a-zA-Z0-9\-\/@_]+)(?:@|:)/gm;
    while ((match = yamlRegex.exec(content)) !== null) {
      deps.add(match[1]);
    }
    return Array.from(deps);
  }

  private static detectMissingDependencies(failures: FailureContext[]): string[] {
    const missing = new Set<string>();
    const patterns = [
      /Cannot find module '([^']+)'/i,
      /Could not find a declaration file for module '([^']+)'/i,
      /Try `npm i --save-dev (@types\/[^`]+)`/i,
      /Try `npm i --save-dev ([^`]+)`/i,
      /Module not found: Error: Can't resolve '([^']+)'/i,
      /missing dependency: ([a-zA-Z0-9\-\/@_]+)/i
    ];

    for (const f of failures) {
      for (const pattern of patterns) {
        const match = f.message.match(pattern);
        if (match && match[1]) {
          missing.add(match[1]);
        }
      }
    }

    return Array.from(missing);
  }

  private static categorize(failure: FailureContext): FailureCategory {
    const msg = (failure.message + " " + (failure.errorType || "")).toLowerCase();
    if (msg.includes('module not found') || msg.includes('cannot find module') || msg.includes('missing dependency') || msg.includes('typings') || msg.includes('no interface')) return FailureCategory.MISSING_DEPENDENCY;
    if (msg.includes('import') || msg.includes('export')) return FailureCategory.IMPORT_FAILURE;
    if (msg.includes('config') || msg.includes('unrecognized option') || msg.includes('manifest')) return FailureCategory.BUILD_CONFIGURATION;
    if (msg.includes('version') || msg.includes('conflict')) return FailureCategory.VERSION_CONFLICT;
    if (msg.includes('signature') || msg.includes('argument') || msg.includes('parameter') || msg.includes('assignable')) return FailureCategory.API_SIGNATURE_MISMATCH;
    if (msg.includes('test') || msg.includes('fail') || msg.includes('expect')) return FailureCategory.TEST_FAILURE;
    if (msg.includes('exception') || msg.includes('panic') || msg.includes('runtime')) return FailureCategory.RUNTIME_EXCEPTION;
    if (msg.includes('error') || msg.includes('ts') || msg.includes('compilation')) return FailureCategory.COMPILATION_ERROR;
    return FailureCategory.UNKNOWN;
  }
}

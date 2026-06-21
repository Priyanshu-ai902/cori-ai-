import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PatchApplier } from './patch-applier';
import { RepositoryContext } from './repository-context-collector';
import { VerificationPlanner, VerificationPlan, VerificationLevel } from './verification-planner';
import { FailureLocalizationEngine, FailureContext } from './failure-localization-engine';
import prisma from './prisma';

import { ShellUtils } from './shell-utils';
import { Sandbox } from './sandbox';

export enum RemediationStatus {
  SUCCESS = 'SUCCESS',
  PATCH_FAILED = 'PATCH_FAILED',
  BUILD_FAILED = 'BUILD_FAILED',
  VERIFICATION_ENV_FAILED = 'VERIFICATION_ENV_FAILED',
  NEW_FAILURE = 'NEW_FAILURE',
  SAME_FAILURE = 'SAME_FAILURE'
}

export interface VerificationOutput {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  localizedFailure: {
    category: string;
    file?: string;
    line?: number;
    message: string;
    confidence: number;
  } | null;
}

export interface RemediationResult {
  success: boolean;
  status: RemediationStatus;
  executedCommands: string[];
  artifacts: string[];
  diff: string;
  verificationResult: VerificationOutput;
  logs: string;
  newFailureContext?: FailureContext;
}

export class RemediationExecutionEngine {
  /**
   * Executes a single verification pass for a given patch.
   * Stage 7: Strict Structured Verification.
   */
  static async execute(params: {
    patchId?: string;
    affectedFiles: string[];
    originalContents: Record<string, string>; 
    diff: string;
    context: RepositoryContext;
    previousFailureContext?: FailureContext;
    fetchFile?: (path: string) => Promise<string | null>;
  }): Promise<RemediationResult> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stellaops-remediation-'));
    const finalArtifacts: string[] = [];
    let logs = `[STAGE 7] Starting structured verification in ${tempDir}\n`;
    
    let success = false;
    let status = RemediationStatus.PATCH_FAILED;
    let newFailureContext: FailureContext | undefined;
    let exitCode = 0;
    let combinedStdout = "";
    let combinedStderr = "";

    try {
      // 1. Apply patch
      for (const filePath of params.affectedFiles) {
        const fullPathInTemp = path.join(tempDir, filePath);
        fs.mkdirSync(path.dirname(fullPathInTemp), { recursive: true });
        
        const content = params.originalContents[filePath];
        if (!content) throw new Error(`Missing original content for file: ${filePath}`);
        
        const updatedContent = PatchApplier.apply(content, params.diff, filePath);
        
        if (filePath.endsWith('.json')) {
          try { JSON.parse(updatedContent); } catch (e) {
            status = RemediationStatus.PATCH_FAILED;
            throw new Error(`SyntaxError: Invalid JSON produced for ${filePath}`);
          }
        }
        
        fs.writeFileSync(fullPathInTemp, updatedContent);
      }

      status = RemediationStatus.BUILD_FAILED;

      // 2. Materialization
      const plan = VerificationPlanner.plan(params.context, params.affectedFiles);
      if (params.fetchFile) {
        for (const file of params.context.structure.filter(f => !f.includes('/'))) { 
           const fullPath = path.join(tempDir, file);
           if (!fs.existsSync(fullPath)) {
             const content = await params.fetchFile(file);
             if (content) fs.writeFileSync(fullPath, content);
           }
        }
      }

      // 3. Execute Commands
      let attemptSuccess = true;
      for (const step of plan.commands) {
        const commandCwd = path.join(tempDir, step.cwd);
        if (!fs.existsSync(commandCwd)) fs.mkdirSync(commandCwd, { recursive: true });

        const sandboxResult = Sandbox.execute({
          command: step.command,
          workspaceRoot: tempDir,
          relativeCwd: step.cwd,
          env: { NODE_ENV: 'development' },
          technologies: ['NODE'] 
        });

        combinedStdout += sandboxResult.stdout;
        combinedStderr += sandboxResult.stderr;
        exitCode = sandboxResult.status;

        if (sandboxResult.status !== 0) {
          attemptSuccess = false;
          const localized = await FailureLocalizationEngine.localizeAsync(sandboxResult.stderr, params.context.structure);
          if (localized !== 'UNCERTAIN_ROOT_CAUSE') {
            newFailureContext = localized[0];
          }
          break;
        }
      }

      if (attemptSuccess) {
        success = true;
        status = RemediationStatus.SUCCESS;
      } else {
        // Stage 9: Loop Protection logic
        if (newFailureContext && params.previousFailureContext) {
           if (newFailureContext.message === params.previousFailureContext.message) {
              status = RemediationStatus.SAME_FAILURE;
           } else {
              status = RemediationStatus.NEW_FAILURE;
           }
        } else {
           status = RemediationStatus.NEW_FAILURE;
        }
      }

      const verificationResult: VerificationOutput = {
        success,
        exitCode,
        stdout: combinedStdout,
        stderr: combinedStderr,
        localizedFailure: newFailureContext ? {
          category: newFailureContext.errorType,
          file: newFailureContext.file,
          line: newFailureContext.line,
          message: newFailureContext.message,
          confidence: newFailureContext.confidence
        } : null
      };

      return {
        success,
        status,
        executedCommands: plan.commands.map(c => c.command),
        artifacts: finalArtifacts,
        diff: params.diff,
        verificationResult,
        logs,
        newFailureContext
      };

    } catch (error: any) {
      return {
        success: false,
        status: status || RemediationStatus.PATCH_FAILED,
        executedCommands: [],
        artifacts: [],
        diff: params.diff,
        verificationResult: {
          success: false,
          exitCode: -1,
          stdout: "",
          stderr: error.message,
          localizedFailure: null
        },
        logs: logs + `\nERROR: ${error.message}`
      };
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    }
  }
}

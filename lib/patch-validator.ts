import { GeneratedPatch } from '@/services/ai/generatePatch';
import { RepositoryContext } from '@/lib/repository-context-collector';

/**
 * Stage 6: Patch Validation
 * Validates the patch against syntax, formatting, and repository constraints.
 */
export class PatchValidator {
  static validate(
    patch: GeneratedPatch, 
    context: RepositoryContext, 
    rootCause: string,
    failingFileContent?: string,
    relatedFileContent?: string,
    threshold: number = 85
  ): { valid: boolean; reason: string; code?: string } {
    console.log(`[VALIDATOR] Stage 6 Validation for: ${patch.affectedFiles.join(', ')}`);

    // 1. Basic Validity
    if (!patch.diff || patch.diff.trim() === "" || patch.diff === "NO_FIX_FOUND") {
      return { valid: false, reason: "Empty or null diff generated.", code: 'EMPTY_DIFF' };
    }

    if (patch.affectedFiles.length === 0) {
      return { valid: false, reason: "No affected files listed in patch metadata.", code: 'NO_AFFECTED_FILES' };
    }

    // 2. File Existence & Workspace Integrity
    for (const file of patch.affectedFiles) {
      if (!context.structure.includes(file)) {
        return { valid: false, reason: `Patch targets non-existent file: ${file}`, code: 'FILE_NOT_FOUND' };
      }
    }

    // 3. Syntax & Safety Guard
    const forbiddenPatterns = [
      /ts-ignore/,
      /eslint-disable/,
      /rm -rf/i,
      /chmod 777/i,
      /sudo/i
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(patch.diff)) {
        return { valid: false, reason: `Patch contains forbidden pattern: ${pattern.source}`, code: 'FORBIDDEN_PATTERN' };
      }
    }

    // 4. JSON Validity (Stage 6)
    for (const file of patch.affectedFiles) {
       if (file.endsWith('.json')) {
          // Note: Full JSON validation happens during application in ExecutionEngine
          if (patch.diff.includes('{') && !patch.diff.includes('}')) {
             return { valid: false, reason: `Detected malformed JSON diff for ${file}`, code: 'MALFORMED_JSON' };
          }
       }
    }

    // 5. Confidence Threshold (Stage 6)
    if (patch.confidence < threshold) {
      return { valid: false, reason: `Confidence score (${patch.confidence}) is below the required ${threshold}% threshold.`, code: 'LOW_CONFIDENCE' };
    }

    return { valid: true, reason: "Patch passed Stage 6 validation." };
  }
}

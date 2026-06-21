import { FailureEvidence, FailureCategory } from './failure-evidence-collector';

export enum ValidationResult {
  VALID = 'VALID',
  FALSE_ROOT_CAUSE = 'FALSE_ROOT_CAUSE',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE'
}

export class RootCauseValidator {
  /**
   * Validates if the claimed root cause is supported by the collected evidence.
   */
  static validate(evidence: FailureEvidence, claimedRootCause: string): ValidationResult {
    const rcaLower = claimedRootCause.toLowerCase();

    // 1. Missing Dependency Validation
    if (evidence.category === FailureCategory.MISSING_DEPENDENCY) {
      if (evidence.missingDependencies.length === 0) {
        return ValidationResult.INSUFFICIENT_EVIDENCE;
      }

      // If AI claims a dependency is missing, but it is already in manifest AND installed
      const claimedDependencies = evidence.missingDependencies;
      const trulyMissing = claimedDependencies.filter(dep => 
        !evidence.manifestDependencies.includes(dep) || !evidence.installedDependencies.includes(dep)
      );

      if (trulyMissing.length === 0) {
        // AI says it's missing, but we see it in manifest and lockfile.
        // It might be a version mismatch or workspace issue, but "missing" is technically false.
        console.warn(`[VALIDATOR] Claimed missing dependencies (${claimedDependencies.join(', ')}) found in manifest/lockfile.`);
        return ValidationResult.FALSE_ROOT_CAUSE;
      }
    }

    // 2. Import Failure Validation
    if (evidence.category === FailureCategory.IMPORT_FAILURE) {
      // Check if the file actually has the imports mentioned in logs
      if (evidence.imports.length === 0) {
        return ValidationResult.INSUFFICIENT_EVIDENCE;
      }
    }

    // 3. API Signature Mismatch
    if (evidence.category === FailureCategory.API_SIGNATURE_MISMATCH) {
        // If AI claims signature mismatch but can't find symbols in evidence
        if (evidence.symbols.length === 0) {
            return ValidationResult.INSUFFICIENT_EVIDENCE;
        }
    }

    // Default to valid if no contradiction found
    return ValidationResult.VALID;
  }
}

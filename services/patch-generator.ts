import { generatePatchWithAI, GeneratedPatch } from './ai/generatePatch';
import { generatePatchPlan } from './ai/generatePatchPlan';
import { RepositoryContext } from '@/lib/repository-context-collector';
import { FailureLocalizationEngine } from '@/lib/failure-localization-engine';
import { FailureEvidenceCollector } from '@/lib/failure-evidence-collector';
import { RootCauseValidator, ValidationResult } from '@/lib/root-cause-validator';
import { PatchValidator } from '@/lib/patch-validator';

export { type GeneratedPatch };

export class PatchGeneratorService {
  static async generateSmart(params: {
    rootCause: string;
    explanation: string;
    suggestedFix: string;
    logs: string;
    context: RepositoryContext;
    threshold?: number;
  }): Promise<GeneratedPatch> {
    console.log(`[PATCH] Stage 4: Planning started for: ${params.rootCause}`);

    // Stage 1: Localize
    const localization = await FailureLocalizationEngine.localizeAsync(params.logs, params.context.structure);
    if (localization === 'UNCERTAIN_ROOT_CAUSE') {
      throw new Error("UNCERTAIN_ROOT_CAUSE: Localization confidence too low.");
    }

    // Stage 2: Evidence
    const evidence = FailureEvidenceCollector.collect({ 
      context: params.context, 
      failure: localization[0] 
    });

    // Stage 4: Planning
    const plan = await generatePatchPlan({
      logs: params.logs,
      context: params.context,
      evidence
    });

    // Stage 3: Validation
    if (RootCauseValidator.validate(evidence, plan.rootCause) === ValidationResult.FALSE_ROOT_CAUSE) {
      throw new Error("FALSE_ROOT_CAUSE: Plan contradicted by evidence.");
    }

    // Stage 5: Generation
    const patch = await generatePatchWithAI({
      plan,
      evidence,
      context: params.context
    });

    // Stage 6: Validation
    const validation = PatchValidator.validate(patch, params.context, params.rootCause, undefined, undefined, params.threshold);
    if (!validation.valid) {
      throw new Error(`PATCH_VALIDATION_FAILED: ${validation.reason}`);
    }

    return patch;
  }

  static generate(params: any): GeneratedPatch {
    return {
       title: "Legacy Generation",
       description: "Please use generateSmart",
       patchType: "MANUAL",
       affectedFiles: [],
       confidence: 0,
       diff: ""
    };
  }
}

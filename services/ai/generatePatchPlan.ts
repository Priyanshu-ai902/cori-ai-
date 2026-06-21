import { z } from "zod";
import { generateContentWithFallback } from "./gemini-service";
import { FailureEvidence } from "@/lib/failure-evidence-collector";
import { RepositoryContext } from "@/lib/repository-context-collector";

const PatchPlanSchema = z.object({
  title: z.string(),
  rootCause: z.string(),
  explanation: z.string(),
  confidence: z.number().min(0).max(100),
  requiredChanges: z.array(z.object({
    file: z.string(),
    description: z.string(),
    action: z.enum(["MODIFY", "CREATE", "DELETE"])
  })),
  affectedFiles: z.array(z.string()),
});

export type PatchPlan = z.infer<typeof PatchPlanSchema>;

export async function generatePatchPlan(params: {
  logs: string;
  context: RepositoryContext;
  evidence: FailureEvidence;
}): Promise<PatchPlan> {
  const prompt = `
    You are a Principal Engineer at StellaOps. Your task is to generate a structured REPAIR PLAN for a build/deployment failure.
    
    CRITICAL RULE: NEVER GENERATE A DIFF. Only describe the required changes based on the provided evidence.
    
    ### FAILURE EVIDENCE (GROUND TRUTH)
    Category: ${params.evidence.category}
    Exact Error: ${params.evidence.exactError}
    Failing File: ${params.evidence.failingFile}
    Failing Workspace: ${params.evidence.failingWorkspace || 'root'}
    Missing Dependencies: ${params.evidence.missingDependencies.join(', ')}
    Manifest Dependencies: ${params.evidence.manifestDependencies.join(', ')}
    Installed Dependencies: ${params.evidence.installedDependencies.join(', ')}
    Symbols in Scope: ${params.evidence.symbols.join(', ')}
    Imports in Scope: ${params.evidence.imports.join(', ')}
    
    ### REPOSITORY STRUCTURE
    ${params.context.structure.slice(0, 100).join('\n')}

    ### LOGS (Truncated)
    ${params.logs.slice(-5000)}

    Provide a technical, evidence-justified plan in JSON format:
    {
      "title": "Short title of the fix",
      "rootCause": "Proven root cause based on evidence",
      "explanation": "Detailed technical explanation",
      "confidence": 95,
      "requiredChanges": [
        { "file": "path/to/file", "description": "Exactly what to change and why", "action": "MODIFY" }
      ],
      "affectedFiles": ["path/to/file"]
    }
  `;

  const result = await generateContentWithFallback(prompt, {
    responseMimeType: "application/json",
  });
  
  return PatchPlanSchema.parse(JSON.parse(result.response.text()));
}

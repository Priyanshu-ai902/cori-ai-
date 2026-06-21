import { z } from "zod";
import { RepositoryContext } from "@/lib/repository-context-collector";
import { generateContentWithFallback } from "./gemini-service";
import { FailureEvidence } from "@/lib/failure-evidence-collector";
import { PatchPlan } from "./generatePatchPlan";

const PatchSchema = z.object({
  title: z.string().catch("Generated Patch"),
  description: z.string().catch(""),
  patchType: z.enum(["DEPENDENCY", "CONFIG", "CODE", "MANUAL"]).catch("CODE"),
  diff: z.string().catch(""),
  affectedFiles: z.array(z.string()).catch([]),
  confidence: z.number().min(0).max(100).catch(50),
  targetedWorkspace: z.string().optional(),
});

export type GeneratedPatch = z.infer<typeof PatchSchema>;

/**
 * Stage 5: Patch Generation
 * Generates a unified diff based on an approved PatchPlan and grounded evidence.
 */
export async function generatePatchWithAI(params: {
  plan: PatchPlan;
  evidence: FailureEvidence;
  context: RepositoryContext;
  failingFileContent?: string;
  relatedFileContent?: string;
}): Promise<GeneratedPatch> {
  const numberedSource = params.failingFileContent 
    ? params.failingFileContent.split('\n').map((line, i) => `${i + 1} | ${line}`).join('\n') 
    : "Source code unavailable.";

  const prompt = `# StellaOps Patch Generation Engine (Stage 5)

You are tasked with generating a unified diff for the following APPROVED repair plan.

### APPROVED REPAIR PLAN
Title: ${params.plan.title}
Root Cause: ${params.plan.rootCause}
Required Changes:
${params.plan.requiredChanges.map(c => `- ${c.action} ${c.file}: ${c.description}`).join('\n')}

### FAILURE EVIDENCE (GROUND TRUTH)
${JSON.stringify(params.evidence, null, 2)}

### SOURCE CONTEXT
File: ${params.evidence.failingFile}
\`\`\`
${numberedSource}
\`\`\`

${params.relatedFileContent ? `### RELATED CONTEXT\n${params.relatedFileContent}\n` : ''}

## Critical Rules
1. Every change in the diff MUST map to the "Required Changes" in the plan.
2. NEVER invent files, imports, or dependencies. Only use what is present in Evidence or Plan.
3. Reject partial fixes. Generate the full diff for all affected files.

Return the output as a JSON object:
{
  "title": "${params.plan.title}",
  "affectedFiles": ${JSON.stringify(params.plan.affectedFiles)},
  "description": "${params.plan.explanation.replace(/"/g, '\\"')}",
  "diff": "Minimal Unified Diff",
  "confidence": ${params.plan.confidence},
  "patchType": "CODE"
}`;

  console.log(`[GENERATION] Generating precision diff from approved plan...`);
  const result = await generateContentWithFallback(prompt, {
    responseMimeType: "application/json",
  });
  
  const patch = PatchSchema.parse(JSON.parse(result.response.text()));
  return patch;
}

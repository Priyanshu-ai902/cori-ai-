import { z } from "zod";
import { generateContentWithFallback } from "./gemini-service";

const AnalysisSchema = z.object({
  rootCause: z.string(),
  explanation: z.string(),
  suggestedFix: z.string(),
  confidence: z.number().min(0).max(100),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

export async function analyzeFailure(params: {
  workflowName: string;
  workflowYaml?: string;
  repoMetadata: any;
  logs: string;
}): Promise<AnalysisResult> {
  const MAX_LOG_SIZE = 12000;
  const truncatedLogs = params.logs.length > MAX_LOG_SIZE 
    ? `... [TRUNCATED] ...\n${params.logs.slice(-MAX_LOG_SIZE)}`
    : params.logs;

  const prompt = `
    You are a Senior DevOps Engineer at StellaOps. Your task is to analyze a failed GitHub Actions workflow run and provide high-signal intelligence.
    
    Workflow Name: ${params.workflowName}
    Repository: ${params.repoMetadata.fullName}
    ${params.workflowYaml ? `Workflow Configuration (YAML):\n${params.workflowYaml}` : ""}
    
    Failed Run Logs (last ${MAX_LOG_SIZE} characters):
    ${truncatedLogs}
    
    Provide your analysis in the following JSON format:
    {
      "rootCause": "Direct statement of what went wrong (e.g., 'Dependency conflict in package-lock.json')",
      "explanation": "Detailed technical explanation of the failure mechanism.",
      "suggestedFix": "Step-by-step actionable instructions to fix the issue.",
      "confidence": 94
    }
    
    Guidelines:
    - Be technical and precise.
    - Focus on the most likely root cause.
    - Do not return markdown or any text outside the JSON object.
  `;

  const result = await generateContentWithFallback(prompt, {
    responseMimeType: "application/json",
  });
  
  const response = result.response;
  const text = response.text();
  
  try {
    const json = JSON.parse(text);
    return AnalysisSchema.parse(json);
  } catch (error) {
    console.error("Failed to parse AI response:", text);
    throw new Error("AI analysis failed to return valid JSON");
  }
}

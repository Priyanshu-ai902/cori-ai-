import { z } from "zod";
import { generateContentWithFallback } from "./gemini-service";

const IssueSchema = z.object({
  type: z.enum(["FAILURE", "WARNING", "RECOMMENDATION"]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  category: z.string(),
  file: z.string(),
  line: z.preprocess((val) => {
    if (val === "null" || val === null || val === undefined) return null;
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return val;
  }, z.number().nullable().optional()),
  title: z.string(),
  rootCause: z.string(),
  manualFix: z.string(),
  aiFixSummary: z.string(),
  confidence: z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }, z.number().min(0).max(100)),
});

const IssuesResponseSchema = z.object({
  issues: z.array(IssueSchema),
});

export type IssueResult = z.infer<typeof IssueSchema>;

export async function extractIssues(params: {
  workflowName: string;
  logs: string;
  repoStructure: string[];
  detectedRootCause?: string;
}): Promise<IssueResult[]> {
  console.log(`[EXTRACT_ISSUES] Starting extraction for workflow: ${params.workflowName}`);
  if (params.detectedRootCause) {
    console.log(`[EXTRACT_ISSUES] Detected Root Cause (Guide): ${params.detectedRootCause}`);
  }

  // Truncate logs from the END instead of the start, as failures are typically at the end.
  const MAX_LOG_SIZE = 12000;
  const truncatedLogs = params.logs.length > MAX_LOG_SIZE 
    ? `... [TRUNCATED] ...\n${params.logs.substring(params.logs.length - MAX_LOG_SIZE)}`
    : params.logs;

  const prompt = `
    You are a Senior DevOps Engineer. Analyze the following failed GitHub Actions workflow logs and extract ALL distinct failures/issues.
    
    Workflow Name: ${params.workflowName}
    ${params.detectedRootCause ? `Detected Primary Root Cause: ${params.detectedRootCause}` : ""}
    
    Repository Structure (partial):
    ${params.repoStructure.slice(0, 100).join('\n')}
    
    Logs (last ${MAX_LOG_SIZE} characters):
    ${truncatedLogs}
    
    For each issue identified, provide:
    - type: FAILURE, WARNING, or RECOMMENDATION
      * FAILURE: Directly responsible for the build/test/deploy failure.
      * WARNING: Security, dependency, or maintenance issues (e.g., deprecated packages, outdated versions) that are NOT the primary cause of the current failure.
      * RECOMMENDATION: Performance, best practices, or optimization suggestions (e.g., caching, linter suggestions).
    - severity: CRITICAL, HIGH, MEDIUM, or LOW
    - category: (e.g., "Build Failure", "Dependency", "Linting", "Test Failure", "Type Error")
    - file: The path to the file causing the issue (must be one from the repository structure if possible)
    - line: The line number (if available)
    - title: A concise summary of the issue
    - rootCause: Technical explanation of why it failed. ${params.detectedRootCause ? `Note: The primary root cause has been identified as "${params.detectedRootCause}". Ensure the issues you extract as FAILURE align with this unless you find clear evidence of multiple distinct failures.` : ""}
    - manualFix: Instructions for a human to fix it
    - aiFixSummary: How an AI should approach fixing it automatically
    - confidence: Your confidence score (0-100)
    
    Return the response in this JSON format:
    {
      "issues": [
        { ... issue 1 ... },
        { ... issue 2 ... }
      ]
    }
  `;

  console.log(`[EXTRACT_ISSUES] Sending prompt to AI (Logs length: ${truncatedLogs.length})...`);
  const result = await generateContentWithFallback(prompt, {
    responseMimeType: "application/json",
  });
  
  const text = result.response.text();
  console.log("[EXTRACT_ISSUES] Raw Response:", text);

  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, "").replace(/\n```$/m, "");
    console.log("[EXTRACT_ISSUES] Cleaned Markdown Fences:", cleaned);
  }
  
  try {
    const json = JSON.parse(cleaned);
    console.log("[EXTRACT_ISSUES] Parsed JSON:", JSON.stringify(json, null, 2));
    
    const parsed = IssuesResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[EXTRACT_ISSUES] Schema Validation Failed:", JSON.stringify(parsed.error.format(), null, 2));
      const firstError = parsed.error.issues[0];
      const fieldPath = firstError.path.join(".");
      throw new Error(`AI issue extraction schema mismatch at ${fieldPath}: ${firstError.message}`);
    }
    
    return parsed.data.issues;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
       console.error("[EXTRACT_ISSUES] JSON Syntax Error:", error.message);
       throw new Error(`AI returned invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

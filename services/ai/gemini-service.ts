import { GoogleGenerativeAI, GenerationConfig, GenerateContentResult } from "@google/generative-ai";

/**
 * Multi-Model Failover Queue Configuration
 * Ordered by preference and quota limits.
 */
const MODEL_QUEUE = [
  // 'gemini-3.5-flash',       // First Choice
  'gemini-3.1-flash-lite',  // Second Choice
  'gemini-2.5-flash-lite',  // Third Choice
  'gemini-2.5-flash'        // Final Fallback
] as const;

type GeminiModel = typeof MODEL_QUEUE[number];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Utility for exponential backoff delay
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Multi-Model Failover Queue with Exponential Backoff
 * Handles 429 (Quota Exceeded) and 503 (Service Unavailable) errors by cycling through
 * available models and retrying within each model before moving to the next.
 * 
 * @param prompt The prompt to send to the model
 * @param generationConfig Optional configuration for the generation (e.g., responseMimeType)
 * @returns The GenerateContentResult from the successful model call
 */
export async function generateContentWithFallback(
  prompt: string,
  generationConfig: GenerationConfig = { responseMimeType: "application/json" }
): Promise<GenerateContentResult> {
  const startTime = Date.now();
  const promptLength = prompt.length;
  const estimatedTokens = Math.ceil(promptLength / 4);
  
  console.log(`[AI_REQUEST] Starting generation. Prompt Length: ${promptLength}, Estimated Tokens: ${estimatedTokens}`);

  let lastError: any = null;

  for (const modelName of MODEL_QUEUE) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const attemptStartTime = Date.now();
      try {
        console.log(`[AI_ATTEMPT] Model: ${modelName}, Attempt: ${attempt}/${3}`);
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
        
        // Use a controller to handle timeouts if needed, but SDK might have its own
        // Execute the generation with a timeout
        const result = await model.generateContent(prompt);

        const responseTime = Date.now() - attemptStartTime;
        console.log(`[AI_SUCCESS] Model: ${modelName}, Response Time: ${responseTime}ms`);

        return result;
        } catch (error: any) {
        lastError = error;
        const responseTime = Date.now() - attemptStartTime;

        const status = error?.status || error?.response?.status;
        const errorMessage = error.message || String(error);
        const errorCause = error.cause ? JSON.stringify(error.cause) : 'N/A';

        console.error(`[AI_FAILURE] Model: ${modelName}, Attempt: ${attempt}, Time: ${responseTime}ms`);
        console.error(`[AI_ERROR_DETAIL] Status: ${status}, Message: ${errorMessage}, Cause: ${errorCause}`);

        if (error.response) {
          console.error(`[AI_ERROR_HEADERS] ${JSON.stringify(error.response.headers || {})}`);
        }

        // Detect timeout, fetch failed, or transient errors
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED');
        const isFetchFailed = errorMessage.includes('fetch failed') || errorMessage.includes('UND_ERR_CONNECT_TIMEOUT');
        const isTransient = status === 429 || status === 503 || status === 504 || isFetchFailed || isTimeout;
        if (isTransient) {
          console.warn(`[AI_RETRY] Transient error detected. Retrying...`);
          if (attempt < 3) {
            const backoffDelay = attempt * 2000 * (isFetchFailed ? 2 : 1);
            await sleep(backoffDelay);
            continue;
          }
        }
        
        console.log(`[AI_FALLBACK] Moving to next model or failing...`);
        break; // Move to next model
      }
    }
  }

  const totalTime = Date.now() - startTime;
  console.error(`[AI_CRITICAL] All models failed after ${totalTime}ms. Last error: ${lastError?.message}`);
  
  throw new Error(
    `[PATCH PIPELINE CRITICAL] All fallback models failed. Last Error: ${lastError?.message || lastError}`
  );
}

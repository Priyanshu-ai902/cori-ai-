
export interface AnalysisResult {
  summary: string;
  rootCause: string;
  confidence: number;
  recommendation: string;
}

export class RCAService {
  static analyze(logs: string, workflowName: string): AnalysisResult {
    console.log(`[RCA] Analyzing logs for workflow: ${workflowName}`);

    const rules = [
      {
        pattern: /Please install @types\/react/i,
        rootCause: "Missing TypeScript React typings",
        recommendation: "Run 'npm install -D @types/react @types/react-dom' to provide the necessary type definitions for React.",
        summary: "The build failed because React type definitions are missing, which are required for TypeScript compilation in this project."
      },
      {
        pattern: /trying to use TypeScript but do not have the required package installed/i,
        rootCause: "Missing TypeScript dependencies",
        recommendation: "Install the missing TypeScript type packages reported in the logs and rebuild. Typically this involves @types/node or @types/react.",
        summary: "Next.js detected TypeScript usage but found that essential type packages are not installed in the environment."
      },
      {
        pattern: /Next\.js build worker exited with code: 1/i,
        rootCause: "Next.js build failure",
        recommendation: "Inspect the preceding compiler errors in the logs. This is often caused by missing dependencies, syntax errors, or type mismatches.",
        summary: "The Next.js build process crashed. The root cause is likely a compilation error earlier in the log stream."
      },
      {
        pattern: /Cannot find module/i,
        rootCause: "Missing dependency",
        recommendation: "Run 'npm install' or 'yarn install' and ensure package-lock.json/yarn.lock is updated and committed.",
        summary: "The build failed because a required Node.js module could not be found."
      },
      {
        pattern: /Module not found/i,
        rootCause: "Missing package import or installation",
        recommendation: "Verify the package is listed in package.json and the import path is correct. If it's a new package, run 'npm install'.",
        summary: "A module import failed, suggesting either a missing dependency or an incorrect file path."
      },
      {
        pattern: /Type error|Property .* does not exist on type|Argument of type .* is not assignable/i,
        rootCause: "TypeScript compilation failure",
        recommendation: "Fix the type definitions in the reported files. Ensure all interfaces and types are correctly defined and imported.",
        summary: "The TypeScript compiler found type mismatches that prevented the build from completing."
      },
      {
        pattern: /Tests failed|failed tests|test failed|Expected .* but received/i,
        rootCause: "Test suite failure",
        recommendation: "Inspect the failed test output in the logs. Run tests locally using 'npm test' to reproduce and fix the regression.",
        summary: "One or more automated tests failed, indicating a regression or unmet expectation in the code."
      },
      {
        pattern: /Docker build failed|failed to solve: rpc error|failed to solve with frontend/i,
        rootCause: "Docker build configuration issue",
        recommendation: "Review the Dockerfile and build context. Check for missing files referenced in COPY/ADD commands or network issues during layer fetching.",
        summary: "The Docker image build process failed due to a configuration error or environment issue."
      },
      {
        pattern: /Permission denied|EACCES/i,
        rootCause: "File system permission error",
        recommendation: "Check file permissions in the repository or Docker container. You may need to run 'chmod' on specific scripts or ensure the user has appropriate access.",
        summary: "The process attempted to access a file or directory without sufficient permissions."
      },
      {
        pattern: /Invalid API Key|Authentication failed|Unauthorized/i,
        rootCause: "Secret or Authentication issue",
        recommendation: "Verify that all required GitHub Secrets are correctly set in the repository settings. Check for expired tokens or incorrect environment variables.",
        summary: "The workflow failed to authenticate with an external service or API."
      }
    ];

    for (const rule of rules) {
      if (rule.pattern.test(logs)) {
        console.log(`[RCA] Pattern matched: ${rule.rootCause}`);
        return {
          summary: rule.summary,
          rootCause: rule.rootCause,
          confidence: 95, // High confidence for specific pattern matches
          recommendation: rule.recommendation
        };
      }
    }

    console.log(`[RCA] No patterns matched. Returning generic analysis.`);
    return {
      summary: "The workflow failed, but no specific known failure pattern was identified in the logs.",
      rootCause: "Unknown build or runtime error",
      confidence: 40,
      recommendation: "Review the full logs on GitHub to identify the point of failure. Consider adding more descriptive error handling to the workflow."
    };
  }
}

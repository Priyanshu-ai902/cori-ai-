import os from 'os';

/**
 * Utility to adjust shell commands for the current operating system.
 */
export class ShellUtils {
  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  /**
   * Adjusts a command string for cross-platform compatibility.
   */
  static normalizeCommand(command: string): string {
    if (!this.isWindows()) return command;

    let normalized = command;

    // 1. Local execution wrappers
    normalized = normalized.replace(/\.\/mvnw\b/g, 'mvnw.cmd');
    normalized = normalized.replace(/\.\/gradlew\b/g, 'gradlew.bat');
    
    // 2. Python 3 naming convention
    if (normalized.startsWith('python3 ')) {
       normalized = normalized.replace('python3 ', 'python ');
    }

    // 3. Node.js -e command normalization (quotes handling)
    // On Windows, double quotes are required for the -e argument, and 
    // internal double quotes must be escaped as \" or the string must use single quotes.
    // If the user provided node -e "JSON.parse(require('fs')...)"
    // it's already well-formatted for CMD usually.
    // The previous fix replaced 'fs' with "fs" which broke it.
    
    // We only replace single quotes if they are NOT likely to be part of a Node.js -e payload 
    // that already uses double quotes as the outer wrapper.
    // Heuristic: If it starts with node -e " and ends with ", don't touch single quotes inside.
    if (normalized.includes('node -e "') && normalized.endsWith('"')) {
       // Leave it alone, it's likely correct.
    } else if (normalized.includes('node -e "')) {
       // Might be part of a larger command. 
    } else if (normalized.includes("node -e '")) {
       // Convert to double quotes for Windows
       normalized = normalized.replace("node -e '", 'node -e "').replace(/'$/, '"');
       // And escape internal double quotes if they were there (less common in -e)
    }

    return normalized;
  }
}

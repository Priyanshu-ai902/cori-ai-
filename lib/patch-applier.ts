/**
 * Utility to apply modifications to files.
 * Supports AST-based updates for JSON and unified diff for others.
 */
export class PatchApplier {
  /**
   * Applies changes to content. Extract the specific file's diff from a potential multi-file diff.
   */
  static apply(content: string, diff: string, filePath: string): string {
    const fileDiff = this.extractFileDiff(diff, filePath);

    if (!fileDiff.trim()) {
      return content; // No changes for this file
    }

    if (filePath === 'package.json' || filePath.endsWith('/package.json')) {
      try {
        return this.applyJSON(content, fileDiff);
      } catch (e) {
        console.warn(`[PATCH] JSON AST-based update failed for ${filePath}, falling back to string-based. Error:`, e);
      }
    }
    return this.applyString(content, fileDiff);
  }

  /**
   * Extracts the unified diff specifically targeted at the provided filePath.
   */
  static extractFileDiff(diff: string, filePath: string): string {
    const lines = diff.split('\n');
    let fileDiffLines: string[] = [];
    let currentTarget: string | null = null;
    let foundAnyFileHeader = false;

    for (const line of lines) {
      if (line.startsWith('--- a/')) {
        foundAnyFileHeader = true;
        currentTarget = line.substring(6).trim();
      } else if (line.startsWith('+++ b/')) {
        foundAnyFileHeader = true;
        currentTarget = line.substring(6).trim();
      } else if (line.startsWith('--- ') && !line.startsWith('--- a/')) {
        const possiblePath = line.substring(4).trim();
        if (possiblePath !== '/dev/null') {
           foundAnyFileHeader = true;
           currentTarget = possiblePath;
        }
      } else if (line.startsWith('+++ ') && !line.startsWith('+++ b/')) {
        const possiblePath = line.substring(4).trim();
        if (possiblePath !== '/dev/null') {
           foundAnyFileHeader = true;
           currentTarget = possiblePath;
        }
      }
      
      if (!foundAnyFileHeader) {
        // If we haven't seen any headers yet, maybe it's a raw hunk without file headers
        fileDiffLines.push(line);
      } else if (currentTarget === filePath) {
        fileDiffLines.push(line);
      }
    }

    if (foundAnyFileHeader && fileDiffLines.length === 0) {
      return "";
    }

    return fileDiffLines.join('\n');
  }

  /**
   * AST-based JSON modification.
   */
  private static applyJSON(content: string, diff: string): string {
    let obj = JSON.parse(content);
    const diffLines = diff.split('\n');
    
    // Attempt to track the current JSON path based on indentation or markers
    let currentKeyPath: string[] = [];

    for (const line of diffLines) {
      if (line.startsWith('+') && line.includes(':')) {
        const match = line.match(/^\+\s*"([^"]+)"\s*:\s*"([^"]+)"/);
        if (match) {
          const [_, key, value] = match;
          
          // Heuristic: If we are in package.json, try to find the right section
          if (obj.dependencies && line.toLowerCase().includes('dependenc')) {
             if (line.includes('dev')) obj.devDependencies[key] = value;
             else obj.dependencies[key] = value;
          } else {
             // Generic top-level or matched key update
             obj[key] = value;
          }
        }
      }
    }

    const finalized = JSON.stringify(obj, null, 2);
    return finalized;
  }

  /**
   * String-based patching (unified diff) correctly handling multiple hunks and offsets.
   */
  private static applyString(content: string, diff: string): string {
    const lines = content.split('\n');
    const diffLines = diff.split('\n');
    
    let result = [...lines];
    let diffIdx = 0;
    let offsetDrift = 0;

    while (diffIdx < diffLines.length) {
      if (diffLines[diffIdx].startsWith('@@')) {
        const match = diffLines[diffIdx].match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          const oldStart = parseInt(match[1], 10) - 1; // 0-based
          diffIdx++;
          
          const hunkLinesToInsert: string[] = [];
          let linesToDelete = 0;

          while (diffIdx < diffLines.length && !diffLines[diffIdx].startsWith('@@') && !diffLines[diffIdx].startsWith('---')) {
             const dLine = diffLines[diffIdx];
             const type = dLine[0];
             const text = dLine.slice(1);
             
             if (type === '+') {
                 hunkLinesToInsert.push(text);
             } else if (type === '-') {
                 linesToDelete++;
             } else if (type === ' ' || dLine === '') {
                 hunkLinesToInsert.push(text);
                 linesToDelete++;
             } else if (type === '\\') {
                 // \ No newline at end of file
             }
             diffIdx++;
          }
          
          // Apply hunk with drift
          const actualStart = Math.max(0, oldStart + offsetDrift);
          result.splice(actualStart, linesToDelete, ...hunkLinesToInsert);
          
          // Update drift
          offsetDrift += (hunkLinesToInsert.length - linesToDelete);
          continue;
        }
      }
      diffIdx++;
    }

    return result.join('\n');
  }
}

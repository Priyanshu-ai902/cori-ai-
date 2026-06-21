import fs from 'fs';
import path from 'path';
import { RepositoryContext } from './repository-context-collector';

export interface VersionResolutionResult {
  version: string;
  source: string;
  fallback: boolean;
  reason?: string;
}

export class VersionResolver {
  static async resolve(packageName: string, context: RepositoryContext): Promise<VersionResolutionResult> {
    console.log(`[VERSION_RESOLUTION] Resolving version for package: ${packageName}`);

    const rootDir = process.cwd();
    const lockfilePath = path.join(rootDir, 'package-lock.json');

    // 1. Check all package.json files in the workspace (including workspaces)
    const packageJsonFiles = context.structure.filter(f => f.endsWith('package.json') && !f.includes('node_modules'));
    
    for (const relPath of packageJsonFiles) {
      const fullPath = path.join(rootDir, relPath);
      if (fs.existsSync(fullPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          const existingVersion = pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName] || pkg.peerDependencies?.[packageName];
          if (existingVersion) {
            console.log(`[VERSION_RESOLUTION] evidence source: ${relPath}`);
            console.log(`[VERSION_RESOLUTION] selected version: ${existingVersion}`);
            return { version: existingVersion, source: relPath, fallback: false };
          }
        } catch (e) {
          console.error(`[VERSION_RESOLUTION] Error reading ${relPath}:`, e);
        }
      }
    }

    // 2. Check lockfiles for exact installed version
    const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
    for (const lockfile of lockfiles) {
      const lockfilePath = path.join(rootDir, lockfile);
      if (fs.existsSync(lockfilePath)) {
        try {
          const content = fs.readFileSync(lockfilePath, 'utf-8');
          if (lockfile === 'package-lock.json') {
            const lock = JSON.parse(content);
            if (lock.packages) {
              for (const pkgPath in lock.packages) {
                if (pkgPath.endsWith(`node_modules/${packageName}`)) {
                  const entry = lock.packages[pkgPath];
                  if (entry && entry.version) {
                    console.log(`[VERSION_RESOLUTION] evidence source: ${lockfile}`);
                    console.log(`[VERSION_RESOLUTION] selected version: ${entry.version}`);
                    return { version: entry.version, source: lockfile, fallback: false };
                  }
                }
              }
            }
            const legacyEntry = lock.dependencies?.[packageName];
            if (legacyEntry && legacyEntry.version) {
              console.log(`[VERSION_RESOLUTION] evidence source: ${lockfile} (legacy)`);
              console.log(`[VERSION_RESOLUTION] selected version: ${legacyEntry.version}`);
              return { version: legacyEntry.version, source: lockfile, fallback: false };
            }
          } else if (lockfile === 'pnpm-lock.yaml') {
            // Simple string matching for pnpm-lock to avoid yaml dependency
            // Example entry: /lodash@4.17.21:
            const pnpmRegex = new RegExp(`/${packageName}@([^\\s:]+)`, 'g');
            const pnpmMatch = pnpmRegex.exec(content);
            if (pnpmMatch) {
              console.log(`[VERSION_RESOLUTION] evidence source: ${lockfile}`);
              console.log(`[VERSION_RESOLUTION] selected version: ${pnpmMatch[1]}`);
              return { version: pnpmMatch[1], source: lockfile, fallback: false };
            }
          } else if (lockfile === 'yarn.lock') {
            // Simple string matching for yarn.lock
            // Example: lodash@^4.17.21:
            //            version "4.17.21"
            const yarnRegex = new RegExp(`"${packageName}@[^"]+":\\s*\\n\\s*version "([^"]+)"`, 'm');
            const yarnMatch = yarnRegex.exec(content);
            if (yarnMatch) {
              console.log(`[VERSION_RESOLUTION] evidence source: ${lockfile}`);
              console.log(`[VERSION_RESOLUTION] selected version: ${yarnMatch[1]}`);
              return { version: yarnMatch[1], source: lockfile, fallback: false };
            }
          }
        } catch (e) {
          console.error(`[VERSION_RESOLUTION] Error reading ${lockfile}:`, e);
        }
      }
    }

    // 3. Fallback to latest
    console.log(`[VERSION_RESOLUTION] evidence source: none`);
    console.log(`[VERSION_RESOLUTION] selected version: latest`);
    console.log(`[VERSION_RESOLUTION] fallback reason: No version evidence found in package.json files or lockfiles`);
    
    return { 
      version: 'latest', 
      source: 'none', 
      fallback: true, 
      reason: 'No version evidence found in package.json or lockfiles' 
    };
  }

  /**
   * Scans a patch's diff to find package updates and resolves their versions.
   * Handles multi-file diffs by splitting into chunks.
   */
  static async processPatch(patch: { diff: string, affectedFiles: string[] }, context: RepositoryContext): Promise<void> {
    if (!patch.diff.includes('package.json')) return;

    const sections = patch.diff.split(/^--- /m);
    let updatedDiff = sections[0]; // Header before first file

    const modifiedPackages: string[] = [];
    const modifiedFiles: string[] = [];

    for (let i = 1; i < sections.length; i++) {
      let section = '--- ' + sections[i];
      const fileMatch = section.match(/^\+\+\+ b\/(.*)$/m);
      const filePath = fileMatch ? fileMatch[1].trim() : null;

      if (filePath && (filePath === 'package.json' || filePath.endsWith('/package.json'))) {
        const dependencyRegex = /^\+\s*"([^"]+)"\s*:\s*"([^"]+)"/gm;
        let match;
        const sectionReplacements: { old: string, new: string }[] = [];

        while ((match = dependencyRegex.exec(section)) !== null) {
          const packageName = match[1];
          const suggestedVersion = match[2];

          const resolution = await this.resolve(packageName, context);
          
          if (resolution.version !== suggestedVersion) {
            const oldLine = match[0];
            const newLine = oldLine.replace(suggestedVersion, resolution.version);
            sectionReplacements.push({ old: oldLine, new: newLine });
            modifiedPackages.push(packageName);
          }
        }

        for (const replacement of sectionReplacements) {
          section = section.replace(replacement.old, replacement.new);
        }
        modifiedFiles.push(filePath);
      }
      updatedDiff += section;
    }

    if (modifiedPackages.length > 0) {
      patch.diff = updatedDiff;
      console.log(`[VERSION_RESOLUTION] Modified versions for packages: ${[...new Set(modifiedPackages)].join(', ')}`);
      console.log(`[VERSION_RESOLUTION] Files modified in patch: ${[...new Set(modifiedFiles)].join(', ')}`);
    }
  }
}

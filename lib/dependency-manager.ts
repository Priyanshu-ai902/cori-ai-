import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export class DependencyManager {
  static async generateLockfile(params: {
    packageManager: 'npm' | 'pnpm' | 'yarn';
    packageJsonContent: string;
    existingLockfileContent?: string;
  }): Promise<string> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stellaops-deps-'));
    
    try {
      // Write package.json
      fs.writeFileSync(path.join(tempDir, 'package.json'), params.packageJsonContent);

      // Write existing lockfile if present
      if (params.existingLockfileContent) {
        if (params.packageManager === 'npm') {
          fs.writeFileSync(path.join(tempDir, 'package-lock.json'), params.existingLockfileContent);
        } else if (params.packageManager === 'pnpm') {
          fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), params.existingLockfileContent);
        } else if (params.packageManager === 'yarn') {
          fs.writeFileSync(path.join(tempDir, 'yarn.lock'), params.existingLockfileContent);
        }
      }

      // Run installation to update lockfile
      if (params.packageManager === 'npm') {
        execSync('npm install --package-lock-only --ignore-scripts', { cwd: tempDir, stdio: 'ignore' });
        return fs.readFileSync(path.join(tempDir, 'package-lock.json'), 'utf-8');
      } else if (params.packageManager === 'pnpm') {
        execSync('pnpm install --lockfile-only --ignore-scripts', { cwd: tempDir, stdio: 'ignore' });
        return fs.readFileSync(path.join(tempDir, 'pnpm-lock.yaml'), 'utf-8');
      } else if (params.packageManager === 'yarn') {
        execSync('yarn install --mode update-lockfile --ignore-scripts', { cwd: tempDir, stdio: 'ignore' });
        return fs.readFileSync(path.join(tempDir, 'yarn.lock'), 'utf-8');
      }

      throw new Error(`Unsupported package manager: ${params.packageManager}`);
    } finally {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

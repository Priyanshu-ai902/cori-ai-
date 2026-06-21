import { execSync } from 'child_process';
import path from 'path';

export type SandboxFailureType = 'SUCCESS' | 'SANDBOX_START_FAILURE' | 'DOCKER_DAEMON_FAILURE' | 'CONTAINER_EXEC_FAILURE' | 'COMMAND_FAILURE';

export interface SandboxResult {
  stdout: string;
  stderr: string;
  status: number;
  failureType: SandboxFailureType;
}

export class Sandbox {
  /**
   * Selects the appropriate Docker image based on technologies.
   */
  private static selectImage(technologies: string[]): string {
    const techMap: Record<string, string> = {
      'NODE': 'node:18-alpine',
      'PYTHON': 'python:3.11-slim',
      'JAVA': 'maven:3.9-eclipse-temurin-17',
      'GO': 'golang:1.21-alpine',
      'RUST': 'rust:1.72-slim',
      'TERRAFORM': 'hashicorp/terraform:latest',
      'DOCKER': 'docker:latest'
    };

    for (const tech of technologies) {
      if (techMap[tech]) return techMap[tech];
    }

    return 'alpine:latest'; // Default fallback
  }

  /**
   * Executes a command inside a containerized sandbox.
   */
  static execute(params: {
    command: string;
    workspaceRoot: string; // The host temp dir containing the repository
    relativeCwd: string;   // CWD relative to workspaceRoot
    env: Record<string, string>;
    technologies: string[];
  }): SandboxResult {
    const image = this.selectImage(params.technologies);
    const containerWorkspace = '/workspace';
    const containerCwd = path.posix.join(containerWorkspace, params.relativeCwd.replace(/\\/g, '/'));

    console.log(`[SANDBOX_START] Image: ${image}, Command: ${params.command}`);

    // Build environment flags
    const envFlags = Object.entries(params.env)
      .map(([key, value]) => `-e ${key}="${value}"`)
      .join(' ');

    const hostPath = path.resolve(params.workspaceRoot);
    const dockerCommand = `docker run --rm ${envFlags} -v "${hostPath}":"${containerWorkspace}" -w "${containerCwd}" ${image} sh -c "${params.command.replace(/"/g, '\\"')}"`;

    try {
      const stdout = execSync(dockerCommand, { stdio: 'pipe' }).toString();
      console.log(`[SANDBOX_DESTROY] Command succeeded`);
      return { stdout, stderr: '', status: 0, failureType: 'SUCCESS' };
    } catch (error: any) {
      console.warn(`[SANDBOX_DESTROY] Command failed with exit code: ${error.status || 'unknown'}`);
      
      const stdout = error.stdout?.toString() || '';
      const stderr = error.stderr?.toString() || '';
      const status = error.status || 1;
      
      let failureType: SandboxFailureType = 'COMMAND_FAILURE';
      
      if (error.code === 'ENOENT') {
        failureType = 'SANDBOX_START_FAILURE'; // docker not found
      } else if (stderr.includes('error during connect') || stderr.includes('daemon is not running')) {
        failureType = 'DOCKER_DAEMON_FAILURE';
      } else if (stderr.includes('Unable to find image') || stderr.includes('Error response from daemon')) {
        failureType = 'CONTAINER_EXEC_FAILURE';
      }

      return { stdout, stderr, status, failureType };
    }
  }
}

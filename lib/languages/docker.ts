import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class DockerAdapter implements LanguageAdapter {
  readonly name = 'Docker';
  readonly priority = 40;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f.includes('Dockerfile') || f.includes('docker-compose'));
  }

  getFilterPatterns(): string[] {
    return ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path.includes('Dockerfile') || path.includes('docker-compose')) {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'containerized-env']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['docker build .', 'docker-compose up'];
  }
}

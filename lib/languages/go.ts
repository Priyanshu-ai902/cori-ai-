import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class GoAdapter implements LanguageAdapter {
  readonly name = 'Go';
  readonly priority = 70;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f === 'go.mod' || f === 'go.work');
  }

  getFilterPatterns(): string[] {
    return ['go.mod', 'go.work', 'go.sum'];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path === 'go.work') {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'go-workspaces']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['go build', 'go test ./...'];
  }
}

import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class NodeAdapter implements LanguageAdapter {
  readonly name = 'Node';
  readonly priority = 100;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f.endsWith('package.json'));
  }

  getFilterPatterns(): string[] {
    return [
      'package.json', 
      'pnpm-workspace.yaml', 
      'turbo.json', 
      'nx.json', 
      'lerna.json', 
      'tsconfig.json',
      '.npmrc',
      '.yarnrc',
      'yarn.lock',
      'package-lock.json',
      'pnpm-lock.yaml'
    ];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path === 'package.json') {
      context.rootPackageJson = content;
      context.dependencies = { 
        ...context.dependencies,
        ...content.dependencies, 
        ...content.devDependencies 
      };
      if (content.scripts) {
        context.buildCommands = Array.from(new Set([...context.buildCommands, ...Object.keys(content.scripts)]));
      }
      if (content.workspaces) {
        const workspaces = Array.isArray(content.workspaces) ? content.workspaces : content.workspaces.packages || [];
        context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, ...workspaces]));
      }
    } else if (path.endsWith('package.json')) {
      context.workspacePackageJsons.push({ path, content });
      context.dependencies = { 
        ...context.dependencies, 
        ...content.dependencies, 
        ...content.devDependencies 
      };
    } else if (path === 'pnpm-workspace.yaml') {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'pnpm-workspaces']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['npm install', 'npm build', 'npm test'];
  }
}

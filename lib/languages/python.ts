import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class PythonAdapter implements LanguageAdapter {
  readonly name = 'Python';
  readonly priority = 90;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f === 'requirements.txt' || f === 'pyproject.toml' || f === 'setup.py' || f.endsWith('.py'));
  }

  getFilterPatterns(): string[] {
    return ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock'];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path === 'requirements.txt' && typeof content === 'string') {
      const deps = content.split('\n').filter(l => l && !l.startsWith('#'));
      deps.forEach(d => {
        const [name, version] = d.split(/[==,>=,<=]/);
        if (name) context.dependencies[name.trim()] = version ? version.trim() : 'latest';
      });
    } else if (path === 'pyproject.toml') {
       context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'python-project']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['pip install -r requirements.txt', 'pytest'];
  }
}

import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class RustAdapter implements LanguageAdapter {
  readonly name = 'Rust';
  readonly priority = 60;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f === 'Cargo.toml');
  }

  getFilterPatterns(): string[] {
    return ['Cargo.toml', 'Cargo.lock'];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path === 'Cargo.toml' && typeof content === 'string' && content.includes('[workspace]')) {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'cargo-workspaces']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['cargo build', 'cargo test'];
  }
}

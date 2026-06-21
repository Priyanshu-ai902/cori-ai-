import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class TerraformAdapter implements LanguageAdapter {
  readonly name = 'Terraform';
  readonly priority = 50;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f.endsWith('.tf') || f === '.terraform.lock.hcl');
  }

  getFilterPatterns(): string[] {
    return ['.terraform.lock.hcl', 'main.tf', 'variables.tf', 'outputs.tf'];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path === '.terraform.lock.hcl') {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'terraform-project']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['terraform init', 'terraform plan'];
  }
}

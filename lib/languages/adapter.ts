import { RepositoryContext } from '../repository-context-collector';

export interface LanguageAdapter {
  readonly name: string;
  readonly priority: number;

  /**
   * Determines if this adapter is applicable for the given repository structure.
   */
  isApplicable(structure: string[]): boolean;

  /**
   * Identifies configuration files relevant to this language.
   */
  getFilterPatterns(): string[];

  /**
   * Processes a configuration file to extract context (dependencies, workspaces, etc.).
   */
  processConfig(path: string, content: any, context: RepositoryContext): void;

  /**
   * Suggests build or test commands for the language.
   */
  suggestCommands(context: RepositoryContext): string[];
}

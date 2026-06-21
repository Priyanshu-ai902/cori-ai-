import { LanguageAdapter } from './adapter';
import { RepositoryContext } from '../repository-context-collector';

export class JavaAdapter implements LanguageAdapter {
  readonly name = 'Java';
  readonly priority = 80;

  isApplicable(structure: string[]): boolean {
    return structure.some(f => f === 'pom.xml' || f === 'build.gradle' || f === 'build.gradle.kts');
  }

  getFilterPatterns(): string[] {
    return ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'];
  }

  processConfig(path: string, content: any, context: RepositoryContext): void {
    if (path === 'pom.xml') {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'maven-modules']));
    } else if (path.includes('gradle')) {
      context.detectedWorkspaces = Array.from(new Set([...context.detectedWorkspaces, 'gradle-projects']));
    }
  }

  suggestCommands(context: RepositoryContext): string[] {
    return ['mvn clean install', './gradlew build'];
  }
}

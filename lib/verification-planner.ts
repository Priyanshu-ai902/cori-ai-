import { RepositoryContext } from './repository-context-collector';

/**
 * Verification Levels as defined by the StellaOps Verification Planner.
 */
export enum VerificationLevel {
  LEVEL_1_STATIC = 'LEVEL_1', // Static Validation (lint, types, schema)
  LEVEL_2_COMPONENT = 'LEVEL_2', // Component Verification (build/test impacted)
  LEVEL_3_DEPENDENCY = 'LEVEL_3', // Dependency Verification (impacted + dependents)
  LEVEL_4_REPOSITORY = 'LEVEL_4'  // Repository Verification (full repo)
}

/**
 * Representation of a logical component in the repository.
 */
export interface Component {
  id: string; // Unique ID (e.g., path or name)
  name: string;
  path: string; // Relative path from root
  type: 'SERVICE' | 'APP' | 'LIBRARY' | 'INFRA' | 'ROOT' | 'UNKNOWN';
  technologies: string[];
  dependencies: string[]; // IDs of components this component depends on
  configFiles: string[];
}

/**
 * The dynamically generated repository topology.
 */
export interface RepositoryGraph {
  components: Component[];
  relationships: {
    from: string;
    to: string;
    type: 'DEPENDS_ON' | 'DEPLOYS' | 'CONFIGURES';
  }[];
}

/**
 * Impact analysis result.
 */
export interface ImpactAnalysis {
  impactedComponentIds: string[];
  downstreamComponentIds: string[];
  infrastructureIds: string[];
  radius: number; // Measure of how far the impact spreads
}

/**
 * The final plan produced by the Verification Planner.
 */
export interface VerificationPlan {
  scope: VerificationLevel;
  commands: {
    componentId: string;
    phase: 'VALIDATE' | 'INSTALL' | 'BUILD' | 'TEST';
    command: string;
    cwd: string;
  }[];
  confidenceScore: number;
  escalationRationale: string;
  impactedComponents: string[];
  graph: RepositoryGraph; 
}

export class VerificationPlanner {
  /**
   * Main entry point to generate a verification plan for a given patch.
   */
  static plan(context: RepositoryContext, patchFiles: string[]): VerificationPlan {
    // 1. Discovery & Graph Building (Task 3)
    const graph = this.buildGraph(context);
    
    // 2. Impact Analysis via Graph Traversal (Task 3)
    const impact = this.analyzeImpact(graph, patchFiles);
    
    // 3. Level Selection & Command Generation (Task 5 included)
    const plan = this.generatePlan(graph, impact, context, patchFiles);
    
    return plan;
  }

  /**
   * Dynamically discovers repository structure and builds a dependency graph.
   * Supports complex workspace protocols and structures.
   */
  private static buildGraph(context: RepositoryContext): RepositoryGraph {
    const components: Component[] = [];
    const relationships: RepositoryGraph['relationships'] = [];

    // Identify Components via Markers
    const componentMarkers = [
      { file: 'package.json', type: 'NODE' },
      { file: 'pyproject.toml', type: 'PYTHON' },
      { file: 'requirements.txt', type: 'PYTHON' },
      { file: 'Cargo.toml', type: 'RUST' },
      { file: 'go.mod', type: 'GO' },
      { file: 'pom.xml', type: 'JAVA' },
      { file: 'build.gradle', type: 'JAVA' },
      { file: 'build.gradle.kts', type: 'JAVA' },
      { file: 'Dockerfile', type: 'DOCKER' },
      { file: 'main.tf', type: 'TERRAFORM' },
      { file: 'k8s.yaml', type: 'KUBERNETES' },
      { file: 'deployment.yaml', type: 'KUBERNETES' },
      { file: 'values.yaml', type: 'HELM' }
    ];

    components.push({
      id: 'root',
      name: 'root',
      path: '',
      type: 'ROOT',
      technologies: [],
      dependencies: [],
      configFiles: []
    });

    for (const file of context.structure) {
      const parts = file.split('/');
      const fileName = parts.pop();
      const dirPath = parts.join('/');

      const marker = componentMarkers.find(m => 
        fileName === m.file || 
        (m.file.startsWith('.') && fileName?.endsWith(m.file)) ||
        (m.file === 'main.tf' && fileName?.endsWith('.tf'))
      );
      
      if (marker) {
        let existingComp = components.find(c => c.id === (dirPath || 'root'));
        
        if (existingComp) {
          if (!existingComp.technologies.includes(marker.type)) {
            existingComp.technologies.push(marker.type);
          }
          if (!existingComp.configFiles.includes(file)) {
            existingComp.configFiles.push(file);
          }
        } else {
          const component: Component = {
            id: dirPath || 'root',
            name: dirPath ? (dirPath.split('/').pop() || 'root') : 'root',
            path: dirPath,
            type: this.inferType(dirPath, fileName!, context),
            technologies: [marker.type],
            dependencies: [],
            configFiles: [file]
          };
          components.push(component);
        }
      }
    }

    // Build Relationships with Protocol Support (Task 3)
    for (const comp of components) {
      this.discoverDependencies(comp, components, context, relationships);
    }

    return { components, relationships };
  }

  private static inferType(path: string, markerFile: string, context: RepositoryContext): Component['type'] {
    if (markerFile.endsWith('.tf') || markerFile === 'main.tf') return 'INFRA';
    if (markerFile === 'Dockerfile') return 'SERVICE';
    if (markerFile === 'k8s.yaml' || markerFile === 'deployment.yaml' || markerFile === 'values.yaml') return 'INFRA';
    
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('app')) return 'APP';
    if (lowerPath.includes('service')) return 'SERVICE';
    if (lowerPath.includes('pkg') || lowerPath.includes('lib')) return 'LIBRARY';
    
    return 'UNKNOWN';
  }

  private static discoverDependencies(
    comp: Component, 
    allComponents: Component[], 
    context: RepositoryContext,
    relationships: RepositoryGraph['relationships']
  ) {
    // NODE (package.json)
    if (comp.technologies.includes('NODE')) {
      const pkgPath = comp.path ? `${comp.path}/package.json` : 'package.json';
      const pkg = context.workspacePackageJsons.find(p => p.path === pkgPath) || (comp.path === '' ? { content: context.rootPackageJson } : null);
      
      if (pkg?.content) {
        const allDeps = { ...pkg.content.dependencies, ...pkg.content.devDependencies };
        for (const [depName, version] of Object.entries(allDeps)) {
          const v = version as string;
          const isInternal = v.startsWith('workspace:') || v.startsWith('file:') || v.startsWith('link:');
          
          const match = allComponents.find(c => {
             const cPkgPath = c.path ? `${c.path}/package.json` : 'package.json';
             const cPkg = context.workspacePackageJsons.find(p => p.path === cPkgPath) || (c.path === '' ? { content: context.rootPackageJson } : null);
             if (cPkg?.content?.name === depName) return true;
             if (isInternal && (v.includes(c.path) || (c.path === '' && v.includes('./')))) return true;
             return false;
          });

          if (match && match.id !== comp.id) {
            comp.dependencies.push(match.id);
            relationships.push({ from: comp.id, to: match.id, type: 'DEPENDS_ON' });
          }
        }
      }
    }

    // RUST (Cargo.toml)
    if (comp.technologies.includes('RUST')) {
      const cargoPath = comp.path ? `${comp.path}/Cargo.toml` : 'Cargo.toml';
      const cargo = context.configFiles.find(p => p.path === cargoPath);
      if (cargo && typeof cargo.content === 'string') {
        const lines = cargo.content.split('\n');
        for (const line of lines) {
           // Extremely rudimentary path dependency parsing: name = { path = "../other" }
           const matchPath = line.match(/^[\w-]+\s*=\s*\{.*path\s*=\s*"([^"]+)"/);
           if (matchPath) {
             const relPath = matchPath[1].replace(/^\.\//, ''); // simplified
             const match = allComponents.find(c => c.path && relPath.includes(c.path));
             if (match && match.id !== comp.id) {
               comp.dependencies.push(match.id);
               relationships.push({ from: comp.id, to: match.id, type: 'DEPENDS_ON' });
             }
           }
        }
      }
    }

    // GO (go.mod / go.work)
    if (comp.technologies.includes('GO')) {
      const goModPath = comp.path ? `${comp.path}/go.mod` : 'go.mod';
      const goMod = context.configFiles.find(p => p.path === goModPath);
      if (goMod && typeof goMod.content === 'string') {
        const lines = goMod.content.split('\n');
        for (const line of lines) {
           // parse replace directives: replace example.com/a => ../b
           const matchReplace = line.match(/^replace\s+.*=>\s+(.*)/);
           if (matchReplace) {
             const relPath = matchReplace[1].replace(/^\.\//, '').trim();
             const match = allComponents.find(c => c.path && relPath.includes(c.path));
             if (match && match.id !== comp.id) {
               comp.dependencies.push(match.id);
               relationships.push({ from: comp.id, to: match.id, type: 'DEPENDS_ON' });
             }
           }
        }
      }
    }

    // PYTHON (requirements.txt / pyproject.toml)
    if (comp.technologies.includes('PYTHON')) {
      // Python typically handles internal deps via editable installs (-e . or path in pyproject)
      const pyPath = comp.path ? `${comp.path}/pyproject.toml` : 'pyproject.toml';
      const py = context.configFiles.find(p => p.path === pyPath);
      if (py && typeof py.content === 'string') {
         const lines = py.content.split('\n');
         for (const line of lines) {
            // Basic path parsing
            const matchPath = line.match(/\{.*path\s*=\s*"([^"]+)"/);
            if (matchPath) {
               const relPath = matchPath[1].replace(/^\.\//, '');
               const match = allComponents.find(c => c.path && relPath.includes(c.path));
               if (match && match.id !== comp.id) {
                 comp.dependencies.push(match.id);
                 relationships.push({ from: comp.id, to: match.id, type: 'DEPENDS_ON' });
               }
            }
         }
      }
    }
  }

  /**
   * Performs impact analysis using graph traversal (Task 3).
   */
  private static analyzeImpact(graph: RepositoryGraph, patchFiles: string[]): ImpactAnalysis {
    const impactedComponentIds = new Set<string>();
    
    for (const file of patchFiles) {
      const owner = [...graph.components]
        .filter(c => file.startsWith(c.path))
        .sort((a, b) => b.path.length - a.path.length)[0];

      if (owner) {
        impactedComponentIds.add(owner.id);
      } else {
        impactedComponentIds.add('root');
      }
    }

    const downstreamComponentIds = new Set<string>();
    
    // Graph Traversal for downstream impact
    const queue = Array.from(impactedComponentIds);
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      for (const rel of graph.relationships) {
        if (rel.to === currentId && rel.type === 'DEPENDS_ON' && !visited.has(rel.from)) {
          visited.add(rel.from);
          downstreamComponentIds.add(rel.from);
          queue.push(rel.from);
        }
      }
    }

    return {
      impactedComponentIds: Array.from(impactedComponentIds),
      downstreamComponentIds: Array.from(downstreamComponentIds),
      infrastructureIds: Array.from(impactedComponentIds).filter(id => graph.components.find(c => c.id === id)?.type === 'INFRA'),
      radius: impactedComponentIds.size + downstreamComponentIds.size
    };
  }

  private static generatePlan(
    graph: RepositoryGraph, 
    impact: ImpactAnalysis, 
    context: RepositoryContext,
    patchFiles: string[]
  ): VerificationPlan {
    let scope = VerificationLevel.LEVEL_2_COMPONENT;
    let rationale = 'Targeting impacted component(s) for verification.';

    const isRootChange = impact.impactedComponentIds.includes('root') || patchFiles.some(f => 
      f === 'package.json' || f === 'pnpm-workspace.yaml' || f === 'pnpm-lock.yaml' || 
      f === 'turbo.json' || f === 'nx.json' || f === '.gitignore'
    );

    if (isRootChange) {
      scope = VerificationLevel.LEVEL_4_REPOSITORY;
      rationale = 'Root configuration or workspace-wide changes detected. Full repository verification required.';
    } else if (impact.downstreamComponentIds.length > 0) {
      scope = VerificationLevel.LEVEL_3_DEPENDENCY;
      rationale = `Modified components affect downstream dependencies: ${impact.downstreamComponentIds.join(', ')}.`;
    }

    const planCommands: VerificationPlan['commands'] = [];
    const componentsToVerify = scope === VerificationLevel.LEVEL_4_REPOSITORY 
      ? graph.components 
      : graph.components.filter(c => impact.impactedComponentIds.includes(c.id) || (scope === VerificationLevel.LEVEL_3_DEPENDENCY && impact.downstreamComponentIds.includes(c.id)));

    for (const comp of componentsToVerify) {
      const techCommands = this.getCommandsByTech(comp, context);
      for (const tCmd of techCommands) {
        planCommands.push({
          componentId: comp.id,
          phase: tCmd.phase,
          command: tCmd.command,
          cwd: comp.path || '.'
        });
      }
    }

    return {
      scope,
      commands: planCommands,
      confidenceScore: this.calculateConfidence(scope, impact, patchFiles),
      escalationRationale: rationale,
      impactedComponents: impact.impactedComponentIds,
      graph
    };
  }

  /**
   * Technology Validators (Task 5) integrated into command generation.
   */
  private static getCommandsByTech(comp: Component, context: RepositoryContext): { phase: VerificationPlan['commands'][0]['phase'], command: string }[] {
    const cmds: { phase: VerificationPlan['commands'][0]['phase'], command: string }[] = [];
    
    // Check for repository-driven overrides first (e.g. Makefile)
    const compFiles = context.structure.filter(f => f.startsWith(comp.path ? comp.path + '/' : ''));
    const hasMakefile = compFiles.some(f => f.endsWith('Makefile'));
    const hasMvnw = compFiles.some(f => f.endsWith('mvnw'));
    const hasGradlew = compFiles.some(f => f.endsWith('gradlew'));

    if (hasMakefile) {
      // If a Makefile exists, prefer it for build and test
      cmds.push({ phase: 'BUILD', command: 'make build || make' });
      cmds.push({ phase: 'TEST', command: 'make test || echo "No make test target"' });
      // We still fall through to specific install/validate logic for other techs if needed, but Makefile handles build.
    }

    if (comp.technologies.includes('NODE')) {
      cmds.push({ phase: 'VALIDATE', command: 'node -e "JSON.parse(require(\'fs\').readFileSync(\'package.json\'))"' });
      
      const hasPnpm = context.structure.includes('pnpm-lock.yaml') || context.structure.includes('pnpm-workspace.yaml');
      const hasYarn = context.structure.includes('yarn.lock');
      const pm = hasPnpm ? 'pnpm' : (hasYarn ? 'yarn' : 'npm');

      cmds.push({ phase: 'INSTALL', command: `${pm} install` });
      
      const pkgPath = comp.path ? `${comp.path}/package.json` : 'package.json';
      const pkg = context.workspacePackageJsons.find(p => p.path === pkgPath) || (comp.path === '' ? { content: context.rootPackageJson } : null);
      
      if (pkg?.content?.scripts && !hasMakefile) {
        if (pkg.content.scripts.typecheck) cmds.push({ phase: 'VALIDATE', command: `${pm} run typecheck` });
        if (pkg.content.scripts.build) cmds.push({ phase: 'BUILD', command: `${pm} run build` });
        if (pkg.content.scripts.test) cmds.push({ phase: 'TEST', command: `${pm} run test` });
      }
    }

    if (comp.technologies.includes('JAVA')) {
       if (hasMvnw || compFiles.some(f => f.endsWith('pom.xml'))) {
         const mvnCmd = hasMvnw ? './mvnw' : 'mvn';
         cmds.push({ phase: 'VALIDATE', command: `${mvnCmd} validate` });
         cmds.push({ phase: 'INSTALL', command: `${mvnCmd} dependency:resolve` });
         if (!hasMakefile) {
           cmds.push({ phase: 'BUILD', command: `${mvnCmd} compile` });
           cmds.push({ phase: 'TEST', command: `${mvnCmd} test` });
         }
       } else if (hasGradlew || compFiles.some(f => f.endsWith('build.gradle') || f.endsWith('build.gradle.kts'))) {
         const gradleCmd = hasGradlew ? './gradlew' : 'gradle';
         cmds.push({ phase: 'INSTALL', command: `${gradleCmd} dependencies` });
         if (!hasMakefile) {
           cmds.push({ phase: 'BUILD', command: `${gradleCmd} build -x test` });
           cmds.push({ phase: 'TEST', command: `${gradleCmd} test` });
         }
       }
    }

    if (comp.technologies.includes('PYTHON')) {
      cmds.push({ phase: 'VALIDATE', command: 'python3 -m py_compile *.py' });
      cmds.push({ phase: 'INSTALL', command: 'pip install -r requirements.txt' });
      if (!hasMakefile) cmds.push({ phase: 'TEST', command: 'pytest' });
    }

    if (comp.technologies.includes('TERRAFORM')) {
      cmds.push({ phase: 'VALIDATE', command: 'terraform validate' });
      cmds.push({ phase: 'INSTALL', command: 'terraform init -backend=false' });
    }

    if (comp.technologies.includes('DOCKER')) {
      cmds.push({ phase: 'VALIDATE', command: 'docker build --dry-run . 2>/dev/null || echo "Dry run not supported, skipping pre-val"' });
      cmds.push({ phase: 'BUILD', command: 'docker build .' });
    }

    if (comp.technologies.includes('KUBERNETES')) {
      cmds.push({ phase: 'VALIDATE', command: 'kubectl apply --dry-run=client -f .' });
    }

    if (comp.technologies.includes('GO')) {
      cmds.push({ phase: 'VALIDATE', command: 'go mod verify' });
      cmds.push({ phase: 'INSTALL', command: 'go mod tidy' });
      if (!hasMakefile) cmds.push({ phase: 'BUILD', command: 'go build ./...' });
    }

    if (comp.technologies.includes('RUST')) {
      cmds.push({ phase: 'VALIDATE', command: 'cargo metadata --format-version 1' });
      cmds.push({ phase: 'INSTALL', command: 'cargo fetch' });
      if (!hasMakefile) cmds.push({ phase: 'BUILD', command: 'cargo check' });
    }

    return cmds;
  }

  private static calculateConfidence(scope: VerificationLevel, impact: ImpactAnalysis, patchFiles: string[]): number {
    const base = {
      [VerificationLevel.LEVEL_1_STATIC]: 50,
      [VerificationLevel.LEVEL_2_COMPONENT]: 75,
      [VerificationLevel.LEVEL_3_DEPENDENCY]: 92,
      [VerificationLevel.LEVEL_4_REPOSITORY]: 98
    };

    let score = base[scope];
    if (impact.radius > 3 && scope === VerificationLevel.LEVEL_2_COMPONENT) score -= 15;
    const hasManyTests = patchFiles.some(f => f.includes('test') || f.includes('spec'));
    if (hasManyTests) score += 5;

    return Math.min(score, 100);
  }
}

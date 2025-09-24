import { TECH_COMPATIBILITY, checkCompatibility } from '../data/techStackData';
import { ProjectConfig } from '../types/project';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export class ProjectValidator {
  validateProjectConfig(config: ProjectConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Validate basic information
    this.validateBasicInfo(config, errors, warnings);
    
    // Validate tech stack
    this.validateTechStack(config.techStack, errors, warnings, suggestions);
    
    // Structure validation not needed for new config
    // this.validateStructure(config.structure, config.techStack, warnings, suggestions);
    
    // Validate goals
    this.validateGoals(config.goals || [], warnings, suggestions);
    
    // Validate testing configuration
    this.validateTesting(config.testingStrategy, config.techStack, warnings, suggestions);
    
    // Validate architecture
    this.validateArchitecture(config.architecture, config.techStack, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private validateBasicInfo(
    config: ProjectConfig,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    // Name validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Project name is required',
        severity: 'error'
      });
    } else if (config.name.length < 3) {
      errors.push({
        field: 'name',
        message: 'Project name must be at least 3 characters',
        severity: 'error'
      });
    } else if (!/^[a-zA-Z0-9-_]+$/.test(config.name)) {
      warnings.push({
        field: 'name',
        message: 'Project name contains special characters',
        suggestion: 'Use only letters, numbers, hyphens, and underscores'
      });
    }

    // Path validation
    if (!config.path || config.path.trim().length === 0) {
      errors.push({
        field: 'path',
        message: 'Project path is required',
        severity: 'error'
      });
    } else if (!config.path.startsWith('/')) {
      warnings.push({
        field: 'path',
        message: 'Project path should be absolute',
        suggestion: 'Use an absolute path starting with /'
      });
    }

    // Description validation
    if (!config.description || config.description.trim().length < 10) {
      warnings.push({
        field: 'description',
        message: 'Description is too short',
        suggestion: 'Add a more detailed description to help agents understand the project'
      });
    }
  }

  private validateTechStack(
    techStack: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: string[]
  ) {
    if (!techStack || techStack.length === 0) {
      errors.push({
        field: 'techStack',
        message: 'At least one technology must be selected',
        severity: 'error'
      });
      return;
    }

    // Check compatibility
    const compatibilityResult = checkCompatibility(techStack);
    if (!compatibilityResult.compatible) {
      compatibilityResult.warnings.forEach(warning => {
        errors.push({
          field: 'techStack',
          message: warning,
          severity: 'critical'
        });
      });
    }

    // Add compatibility suggestions
    suggestions.push(...compatibilityResult.suggestions);

    // Check for missing essentials
    const hasFrontend = techStack.some(t => 
      ['React', 'Vue.js', 'Angular', 'Svelte'].includes(t)
    );
    const hasBackend = techStack.some(t => 
      ['Express', 'Django', 'FastAPI', 'Rails'].includes(t)
    );
    const hasDatabase = techStack.some(t => 
      ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite'].includes(t)
    );

    if (hasFrontend && hasBackend && !hasDatabase) {
      warnings.push({
        field: 'techStack',
        message: 'No database selected for full-stack application',
        suggestion: 'Consider adding PostgreSQL or MongoDB'
      });
    }

    // Check for deprecated technologies
    const deprecated = ['AngularJS', 'Bower', 'Grunt'];
    techStack.forEach(tech => {
      if (deprecated.includes(tech)) {
        warnings.push({
          field: 'techStack',
          message: `${tech} is deprecated`,
          suggestion: `Consider using a modern alternative`
        });
      }
    });
  }

  private validateStructure(
    structure: { directories: string[]; entryPoint: string },
    techStack: string[],
    warnings: ValidationWarning[],
    suggestions: string[]
  ) {
    if (!structure.entryPoint) {
      warnings.push({
        field: 'structure.entryPoint',
        message: 'No entry point specified',
        suggestion: 'Specify the main file (e.g., src/index.ts, main.py)'
      });
    }

    // Suggest common directories based on tech stack
    const suggestedDirs: string[] = [];
    
    if (techStack.includes('React') || techStack.includes('Vue.js')) {
      suggestedDirs.push('src', 'public', 'tests');
    }
    
    if (techStack.includes('Express') || techStack.includes('Django')) {
      suggestedDirs.push('src', 'tests', 'migrations', 'config');
    }
    
    const missingDirs = suggestedDirs.filter(dir => 
      !structure.directories.includes(dir)
    );
    
    if (missingDirs.length > 0) {
      suggestions.push(`Consider adding these directories: ${missingDirs.join(', ')}`);
    }
  }

  private validateGoals(
    goals: any[],
    warnings: ValidationWarning[],
    suggestions: string[]
  ) {
    if (!goals || goals.length === 0) {
      warnings.push({
        field: 'goals',
        message: 'No project goals defined',
        suggestion: 'Add at least 3-5 goals to guide development'
      });
    } else if (goals.length < 3) {
      suggestions.push('Consider adding more specific goals for better project guidance');
    }

    // Check for vague goals
    const vagueTerms = ['make', 'create', 'build', 'do'];
    goals.forEach((goal, index) => {
      const goalText = goal.text || goal.description || '';
      if (goalText.length < 20) {
        warnings.push({
          field: `goals[${index}]`,
          message: 'Goal description is too vague',
          suggestion: 'Be more specific about what needs to be accomplished'
        });
      }
    });

    // Check priority distribution
    const highPriorityCount = goals.filter(g => g.priority === 'high').length;
    if (highPriorityCount > goals.length * 0.6) {
      suggestions.push('Too many high-priority goals. Consider prioritizing more strategically');
    }
  }

  private validateTesting(
    testing: any,
    techStack: string[],
    warnings: ValidationWarning[],
    suggestions: string[]
  ) {
    if (!testing) return;
    
    const frameworks = testing.frameworks || testing.testFrameworks || [];
    const coverage = testing.unitTestCoverage || testing.coverage || 0;
    
    if (frameworks.length === 0 && !testing.framework) {
      warnings.push({
        field: 'testing.framework',
        message: 'No testing framework specified',
        suggestion: this.suggestTestFramework(techStack)
      });
    }

    if (coverage < 60) {
      warnings.push({
        field: 'testing.coverage',
        message: 'Test coverage target is low',
        suggestion: 'Consider setting coverage target to at least 70%'
      });
    } else if (coverage > 95) {
      warnings.push({
        field: 'testing.coverage',
        message: 'Test coverage target might be unrealistic',
        suggestion: '80-90% is often a good balance'
      });
    }
  }

  private validateArchitecture(
    architecture: any,
    techStack: string[],
    warnings: ValidationWarning[]
  ) {
    if (!architecture) return;
    
    const pattern = architecture.pattern || architecture.type;
    const components = architecture.components || architecture.features || [];
    
    if (!pattern) {
      warnings.push({
        field: 'architecture.type',
        message: 'Architecture pattern not specified',
        suggestion: 'Choose an architecture pattern (e.g., monolithic, microservices, layered)'
      });
    }

    if (components.length === 0) {
      warnings.push({
        field: 'architecture.components',
        message: 'No architectural components defined',
        suggestion: 'Define key components of your system'
      });
    }

    // Check architecture compatibility with tech stack
    if (pattern === 'microservices' && !techStack.includes('Docker')) {
      warnings.push({
        field: 'architecture.type',
        message: 'Microservices without containerization',
        suggestion: 'Consider adding Docker for microservices deployment'
      });
    }
  }

  private suggestTestFramework(techStack: string[]): string {
    if (techStack.includes('React')) return 'Consider using Jest with React Testing Library';
    if (techStack.includes('Vue.js')) return 'Consider using Vitest or Jest';
    if (techStack.includes('Angular')) return 'Consider using Jasmine and Karma';
    if (techStack.includes('Python')) return 'Consider using Pytest';
    if (techStack.includes('Django')) return 'Consider using Django Test or Pytest-django';
    if (techStack.includes('Express')) return 'Consider using Jest or Mocha';
    return 'Choose a testing framework appropriate for your tech stack';
  }

  checkForMissingDependencies(techStack: string[]): string[] {
    const missing: string[] = [];

    // Check for common missing dependencies
    if (techStack.includes('React') && !techStack.includes('React Router')) {
      missing.push('React Router (for navigation)');
    }

    if (techStack.includes('Express') && !techStack.some(t => t.includes('body-parser') || t.includes('cors'))) {
      missing.push('CORS middleware');
    }

    if ((techStack.includes('PostgreSQL') || techStack.includes('MySQL')) && 
        !techStack.some(t => ['Prisma', 'TypeORM', 'Sequelize', 'SQLAlchemy'].includes(t))) {
      missing.push('ORM/Database client');
    }

    if (techStack.some(t => ['React', 'Vue.js', 'Angular'].includes(t)) && 
        !techStack.some(t => ['Axios', 'Fetch', 'SWR', 'React Query'].includes(t))) {
      missing.push('HTTP client for API calls');
    }

    return missing;
  }

  estimateComplexity(config: ProjectConfig): {
    score: number;
    level: 'simple' | 'moderate' | 'complex' | 'very-complex';
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // Tech stack complexity
    if (config.techStack.length > 10) {
      score += 3;
      factors.push('Large tech stack');
    } else if (config.techStack.length > 5) {
      score += 2;
    } else {
      score += 1;
    }

    // Architecture complexity
    if (config.architecture.pattern === 'microservices') {
      score += 3;
      factors.push('Microservices architecture');
    } else if (config.architecture.pattern === 'serverless') {
      score += 2;
      factors.push('Serverless architecture');
    }

    // Goals complexity
    if (config.goals && config.goals.length > 10) {
      score += 2;
      factors.push('Many project goals');
    }

    // Testing requirements
    if (config.testingStrategy && config.testingStrategy.unitTestCoverage > 85) {
      score += 1;
      factors.push('High test coverage requirement');
    }

    // Real-time features
    if (config.techStack.includes('Socket.io') || config.techStack.includes('WebRTC')) {
      score += 2;
      factors.push('Real-time features');
    }

    // Database complexity
    const databases = config.techStack.filter(t => 
      ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra'].includes(t)
    );
    if (databases.length > 1) {
      score += 2;
      factors.push('Multiple databases');
    }

    // Determine level
    let level: 'simple' | 'moderate' | 'complex' | 'very-complex';
    if (score <= 3) level = 'simple';
    else if (score <= 6) level = 'moderate';
    else if (score <= 9) level = 'complex';
    else level = 'very-complex';

    return { score, level, factors };
  }
}
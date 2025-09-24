import { PROJECT_TEMPLATES } from '../data/projectTemplates';
import { TECH_STACK_PRESETS, TECH_CATEGORIES, getSuggestedTechnologies } from '../data/techStackData';
import { EXAMPLE_PROJECTS, getSimilarProjects } from '../data/exampleProjects';

export interface Suggestion {
  type: 'template' | 'tech' | 'structure' | 'goal' | 'testing' | 'architecture';
  title: string;
  description: string;
  action?: () => void;
  confidence: number; // 0-100
}

export interface ProjectContext {
  projectType?: string;
  description?: string;
  techStack: string[];
  experience?: 'beginner' | 'intermediate' | 'advanced';
  timeline?: 'quick' | 'standard' | 'long-term';
  teamSize?: 'solo' | 'small' | 'large';
}

export class SmartSuggestionEngine {
  /**
   * Suggest a complete tech stack based on project type and requirements
   */
  suggestTechStack(projectType: string, context?: Partial<ProjectContext>): string[] {
    const suggestions: string[] = [];
    
    // Start with base suggestions for project type
    switch (projectType) {
      case 'web':
        suggestions.push('React', 'TypeScript', 'TailwindCSS');
        if (!context?.experience || context.experience !== 'beginner') {
          suggestions.push('Next.js');
        }
        break;
      
      case 'api':
        if (context?.techStack?.includes('Python')) {
          suggestions.push('FastAPI', 'SQLAlchemy', 'PostgreSQL');
        } else {
          suggestions.push('Express', 'TypeScript', 'PostgreSQL', 'Prisma');
        }
        break;
      
      case 'mobile':
        suggestions.push('React Native', 'TypeScript', 'Expo');
        break;
      
      case 'desktop':
        suggestions.push('Electron', 'React', 'TypeScript');
        break;
      
      case 'cli':
        suggestions.push('Node.js', 'TypeScript', 'Commander.js', 'Inquirer');
        break;
      
      case 'ml':
        suggestions.push('Python', 'TensorFlow', 'Pandas', 'NumPy', 'Jupyter');
        break;
    }
    
    // Add testing framework
    if (suggestions.includes('React')) {
      suggestions.push('Jest', 'React Testing Library');
    } else if (suggestions.includes('Python')) {
      suggestions.push('Pytest');
    } else {
      suggestions.push('Jest');
    }
    
    // Add development tools
    suggestions.push('ESLint', 'Prettier');
    if (suggestions.includes('TypeScript')) {
      suggestions.push('ts-node');
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Suggest test framework based on tech stack
   */
  suggestTestFramework(techStack: string[]): string {
    if (techStack.includes('React')) {
      if (techStack.includes('Vite')) return 'Vitest';
      return 'Jest';
    }
    if (techStack.includes('Vue.js')) return 'Vitest';
    if (techStack.includes('Angular')) return 'Jasmine';
    if (techStack.includes('Python')) return 'Pytest';
    if (techStack.includes('Django')) return 'Django Test';
    if (techStack.includes('Ruby')) return 'RSpec';
    if (techStack.includes('Java')) return 'JUnit';
    if (techStack.includes('C#')) return 'NUnit';
    return 'Jest'; // Default
  }

  /**
   * Suggest architecture based on project requirements
   */
  suggestArchitecture(
    projectType: string,
    size: 'small' | 'medium' | 'large',
    techStack: string[]
  ): {
    type: string;
    components: string[];
    rationale: string;
  } {
    // Small projects
    if (size === 'small') {
      if (projectType === 'web') {
        return {
          type: 'component-based',
          components: ['UI Components', 'Services', 'Utils'],
          rationale: 'Simple structure for maintainability'
        };
      }
      if (projectType === 'api') {
        return {
          type: 'layered',
          components: ['Routes', 'Controllers', 'Services', 'Models'],
          rationale: 'Clear separation of concerns'
        };
      }
    }
    
    // Medium projects
    if (size === 'medium') {
      if (projectType === 'web' && techStack.includes('React')) {
        return {
          type: 'feature-based',
          components: ['Features', 'Shared Components', 'Services', 'State Management'],
          rationale: 'Scalable structure with feature isolation'
        };
      }
      if (projectType === 'api') {
        return {
          type: 'clean-architecture',
          components: ['API Layer', 'Use Cases', 'Domain', 'Infrastructure'],
          rationale: 'Testable and maintainable architecture'
        };
      }
    }
    
    // Large projects
    if (size === 'large') {
      if (techStack.includes('Docker')) {
        return {
          type: 'microservices',
          components: ['API Gateway', 'Services', 'Message Queue', 'Databases'],
          rationale: 'Scalable microservices for large teams'
        };
      }
      return {
        type: 'modular-monolith',
        components: ['Modules', 'Shared Kernel', 'Infrastructure', 'API'],
        rationale: 'Monolith with clear boundaries for easier management'
      };
    }
    
    // Default
    return {
      type: 'mvc',
      components: ['Models', 'Views', 'Controllers'],
      rationale: 'Classic MVC pattern'
    };
  }

  /**
   * Get contextual suggestions based on current project state
   */
  getContextualSuggestions(context: ProjectContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Suggest templates if no tech stack
    if (context.techStack.length === 0 && context.projectType) {
      const templates = Object.values(PROJECT_TEMPLATES)
        .filter(t => t.category === context.projectType)
        .slice(0, 3);
      
      templates.forEach(template => {
        suggestions.push({
          type: 'template',
          title: `Use ${template.name} template`,
          description: template.description,
          confidence: template.popularityScore
        });
      });
    }
    
    // Suggest missing technologies
    const missingTech = getSuggestedTechnologies(
      context.projectType || 'web',
      context.techStack
    );
    
    missingTech.slice(0, 3).forEach(tech => {
      suggestions.push({
        type: 'tech',
        title: `Add ${tech}`,
        description: this.getTechDescription(tech),
        confidence: 85
      });
    });
    
    // Suggest similar projects
    if (context.techStack.length > 2) {
      const similar = getSimilarProjects(context.techStack);
      if (similar.length > 0) {
        suggestions.push({
          type: 'structure',
          title: `Structure like ${similar[0].name}`,
          description: `Similar project with proven architecture`,
          confidence: 75
        });
      }
    }
    
    // Suggest goals based on project type
    if (context.projectType) {
      const goalSuggestions = this.suggestGoals(context.projectType, context.techStack);
      goalSuggestions.slice(0, 2).forEach(goal => {
        suggestions.push({
          type: 'goal',
          title: goal.title,
          description: goal.description,
          confidence: 70
        });
      });
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Suggest project goals based on type and stack
   */
  suggestGoals(projectType: string, techStack: string[]): Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const goals = [];
    
    // Common goals
    goals.push({
      title: 'Set up development environment',
      description: 'Configure development tools, linting, and formatting',
      priority: 'high' as const
    });
    
    goals.push({
      title: 'Implement CI/CD pipeline',
      description: 'Set up automated testing and deployment',
      priority: 'medium' as const
    });
    
    // Type-specific goals
    if (projectType === 'web') {
      goals.push({
        title: 'Implement responsive design',
        description: 'Ensure application works on all device sizes',
        priority: 'high' as const
      });
      
      if (techStack.includes('React') || techStack.includes('Vue.js')) {
        goals.push({
          title: 'Set up state management',
          description: 'Implement global state management solution',
          priority: 'high' as const
        });
      }
    }
    
    if (projectType === 'api') {
      goals.push({
        title: 'Implement authentication',
        description: 'Set up secure authentication and authorization',
        priority: 'high' as const
      });
      
      goals.push({
        title: 'Add API documentation',
        description: 'Generate comprehensive API documentation',
        priority: 'medium' as const
      });
    }
    
    if (techStack.includes('PostgreSQL') || techStack.includes('MySQL')) {
      goals.push({
        title: 'Design database schema',
        description: 'Create optimized database structure with indexes',
        priority: 'high' as const
      });
    }
    
    if (techStack.includes('Docker')) {
      goals.push({
        title: 'Containerize application',
        description: 'Create Docker configuration for all services',
        priority: 'medium' as const
      });
    }
    
    return goals;
  }

  /**
   * Recommend learning resources based on tech stack
   */
  recommendResources(techStack: string[]): Array<{
    title: string;
    type: 'documentation' | 'tutorial' | 'course' | 'example';
    url: string;
    relevance: number;
  }> {
    const resources = [];
    
    techStack.forEach(tech => {
      // Add official documentation
      const docUrl = this.getDocumentationUrl(tech);
      if (docUrl) {
        resources.push({
          title: `${tech} Documentation`,
          type: 'documentation' as const,
          url: docUrl,
          relevance: 100
        });
      }
      
      // Add learning resources
      const learningResource = this.getLearningResource(tech);
      if (learningResource) {
        resources.push({
          ...learningResource,
          relevance: 80
        });
      }
    });
    
    // Add general resources
    if (techStack.includes('React')) {
      resources.push({
        title: 'React Patterns',
        type: 'tutorial' as const,
        url: 'https://reactpatterns.com',
        relevance: 70
      });
    }
    
    return resources.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Analyze requirements text and suggest configuration
   */
  analyzeRequirements(description: string): {
    suggestedType: string;
    suggestedStack: string[];
    suggestedFeatures: string[];
    confidence: number;
  } {
    const lower = description.toLowerCase();
    let projectType = 'web';
    const stack: string[] = [];
    const features: string[] = [];
    let confidence = 60;
    
    // Detect project type
    if (lower.includes('api') || lower.includes('backend') || lower.includes('service')) {
      projectType = 'api';
      confidence += 10;
    } else if (lower.includes('mobile') || lower.includes('app')) {
      projectType = 'mobile';
      confidence += 10;
    } else if (lower.includes('cli') || lower.includes('command')) {
      projectType = 'cli';
      confidence += 10;
    } else if (lower.includes('desktop')) {
      projectType = 'desktop';
      confidence += 10;
    }
    
    // Detect technologies
    if (lower.includes('react')) {
      stack.push('React');
      confidence += 5;
    }
    if (lower.includes('node') || lower.includes('express')) {
      stack.push('Node.js', 'Express');
      confidence += 5;
    }
    if (lower.includes('python')) {
      stack.push('Python');
      if (lower.includes('django')) stack.push('Django');
      else if (lower.includes('fast')) stack.push('FastAPI');
      confidence += 5;
    }
    
    // Detect features
    if (lower.includes('real-time') || lower.includes('realtime') || lower.includes('chat')) {
      features.push('real-time');
      stack.push('Socket.io');
    }
    if (lower.includes('auth') || lower.includes('login') || lower.includes('user')) {
      features.push('authentication');
    }
    if (lower.includes('database') || lower.includes('data')) {
      features.push('database');
      if (!stack.some(t => ['PostgreSQL', 'MySQL', 'MongoDB'].includes(t))) {
        stack.push('PostgreSQL');
      }
    }
    
    // Add TypeScript if modern stack
    if (stack.includes('React') || stack.includes('Node.js')) {
      stack.push('TypeScript');
    }
    
    return {
      suggestedType: projectType,
      suggestedStack: [...new Set(stack)],
      suggestedFeatures: features,
      confidence: Math.min(confidence, 95)
    };
  }

  private getTechDescription(tech: string): string {
    const descriptions: Record<string, string> = {
      'React': 'Popular library for building user interfaces',
      'TypeScript': 'Adds type safety to JavaScript',
      'Express': 'Fast web framework for Node.js',
      'PostgreSQL': 'Advanced relational database',
      'Docker': 'Container platform for deployment',
      'Jest': 'JavaScript testing framework',
      'TailwindCSS': 'Utility-first CSS framework'
    };
    return descriptions[tech] || `Add ${tech} to your stack`;
  }

  private getDocumentationUrl(tech: string): string | null {
    const urls: Record<string, string> = {
      'React': 'https://react.dev',
      'Vue.js': 'https://vuejs.org',
      'Angular': 'https://angular.io',
      'TypeScript': 'https://www.typescriptlang.org',
      'Node.js': 'https://nodejs.org',
      'Express': 'https://expressjs.com',
      'Django': 'https://www.djangoproject.com',
      'FastAPI': 'https://fastapi.tiangolo.com',
      'PostgreSQL': 'https://www.postgresql.org',
      'MongoDB': 'https://www.mongodb.com/docs'
    };
    return urls[tech] || null;
  }

  private getLearningResource(tech: string): any | null {
    const resources: Record<string, any> = {
      'React': {
        title: 'React Tutorial',
        type: 'tutorial' as const,
        url: 'https://react.dev/learn'
      },
      'TypeScript': {
        title: 'TypeScript Handbook',
        type: 'tutorial' as const,
        url: 'https://www.typescriptlang.org/docs/handbook/'
      }
    };
    return resources[tech] || null;
  }
}
const EventEmitter = require('events');
const fs = require('fs').promises;

/**
 * GoalProcessor - Converts project goals into executable tasks
 */
class GoalProcessor extends EventEmitter {
  constructor(taskManager, logger) {
    super();
    this.taskManager = taskManager;
    this.logger = logger || console;
  }
  
  /**
   * Process project goals and create tasks
   */
  async processProjectGoals(projectId, goalsPath) {
    try {
      this.logger.info(`Processing goals for project ${projectId} from ${goalsPath}`);
      
      // Read goals file
      const goalsContent = await fs.readFile(goalsPath, 'utf8');
      const goalsData = JSON.parse(goalsContent);
      
      // Extract goals array (support both formats)
      const goals = Array.isArray(goalsData) ? goalsData : (goalsData.goals || []);
      
      const createdTasks = [];
      
      for (const goal of goals) {
        // Only process pending goals
        if (goal.status === 'pending' || !goal.status) {
          this.logger.info(`Processing goal: ${goal.id || 'unknown'} - ${goal.description}`);
          
          // Decompose goal into tasks
          const tasks = await this.decomposeGoal(goal, projectId);
          
          // Create tasks in TaskManager
          for (const taskData of tasks) {
            const task = this.taskManager.createTask({
              ...taskData,
              projectId,
              goalId: goal.id,
              metadata: { 
                source: 'goal_processor',
                goalDescription: goal.description
              }
            });
            createdTasks.push(task);
            this.logger.info(`Created task: ${task.id} - ${task.title}`);
          }
        }
      }
      
      this.logger.info(`Created ${createdTasks.length} tasks from ${goals.length} goals`);
      this.emit('goals:processed', { projectId, tasks: createdTasks });
      
      return createdTasks;
    } catch (error) {
      this.logger.error(`Failed to process goals: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Decompose a goal into actionable tasks
   */
  async decomposeGoal(goal, projectId) {
    const tasks = [];
    const goalText = (goal.description || '').toLowerCase();
    
    // Pattern matching for common development goals
    if (goalText.includes('authentication') || goalText.includes('auth') || goalText.includes('login')) {
      tasks.push(
        { 
          title: 'Design authentication flow and security model',
          description: 'Plan the authentication architecture, including user flow, session management, and security considerations',
          priority: 'high'
        },
        { 
          title: 'Implement user model and database schema',
          description: 'Create user table/collection with proper fields for authentication (username, email, password hash, etc.)',
          priority: 'high'
        },
        { 
          title: 'Create authentication API endpoints',
          description: 'Implement register, login, logout, and session validation endpoints',
          priority: 'high'
        },
        { 
          title: 'Add JWT token generation and validation',
          description: 'Implement secure token generation, signing, and verification logic',
          priority: 'high'
        },
        { 
          title: 'Write authentication tests',
          description: 'Create comprehensive test suite for all authentication flows and edge cases',
          priority: 'medium'
        },
        { 
          title: 'Add authentication middleware',
          description: 'Create middleware to protect routes and validate user sessions',
          priority: 'medium'
        }
      );
    } else if (goalText.includes('api') || goalText.includes('rest') || goalText.includes('endpoint')) {
      tasks.push(
        { 
          title: 'Design API structure and routes',
          description: 'Plan RESTful API architecture, endpoints, request/response formats',
          priority: 'high'
        },
        { 
          title: 'Implement core API endpoints',
          description: 'Create CRUD operations and business logic endpoints',
          priority: 'high'
        },
        { 
          title: 'Add request validation and sanitization',
          description: 'Implement input validation, type checking, and data sanitization',
          priority: 'medium'
        },
        { 
          title: 'Write API integration tests',
          description: 'Create tests for all endpoints, including success and error cases',
          priority: 'medium'
        },
        { 
          title: 'Create API documentation',
          description: 'Document all endpoints with examples using OpenAPI/Swagger',
          priority: 'low'
        }
      );
    } else if (goalText.includes('database') || goalText.includes('postgres') || goalText.includes('mysql') || goalText.includes('mongodb')) {
      tasks.push(
        { 
          title: 'Design database schema and relationships',
          description: 'Create entity relationship diagrams and define table structures',
          priority: 'high'
        },
        { 
          title: 'Set up database connection and configuration',
          description: 'Configure database driver, connection pooling, and environment variables',
          priority: 'high'
        },
        { 
          title: 'Create database migrations',
          description: 'Write migration scripts for schema creation and updates',
          priority: 'high'
        },
        { 
          title: 'Implement data models and ORM mappings',
          description: 'Create model classes with relationships and validation rules',
          priority: 'medium'
        },
        { 
          title: 'Add database seeding scripts',
          description: 'Create seed data for development and testing environments',
          priority: 'low'
        }
      );
    } else if (goalText.includes('test') || goalText.includes('coverage') || goalText.includes('quality')) {
      tasks.push(
        { 
          title: 'Set up testing framework and configuration',
          description: 'Configure Jest, Mocha, or appropriate testing framework',
          priority: 'high'
        },
        { 
          title: 'Write unit tests for core functionality',
          description: 'Create unit tests for all business logic and utility functions',
          priority: 'high'
        },
        { 
          title: 'Implement integration tests',
          description: 'Test component interactions and API endpoints',
          priority: 'medium'
        },
        { 
          title: 'Add coverage reporting',
          description: 'Configure code coverage tools and establish coverage thresholds',
          priority: 'medium'
        },
        { 
          title: 'Create CI/CD test pipeline',
          description: 'Set up automated testing in continuous integration',
          priority: 'low'
        }
      );
    } else if (goalText.includes('cache') || goalText.includes('redis') || goalText.includes('performance')) {
      tasks.push(
        { 
          title: 'Design caching strategy',
          description: 'Identify cacheable data, TTL policies, and invalidation strategies',
          priority: 'high'
        },
        { 
          title: 'Set up Redis or caching service',
          description: 'Install and configure caching service with proper connection handling',
          priority: 'high'
        },
        { 
          title: 'Implement cache layer',
          description: 'Add caching logic to data access layer with proper key management',
          priority: 'medium'
        },
        { 
          title: 'Add cache warming and invalidation',
          description: 'Create cache warming scripts and invalidation logic',
          priority: 'medium'
        },
        { 
          title: 'Monitor cache performance',
          description: 'Add metrics for cache hit/miss rates and performance impact',
          priority: 'low'
        }
      );
    } else if (goalText.includes('docker') || goalText.includes('container') || goalText.includes('deploy')) {
      tasks.push(
        { 
          title: 'Create Dockerfile for application',
          description: 'Write multi-stage Dockerfile with proper optimization',
          priority: 'high'
        },
        { 
          title: 'Set up docker-compose for local development',
          description: 'Create docker-compose.yml with all services and networking',
          priority: 'high'
        },
        { 
          title: 'Configure environment variables',
          description: 'Set up proper environment configuration for different stages',
          priority: 'medium'
        },
        { 
          title: 'Create deployment scripts',
          description: 'Write scripts for building, tagging, and pushing images',
          priority: 'medium'
        },
        { 
          title: 'Add health checks and monitoring',
          description: 'Implement container health checks and monitoring endpoints',
          priority: 'low'
        }
      );
    } else {
      // Generic breakdown for unrecognized goals
      tasks.push(
        { 
          title: `Analyze requirements: ${goal.description}`,
          description: `Research and plan implementation approach for ${goal.description}`,
          priority: goal.priority || 'medium'
        },
        { 
          title: `Implement: ${goal.description}`,
          description: `Build the core functionality for ${goal.description}`,
          priority: goal.priority || 'medium'
        },
        { 
          title: `Test: ${goal.description}`,
          description: `Write tests to verify ${goal.description} works correctly`,
          priority: 'medium'
        },
        { 
          title: `Document: ${goal.description}`,
          description: `Create documentation for ${goal.description}`,
          priority: 'low'
        }
      );
    }
    
    // Add dependencies between tasks (sequential by default)
    return tasks.map((task, index) => ({
      ...task,
      dependencies: index > 0 ? [] : [], // Start with no dependencies for parallel execution
      estimatedTime: this.estimateTaskTime(task.title)
    }));
  }
  
  /**
   * Estimate task completion time based on title
   */
  estimateTaskTime(title) {
    const titleLower = title.toLowerCase();
    
    // Complex tasks
    if (titleLower.includes('design') || titleLower.includes('architect') || titleLower.includes('plan')) {
      return 2 * 60 * 60 * 1000; // 2 hours
    }
    
    // Implementation tasks
    if (titleLower.includes('implement') || titleLower.includes('create') || titleLower.includes('build')) {
      return 3 * 60 * 60 * 1000; // 3 hours
    }
    
    // Testing tasks
    if (titleLower.includes('test') || titleLower.includes('validate')) {
      return 2 * 60 * 60 * 1000; // 2 hours
    }
    
    // Documentation tasks
    if (titleLower.includes('document') || titleLower.includes('write')) {
      return 1 * 60 * 60 * 1000; // 1 hour
    }
    
    // Default
    return 1.5 * 60 * 60 * 1000; // 1.5 hours
  }
}

module.exports = GoalProcessor;
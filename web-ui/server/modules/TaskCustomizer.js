const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ClaudeCliWrapper = require('../agents/ClaudeCliWrapper');
const ClaudeStructuredRequest = require('../agents/ClaudeStructuredRequest');
const ClaudeResponseProcessor = require('../agents/ClaudeResponseProcessor');

/**
 * TaskCustomizer - Generates project-specific tasks using Claude AI
 * Creates 15-20 customized tasks based on project context and requirements
 */
class TaskCustomizer {
  constructor(logger = console) {
    this.logger = logger;
    this.claudeWrapper = new ClaudeCliWrapper('task-customizer');
    this.requestBuilder = new ClaudeStructuredRequest(logger);
    this.responseProcessor = new ClaudeResponseProcessor(logger);
    
    // Let ClaudeCliWrapper handle Claude validation
    // We'll attempt to use Claude and fall back gracefully if it fails
    this.claudeAvailable = true;
  }

  /**
   * Generate customized tasks for a project using Claude with multi-step approach
   * @param {Object} project - The project configuration
   * @returns {Array} Array of 15-20 customized tasks
   */
  async generateCustomTasks(project) {
    this.logger.info('Generating customized tasks for project:', project.name);
    
    // Check if Claude is available
    if (!this.claudeAvailable) {
      this.logger.warn('Claude CLI not available, using enhanced fallback tasks');
      return this.createEnhancedDefaultTasks(project);
    }
    
    try {
      this.logger.info('Starting multi-step task generation process...');
      
      // Step 1: Establish project context
      this.logger.info('Step 1/5: Building project context...');
      try {
        await this.establishProjectContext(project);
        this.logger.info('Step 1/5: Successfully established project context');
      } catch (error) {
        this.logger.error('Step 1/5 failed:', error.message);
        throw error;
      }
      
      // Step 2: Analyze goals and requirements
      this.logger.info('Step 2/5: Analyzing goals and requirements...');
      try {
        await this.analyzeGoalsAndRequirements(project);
        this.logger.info('Step 2/5: Successfully analyzed goals');
      } catch (error) {
        this.logger.error('Step 2/5 failed:', error.message);
        throw error;
      }
      
      // Step 3: Map features to components
      this.logger.info('Step 3/5: Mapping features to components...');
      try {
        await this.mapFeaturesToComponents(project);
        this.logger.info('Step 3/5: Successfully mapped features');
      } catch (error) {
        this.logger.error('Step 3/5 failed:', error.message);
        throw error;
      }
      
      // Step 4: Generate tasks for each agent type in parallel
      this.logger.info('Step 4/5: Generating tasks for each agent type...');
      try {
        const [plannerTasks, coderTasks, testerTasks, reviewerTasks] = await Promise.all([
          this.generatePlannerTasks(project),
          this.generateCoderTasks(project),
          this.generateTesterTasks(project),
          this.generateReviewerTasks(project)
        ]);
        
        this.logger.info(`Step 4/5: Generated ${plannerTasks.length} planner, ${coderTasks.length} coder, ${testerTasks.length} tester, ${reviewerTasks.length} reviewer tasks`);
        
        // Step 5: Consolidate and finalize tasks
        this.logger.info('Step 5/5: Consolidating and finalizing tasks...');
        const allTasks = [...plannerTasks, ...coderTasks, ...testerTasks, ...reviewerTasks];
        const finalTasks = await this.consolidateTasks(allTasks, project);
        this.logger.info(`Step 5/5: Consolidated to ${finalTasks.length} final tasks`);
        
        // Add metadata to tasks
        const customizedTasks = finalTasks.map((task, index) => ({
          ...task,
          id: task.id || `task_${String(index + 1).padStart(3, '0')}`,
          customized: true,
          generatedAt: new Date().toISOString(),
          projectType: project.type,
          techStack: project.techStack
        }));

        this.logger.info(`Successfully generated ${customizedTasks.length} customized tasks`);
        this.logger.info('Task distribution:', this.getTaskDistribution(customizedTasks));
        return customizedTasks;
      } catch (error) {
        this.logger.error('Step 4/5 or 5/5 failed:', error.message);
        throw error;
      }

    } catch (error) {
      this.logger.error('Failed to generate customized tasks:', {
        message: error.message,
        stack: error.stack,
        claudeAvailable: this.claudeAvailable,
        projectName: project.name,
        projectType: project.type
      });
      
      // Log specific error details
      if (error.code === 'ENOENT') {
        this.logger.error('Claude binary not found in PATH');
      } else if (error.code === 'ETIMEDOUT') {
        this.logger.error('Claude request timed out');
      } else if (error.message && error.message.includes('JSON')) {
        this.logger.error('Claude returned invalid JSON response');
      }
      
      this.logger.warn('Falling back to enhanced default tasks due to error');
      // Return enhanced default tasks as fallback
      return this.createEnhancedDefaultTasks(project);
    }
  }

  /**
   * Step 1: Establish project context with Claude
   */
  async establishProjectContext(project) {
    const prompt = `I'm helping you generate development tasks for a new project. Let me provide the project overview:

Project: ${project.name}
Type: ${project.type || 'web'}
Description: ${project.description || 'A new software project'}

Technology Stack:
${(project.techStack || []).map(tech => `- ${tech}`).join('\n')}

Architecture:
- Pattern: ${project.architecture?.pattern || 'layered'}
- Database: ${project.architecture?.database || 'sql'}
- API Style: ${project.architecture?.apiStyle || 'rest'}
- Deployment: ${project.architecture?.deployment || 'cloud'}

Please acknowledge you understand this project context and identify the key technical considerations for this stack.`;

    const response = await this.claudeWrapper.ask(prompt, {
      timeout: 600000 // 10 minutes
    });
    
    this.logger.info('Context established with Claude');
    return response;
  }

  /**
   * Step 2: Analyze project goals and requirements
   */
  async analyzeGoalsAndRequirements(project) {
    const highPriorityGoals = (project.goals || [])
      .filter(g => g.priority === 'high')
      .map(g => `- ${g.description || g.text || g}`)
      .join('\n');
    
    const mediumPriorityGoals = (project.goals || [])
      .filter(g => g.priority === 'medium')
      .map(g => `- ${g.description || g.text || g}`)
      .join('\n');

    const prompt = `Now let me share the project goals and requirements:

HIGH PRIORITY GOALS:
${highPriorityGoals || '- Build a functional application'}

MEDIUM PRIORITY GOALS:
${mediumPriorityGoals || '- Ensure code quality'}

Testing Requirements:
- Coverage Target: ${project.testingStrategy?.unitTestCoverage || 80}%
- Test Frameworks: ${(project.testingStrategy?.frameworks || ['Jest']).join(', ')}
- Integration Testing: ${project.testingStrategy?.integrationTesting ? 'Yes' : 'Optional'}
- E2E Testing: ${project.testingStrategy?.e2eTesting ? 'Yes' : 'Optional'}

Based on these goals and the tech stack we discussed, what are the main implementation phases you'd recommend?`;

    const response = await this.claudeWrapper.ask(prompt, {
      timeout: 600000 // 10 minutes
    });
    
    this.logger.info('Goals and requirements analyzed');
    return response;
  }

  /**
   * Step 3: Map features to components
   */
  async mapFeaturesToComponents(project) {
    const coreFeatures = project.vision?.coreFeatures || [];
    const targetAudience = project.vision?.targetAudience || 'general users';
    const successMetrics = project.vision?.successMetrics || [];

    const prompt = `Here are the specific features to implement:

Core Features:
${coreFeatures.map(f => `- ${f}`).join('\n') || '- Basic CRUD operations\n- User authentication\n- Data visualization'}

Target Users: ${targetAudience}

Success Metrics:
${successMetrics.map(m => `- ${m}`).join('\n') || '- User satisfaction\n- Performance targets'}

Considering our tech stack and goals, what specific components and modules need to be built?`;

    const response = await this.claudeWrapper.ask(prompt, {
      timeout: 600000 // 10 minutes
    });
    
    this.logger.info('Features mapped to components');
    return response;
  }

  /**
   * Step 4a: Generate planner tasks
   */
  async generatePlannerTasks(project) {
    const techStack = (project.techStack || []).join(', ');
    
    const prompt = `Generate EXACTLY 3-4 specific planning tasks for the PLANNER agent:

Focus areas:
- Architecture design and technical specifications
- Database schema and data modeling  
- API design and documentation
- Implementation roadmap and dependencies

Use these specific technologies: ${techStack}

Return ONLY a JSON array with this format:
[
  {
    "id": "task_001",
    "description": "[specific task description referencing actual technologies]",
    "assignedAgent": "planner",
    "priority": "critical|high|medium",
    "dependencies": [],
    "estimatedEffort": [1-8 hours],
    "category": "architecture|database|api|planning"
  }
]

Generate 3-4 tasks. Be specific to the project technologies.`;

    try {
      const response = await this.claudeWrapper.ask(prompt, {
        timeout: 600000, // 10 minutes
        outputFormat: 'json'
      });
      
      const tasks = this.parseTaskResponse(response);
      this.logger.info(`Generated ${tasks.length} planner tasks`);
      return tasks;
    } catch (error) {
      this.logger.warn('Failed to generate planner tasks:', error.message);
      return this.getFallbackPlannerTasks(project);
    }
  }

  /**
   * Step 4b: Generate coder tasks
   */
  async generateCoderTasks(project) {
    const techStack = (project.techStack || []).join(', ');
    const features = (project.vision?.coreFeatures || []).slice(0, 3).join(', ');
    
    const prompt = `Generate EXACTLY 7-9 specific coding tasks for the CODER agent:

Implementation areas:
- Frontend components and UI
- Backend API endpoints and services
- Database integration and models
- Authentication and authorization
- Core feature implementation

Specific features to implement: ${features || 'user management, data processing, reporting'}
Use these specific technologies: ${techStack}

Return ONLY a JSON array with this format:
[
  {
    "id": "task_005",
    "description": "[specific implementation task using actual technology names]",
    "assignedAgent": "coder",
    "priority": "critical|high|medium",
    "dependencies": ["task_001"],
    "estimatedEffort": [2-8 hours],
    "category": "frontend|backend|database|integration"
  }
]

Generate 7-9 tasks. Reference specific technologies and features.`;

    try {
      const response = await this.claudeWrapper.ask(prompt, {
        timeout: 600000, // 10 minutes
        outputFormat: 'json'
      });
      
      const tasks = this.parseTaskResponse(response);
      this.logger.info(`Generated ${tasks.length} coder tasks`);
      return tasks;
    } catch (error) {
      this.logger.warn('Failed to generate coder tasks:', error.message);
      return this.getFallbackCoderTasks(project);
    }
  }

  /**
   * Step 4c: Generate tester tasks
   */
  async generateTesterTasks(project) {
    const testFramework = project.testingStrategy?.frameworks?.[0] || 'Jest';
    const coverage = project.testingStrategy?.unitTestCoverage || 80;
    
    const prompt = `Generate EXACTLY 3-4 specific testing tasks for the TESTER agent:

Testing focus:
- Unit tests for components and services
- Integration tests for APIs
- Test coverage analysis and improvement
- Edge case and error handling tests

Test framework: ${testFramework}
Coverage target: ${coverage}%

Return ONLY a JSON array with this format:
[
  {
    "id": "task_014",
    "description": "[specific testing task using ${testFramework}]",
    "assignedAgent": "tester",
    "priority": "high|medium",
    "dependencies": ["task_005"],
    "estimatedEffort": [2-6 hours],
    "category": "unit|integration|e2e|coverage"
  }
]

Generate 3-4 tasks. Be specific about what to test and how.`;

    try {
      const response = await this.claudeWrapper.ask(prompt, {
        timeout: 600000, // 10 minutes
        outputFormat: 'json'
      });
      
      const tasks = this.parseTaskResponse(response);
      this.logger.info(`Generated ${tasks.length} tester tasks`);
      return tasks;
    } catch (error) {
      this.logger.warn('Failed to generate tester tasks:', error.message);
      return this.getFallbackTesterTasks(project);
    }
  }

  /**
   * Step 4d: Generate reviewer tasks
   */
  async generateReviewerTasks(project) {
    const techStack = (project.techStack || []).join(', ');
    
    const prompt = `Generate EXACTLY 2-3 specific review tasks for the REVIEWER agent:

Review focus:
- Code quality and best practices
- Security vulnerabilities and authentication
- Performance optimization
- Architecture and design patterns

Technology context: ${techStack}

Return ONLY a JSON array with this format:
[
  {
    "id": "task_018",
    "description": "[specific review task for the technologies used]",
    "assignedAgent": "reviewer",
    "priority": "medium|low",
    "dependencies": ["task_010"],
    "estimatedEffort": [2-4 hours],
    "category": "quality|security|performance|architecture"
  }
]

Generate 2-3 tasks. Focus on critical review areas.`;

    try {
      const response = await this.claudeWrapper.ask(prompt, {
        timeout: 600000, // 10 minutes
        outputFormat: 'json'
      });
      
      const tasks = this.parseTaskResponse(response);
      this.logger.info(`Generated ${tasks.length} reviewer tasks`);
      return tasks;
    } catch (error) {
      this.logger.warn('Failed to generate reviewer tasks:', error.message);
      return this.getFallbackReviewerTasks(project);
    }
  }

  /**
   * Step 5: Consolidate all tasks and ensure consistency
   */
  async consolidateTasks(allTasks, project) {
    // If we have between 15-20 tasks, validate and return
    if (allTasks.length >= 15 && allTasks.length <= 20) {
      return this.validateAndFixTaskIds(allTasks);
    }
    
    // If we have too few or too many tasks, ask Claude to adjust
    const taskSummary = allTasks.map(t => 
      `- ${t.assignedAgent}: ${t.description}`
    ).join('\n');
    
    const prompt = `Here are all ${allTasks.length} generated tasks:

${taskSummary}

We need EXACTLY 15-20 tasks total. Current count: ${allTasks.length}

${allTasks.length < 15 ? 'Please suggest ' + (15 - allTasks.length) + ' additional critical tasks.' : ''}
${allTasks.length > 20 ? 'Please identify ' + (allTasks.length - 20) + ' tasks to remove or combine.' : ''}

Also:
1. Verify all project goals are covered
2. Ensure logical dependency chains
3. Confirm balanced distribution across agents

Return the final task list as a JSON array with all required fields.`;

    try {
      const response = await this.claudeWrapper.ask(prompt, {
        timeout: 600000 // 10 minutes for consolidation
      });
      
      const finalTasks = this.parseTaskResponse(response);
      return this.validateAndFixTaskIds(finalTasks);
    } catch (error) {
      this.logger.warn('Failed to consolidate tasks, using current set:', error.message);
      // If consolidation fails, just ensure we have valid IDs
      return this.validateAndFixTaskIds(allTasks);
    }
  }

  /**
   * Parse task response from Claude
   */
  parseTaskResponse(response) {
    try {
      // Handle both string and object responses
      let tasks = typeof response === 'string' ? JSON.parse(response) : response;
      
      // Ensure it's an array
      if (!Array.isArray(tasks)) {
        this.logger.warn('Response is not an array, attempting to extract tasks');
        // Try to find an array in the response
        if (tasks.tasks && Array.isArray(tasks.tasks)) {
          tasks = tasks.tasks;
        } else {
          throw new Error('Could not extract task array from response');
        }
      }
      
      return tasks;
    } catch (error) {
      this.logger.error('Failed to parse task response:', error.message);
      throw error;
    }
  }

  /**
   * Validate and fix task IDs to ensure uniqueness
   */
  validateAndFixTaskIds(tasks) {
    return tasks.map((task, index) => ({
      ...task,
      id: `task_${String(index + 1).padStart(3, '0')}`,
      dependencies: task.dependencies?.map(dep => {
        // Fix dependency references
        if (typeof dep === 'string' && dep.startsWith('task_')) {
          const depIndex = parseInt(dep.replace('task_', ''));
          if (depIndex > 0 && depIndex <= tasks.length && depIndex < index + 1) {
            return `task_${String(depIndex).padStart(3, '0')}`;
          }
        }
        return [];
      }).flat() || []
    }));
  }

  /**
   * Fallback tasks for planner agent
   */
  getFallbackPlannerTasks(project) {
    const techStack = project.techStack || [];
    return [
      {
        id: 'task_001',
        description: `Design application architecture and component structure for ${project.name}`,
        assignedAgent: 'planner',
        priority: 'critical',
        dependencies: [],
        estimatedEffort: 4,
        category: 'architecture'
      },
      {
        id: 'task_002',
        description: `Create database schema and data models using ${techStack.includes('PostgreSQL') ? 'PostgreSQL' : 'database'}`,
        assignedAgent: 'planner',
        priority: 'critical',
        dependencies: [],
        estimatedEffort: 3,
        category: 'database'
      },
      {
        id: 'task_003',
        description: 'Plan authentication and authorization strategy',
        assignedAgent: 'planner',
        priority: 'high',
        dependencies: [],
        estimatedEffort: 2,
        category: 'planning'
      }
    ];
  }

  /**
   * Fallback tasks for coder agent
   */
  getFallbackCoderTasks(project) {
    return [
      {
        id: 'task_004',
        description: 'Set up project structure and configuration',
        assignedAgent: 'coder',
        priority: 'critical',
        dependencies: ['task_001'],
        estimatedEffort: 2,
        category: 'setup'
      },
      {
        id: 'task_005',
        description: 'Implement user authentication system',
        assignedAgent: 'coder',
        priority: 'high',
        dependencies: ['task_003'],
        estimatedEffort: 6,
        category: 'backend'
      },
      {
        id: 'task_006',
        description: 'Create main application components',
        assignedAgent: 'coder',
        priority: 'high',
        dependencies: ['task_004'],
        estimatedEffort: 4,
        category: 'frontend'
      }
    ];
  }

  /**
   * Fallback tasks for tester agent
   */
  getFallbackTesterTasks(project) {
    return [
      {
        id: 'task_007',
        description: 'Write unit tests for core components',
        assignedAgent: 'tester',
        priority: 'high',
        dependencies: ['task_006'],
        estimatedEffort: 3,
        category: 'unit'
      },
      {
        id: 'task_008',
        description: 'Create integration tests for APIs',
        assignedAgent: 'tester',
        priority: 'medium',
        dependencies: ['task_005'],
        estimatedEffort: 3,
        category: 'integration'
      }
    ];
  }

  /**
   * Fallback tasks for reviewer agent
   */
  getFallbackReviewerTasks(project) {
    return [
      {
        id: 'task_009',
        description: 'Review code quality and patterns',
        assignedAgent: 'reviewer',
        priority: 'medium',
        dependencies: ['task_006'],
        estimatedEffort: 2,
        category: 'quality'
      },
      {
        id: 'task_010',
        description: 'Security audit and vulnerability assessment',
        assignedAgent: 'reviewer',
        priority: 'high',
        dependencies: ['task_005'],
        estimatedEffort: 3,
        category: 'security'
      }
    ];
  }

  /**
   * Build comprehensive project context for Claude
   */
  buildProjectContext(project) {
    const context = [];
    
    // Add project overview
    context.push(`Project: ${project.name}`);
    context.push(`Type: ${project.type || 'Not specified'}`);
    context.push(`Description: ${project.description || 'Not provided'}`);
    
    // Add technology stack
    if (project.techStack && project.techStack.length > 0) {
      context.push(`\nTechnology Stack:`);
      project.techStack.forEach(tech => context.push(`- ${tech}`));
    }
    
    // Add goals
    if (project.goals && project.goals.length > 0) {
      context.push(`\nProject Goals:`);
      project.goals.forEach((goal, i) => {
        const goalDesc = goal.description || goal.text || goal;
        const priority = goal.priority || 'medium';
        context.push(`${i + 1}. [${priority.toUpperCase()}] ${goalDesc}`);
      });
    }
    
    // Add architecture details
    if (project.architecture) {
      context.push(`\nArchitecture:`);
      context.push(`- Pattern: ${project.architecture.pattern || 'Not specified'}`);
      context.push(`- Database: ${project.architecture.database || 'Not specified'}`);
      if (project.architecture.apiStyle) {
        context.push(`- API Style: ${project.architecture.apiStyle}`);
      }
      if (project.architecture.deployment) {
        context.push(`- Deployment: ${project.architecture.deployment}`);
      }
    }
    
    // Add testing requirements
    if (project.testingStrategy) {
      context.push(`\nTesting Requirements:`);
      context.push(`- Unit Test Coverage: ${project.testingStrategy.unitTestCoverage || 80}%`);
      if (project.testingStrategy.frameworks) {
        context.push(`- Frameworks: ${project.testingStrategy.frameworks.join(', ')}`);
      }
      context.push(`- Integration Testing: ${project.testingStrategy.integrationTesting ? 'Yes' : 'No'}`);
      context.push(`- E2E Testing: ${project.testingStrategy.e2eTesting ? 'Yes' : 'No'}`);
    }
    
    // Add vision details if available
    if (project.vision) {
      context.push(`\nProduct Vision:`);
      if (project.vision.targetAudience) {
        context.push(`- Target Audience: ${project.vision.targetAudience}`);
      }
      if (project.vision.coreFeatures && project.vision.coreFeatures.length > 0) {
        context.push(`- Core Features: ${project.vision.coreFeatures.join(', ')}`);
      }
      if (project.vision.successMetrics && project.vision.successMetrics.length > 0) {
        context.push(`- Success Metrics: ${project.vision.successMetrics.join(', ')}`);
      }
    }
    
    return context.join('\n');
  }

  /**
   * Validate task distribution across agents
   */
  validateTaskDistribution(tasks) {
    const distribution = {
      planner: 0,
      coder: 0,
      tester: 0,
      reviewer: 0
    };
    
    tasks.forEach(task => {
      if (distribution.hasOwnProperty(task.assignedAgent)) {
        distribution[task.assignedAgent]++;
      }
    });
    
    // Check minimum requirements
    const minimums = {
      planner: 2,
      coder: 5,
      tester: 2,
      reviewer: 1
    };
    
    for (const agent in minimums) {
      if (distribution[agent] < minimums[agent]) {
        return {
          isValid: false,
          message: `${agent} has only ${distribution[agent]} tasks, minimum is ${minimums[agent]}`,
          distribution
        };
      }
    }
    
    // Check for overload (no agent should have more than 50% of tasks)
    const maxTasks = Math.ceil(tasks.length * 0.5);
    for (const agent in distribution) {
      if (distribution[agent] > maxTasks) {
        return {
          isValid: false,
          message: `${agent} is overloaded with ${distribution[agent]} tasks (max: ${maxTasks})`,
          distribution
        };
      }
    }
    
    return {
      isValid: true,
      distribution
    };
  }

  /**
   * Rebalance tasks if distribution is skewed
   */
  async rebalanceTasks(tasks, project) {
    this.logger.info('Rebalancing task distribution');
    
    // Try to get Claude to rebalance
    try {
      const rebalancePrompt = `The following task distribution needs rebalancing. 
Please adjust the assignedAgent fields to ensure:
- Planner: 3-4 tasks
- Coder: 7-9 tasks
- Tester: 3-4 tasks
- Reviewer: 2-3 tasks

Current tasks:
${JSON.stringify(tasks, null, 2)}

Return the same tasks with adjusted assignedAgent fields. Maintain all other fields unchanged.`;

      const response = await this.claudeWrapper.ask(rebalancePrompt, {
        outputFormat: 'json',
        timeout: 600000 // 10 minutes
      });

      const rebalancedTasks = await this.responseProcessor.processTaskResponse(response, {
        minTasks: tasks.length,
        maxTasks: tasks.length,
        requiredFields: ['id', 'description', 'assignedAgent'],
        validAgents: ['planner', 'coder', 'tester', 'reviewer']
      });

      if (rebalancedTasks && rebalancedTasks.length === tasks.length) {
        return rebalancedTasks;
      }
    } catch (error) {
      this.logger.error('Failed to rebalance with Claude:', error);
    }
    
    // Manual rebalancing as fallback
    return this.manualRebalance(tasks);
  }

  /**
   * Manually rebalance tasks based on type
   */
  manualRebalance(tasks) {
    const rebalanced = [...tasks];
    const targetDistribution = {
      planner: 3,
      coder: 8,
      tester: 4,
      reviewer: 2
    };
    
    const currentDistribution = {
      planner: 0,
      coder: 0,
      tester: 0,
      reviewer: 0
    };
    
    // First pass: count current distribution
    rebalanced.forEach(task => {
      if (currentDistribution.hasOwnProperty(task.assignedAgent)) {
        currentDistribution[task.assignedAgent]++;
      }
    });
    
    // Second pass: reassign tasks to meet targets
    for (const agent in targetDistribution) {
      const target = targetDistribution[agent];
      const current = currentDistribution[agent];
      
      if (current < target) {
        // Need more tasks for this agent
        const needed = target - current;
        let assigned = 0;
        
        for (let i = 0; i < rebalanced.length && assigned < needed; i++) {
          const task = rebalanced[i];
          const taskAgent = task.assignedAgent;
          
          // Check if we can reassign this task
          if (currentDistribution[taskAgent] > targetDistribution[taskAgent]) {
            // Reassign based on task description keywords
            if (this.isTaskSuitableForAgent(task, agent)) {
              task.assignedAgent = agent;
              currentDistribution[taskAgent]--;
              currentDistribution[agent]++;
              assigned++;
            }
          }
        }
      }
    }
    
    // Ensure we have at least the full count
    while (rebalanced.length < 15) {
      rebalanced.push(this.generateFillerTask(rebalanced.length + 1));
    }
    
    // Trim if we have too many
    if (rebalanced.length > 20) {
      rebalanced.length = 20;
    }
    
    return rebalanced;
  }

  /**
   * Check if a task is suitable for a specific agent based on keywords
   */
  isTaskSuitableForAgent(task, agent) {
    const keywords = {
      planner: ['design', 'architect', 'plan', 'structure', 'strategy', 'specification', 'document'],
      coder: ['implement', 'code', 'develop', 'create', 'build', 'integrate', 'api', 'feature'],
      tester: ['test', 'verify', 'validate', 'coverage', 'quality', 'check', 'ensure'],
      reviewer: ['review', 'audit', 'optimize', 'refactor', 'improve', 'analyze', 'assess']
    };
    
    const taskDesc = task.description.toLowerCase();
    const agentKeywords = keywords[agent] || [];
    
    return agentKeywords.some(keyword => taskDesc.includes(keyword));
  }

  /**
   * Generate a filler task if needed
   */
  generateFillerTask(index) {
    const fillerTasks = [
      { agent: 'coder', desc: 'Implement error handling middleware', priority: 'medium', effort: 2 },
      { agent: 'tester', desc: 'Create test utilities and helpers', priority: 'low', effort: 2 },
      { agent: 'coder', desc: 'Set up logging infrastructure', priority: 'medium', effort: 3 },
      { agent: 'reviewer', desc: 'Perform security audit of dependencies', priority: 'high', effort: 2 },
      { agent: 'planner', desc: 'Document deployment strategy', priority: 'medium', effort: 2 }
    ];
    
    const filler = fillerTasks[index % fillerTasks.length];
    return {
      id: `task_${String(index).padStart(3, '0')}`,
      description: filler.desc,
      assignedAgent: filler.agent,
      priority: filler.priority,
      dependencies: [],
      estimatedEffort: filler.effort,
      customized: false
    };
  }

  /**
   * Create enhanced default tasks based on project type
   * Returns 15-20 tasks as fallback
   */
  createEnhancedDefaultTasks(project) {
    this.logger.info('Creating enhanced default tasks for project type:', project.type);
    
    const baseTaskTemplates = {
      'web-app': [
        // Planning tasks (3)
        { agent: 'planner', desc: 'Design application architecture and component structure', priority: 'critical', effort: 4 },
        { agent: 'planner', desc: 'Create API specification and data models', priority: 'critical', effort: 3 },
        { agent: 'planner', desc: 'Plan authentication and authorization strategy', priority: 'high', effort: 2 },
        
        // Coding tasks (8)
        { agent: 'coder', desc: 'Set up project structure and configuration', priority: 'critical', effort: 2 },
        { agent: 'coder', desc: 'Implement database models and migrations', priority: 'high', effort: 4 },
        { agent: 'coder', desc: 'Create API endpoints and controllers', priority: 'high', effort: 5 },
        { agent: 'coder', desc: 'Implement authentication system', priority: 'high', effort: 4 },
        { agent: 'coder', desc: 'Build frontend components and views', priority: 'medium', effort: 6 },
        { agent: 'coder', desc: 'Integrate frontend with backend APIs', priority: 'medium', effort: 3 },
        { agent: 'coder', desc: 'Implement error handling and logging', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Add data validation and sanitization', priority: 'medium', effort: 3 },
        
        // Testing tasks (4)
        { agent: 'tester', desc: 'Set up testing framework and utilities', priority: 'high', effort: 2 },
        { agent: 'tester', desc: 'Write unit tests for business logic', priority: 'high', effort: 4 },
        { agent: 'tester', desc: 'Create integration tests for API endpoints', priority: 'medium', effort: 3 },
        { agent: 'tester', desc: 'Implement end-to-end user flow tests', priority: 'medium', effort: 4 },
        
        // Review tasks (2)
        { agent: 'reviewer', desc: 'Review code architecture and patterns', priority: 'high', effort: 2 },
        { agent: 'reviewer', desc: 'Perform security and performance audit', priority: 'high', effort: 3 }
      ],
      'api': [
        // Planning tasks (3)
        { agent: 'planner', desc: 'Design RESTful API architecture', priority: 'critical', effort: 3 },
        { agent: 'planner', desc: 'Define endpoint schemas and documentation', priority: 'critical', effort: 3 },
        { agent: 'planner', desc: 'Plan rate limiting and caching strategy', priority: 'high', effort: 2 },
        
        // Coding tasks (9)
        { agent: 'coder', desc: 'Set up Express/FastAPI server structure', priority: 'critical', effort: 2 },
        { agent: 'coder', desc: 'Implement request routing and middleware', priority: 'high', effort: 3 },
        { agent: 'coder', desc: 'Create data models and database layer', priority: 'high', effort: 4 },
        { agent: 'coder', desc: 'Implement CRUD operations', priority: 'high', effort: 5 },
        { agent: 'coder', desc: 'Add authentication and authorization', priority: 'high', effort: 4 },
        { agent: 'coder', desc: 'Implement input validation and error handling', priority: 'medium', effort: 3 },
        { agent: 'coder', desc: 'Add request/response logging', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Create API documentation with Swagger/OpenAPI', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Implement rate limiting and throttling', priority: 'low', effort: 2 },
        
        // Testing tasks (4)
        { agent: 'tester', desc: 'Set up API testing framework', priority: 'high', effort: 2 },
        { agent: 'tester', desc: 'Write unit tests for business logic', priority: 'high', effort: 3 },
        { agent: 'tester', desc: 'Create integration tests for all endpoints', priority: 'high', effort: 4 },
        { agent: 'tester', desc: 'Implement load and performance tests', priority: 'medium', effort: 3 },
        
        // Review tasks (2)
        { agent: 'reviewer', desc: 'Review API design and REST compliance', priority: 'high', effort: 2 },
        { agent: 'reviewer', desc: 'Audit security and data handling', priority: 'high', effort: 3 }
      ],
      'cli-tool': [
        // Planning tasks (3)
        { agent: 'planner', desc: 'Design command structure and interface', priority: 'critical', effort: 3 },
        { agent: 'planner', desc: 'Plan configuration and plugin system', priority: 'high', effort: 2 },
        { agent: 'planner', desc: 'Define output formats and error handling', priority: 'high', effort: 2 },
        
        // Coding tasks (8)
        { agent: 'coder', desc: 'Set up CLI framework and command parsing', priority: 'critical', effort: 2 },
        { agent: 'coder', desc: 'Implement core command functionality', priority: 'high', effort: 5 },
        { agent: 'coder', desc: 'Add configuration file support', priority: 'high', effort: 3 },
        { agent: 'coder', desc: 'Create interactive prompts and validation', priority: 'medium', effort: 3 },
        { agent: 'coder', desc: 'Implement output formatting and colors', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Add error handling and helpful messages', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Create help documentation system', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Implement progress indicators and spinners', priority: 'low', effort: 2 },
        
        // Testing tasks (4)
        { agent: 'tester', desc: 'Set up CLI testing framework', priority: 'high', effort: 2 },
        { agent: 'tester', desc: 'Write unit tests for commands', priority: 'high', effort: 3 },
        { agent: 'tester', desc: 'Create integration tests for workflows', priority: 'medium', effort: 3 },
        { agent: 'tester', desc: 'Test cross-platform compatibility', priority: 'medium', effort: 2 },
        
        // Review tasks (2)
        { agent: 'reviewer', desc: 'Review CLI usability and documentation', priority: 'high', effort: 2 },
        { agent: 'reviewer', desc: 'Audit command structure and naming', priority: 'medium', effort: 2 }
      ],
      'library': [
        // Planning tasks (4)
        { agent: 'planner', desc: 'Design library API and public interface', priority: 'critical', effort: 4 },
        { agent: 'planner', desc: 'Plan module structure and dependencies', priority: 'critical', effort: 3 },
        { agent: 'planner', desc: 'Define versioning and compatibility strategy', priority: 'high', effort: 2 },
        { agent: 'planner', desc: 'Create documentation structure', priority: 'medium', effort: 2 },
        
        // Coding tasks (7)
        { agent: 'coder', desc: 'Implement core library functionality', priority: 'critical', effort: 6 },
        { agent: 'coder', desc: 'Create public API methods', priority: 'high', effort: 4 },
        { agent: 'coder', desc: 'Add type definitions/interfaces', priority: 'high', effort: 3 },
        { agent: 'coder', desc: 'Implement error handling and validation', priority: 'high', effort: 3 },
        { agent: 'coder', desc: 'Create utility functions and helpers', priority: 'medium', effort: 3 },
        { agent: 'coder', desc: 'Add configuration options', priority: 'medium', effort: 2 },
        { agent: 'coder', desc: 'Implement backward compatibility layer', priority: 'low', effort: 2 },
        
        // Testing tasks (4)
        { agent: 'tester', desc: 'Set up testing infrastructure', priority: 'high', effort: 2 },
        { agent: 'tester', desc: 'Write comprehensive unit tests', priority: 'critical', effort: 5 },
        { agent: 'tester', desc: 'Create integration test suite', priority: 'high', effort: 3 },
        { agent: 'tester', desc: 'Test browser/environment compatibility', priority: 'medium', effort: 2 },
        
        // Review tasks (3)
        { agent: 'reviewer', desc: 'Review API design and usability', priority: 'critical', effort: 3 },
        { agent: 'reviewer', desc: 'Audit code quality and patterns', priority: 'high', effort: 2 },
        { agent: 'reviewer', desc: 'Review documentation completeness', priority: 'medium', effort: 2 }
      ]
    };
    
    // Get template based on project type, default to web-app
    const projectType = project.type ? project.type.toLowerCase() : 'web-app';
    let template = baseTaskTemplates[projectType] || baseTaskTemplates['web-app'];
    
    // Customize task descriptions with actual tech stack
    const tasks = template.map((task, index) => {
      let description = task.desc;
      
      // Replace generic terms with specific technologies - use word boundaries and replace only first match
      if (project.techStack && project.techStack.length > 0) {
        // Create a priority replacement map to avoid duplicate replacements
        const replacements = [];
        
        // Define replacement patterns with priority
        if (project.techStack.includes('Express')) {
          replacements.push({ pattern: /\bAPI\b/i, replacement: 'Express API', priority: 1 });
          replacements.push({ pattern: /\bserver\b/i, replacement: 'Express server', priority: 2 });
        }
        
        if (project.techStack.includes('React')) {
          replacements.push({ pattern: /\bfrontend components\b/i, replacement: 'React components', priority: 1 });
          replacements.push({ pattern: /\bfrontend\b/i, replacement: 'React', priority: 3 });
        } else if (project.techStack.includes('Vue')) {
          replacements.push({ pattern: /\bfrontend components\b/i, replacement: 'Vue components', priority: 1 });
          replacements.push({ pattern: /\bfrontend\b/i, replacement: 'Vue', priority: 3 });
        } else if (project.techStack.includes('Angular')) {
          replacements.push({ pattern: /\bfrontend components\b/i, replacement: 'Angular components', priority: 1 });
          replacements.push({ pattern: /\bfrontend\b/i, replacement: 'Angular', priority: 3 });
        }
        
        if (project.techStack.includes('PostgreSQL')) {
          replacements.push({ pattern: /\bdatabase models\b/i, replacement: 'PostgreSQL models', priority: 1 });
          replacements.push({ pattern: /\bdatabase\b/i, replacement: 'PostgreSQL', priority: 3 });
        } else if (project.techStack.includes('MongoDB')) {
          replacements.push({ pattern: /\bdatabase models\b/i, replacement: 'MongoDB collections', priority: 1 });
          replacements.push({ pattern: /\bdatabase\b/i, replacement: 'MongoDB', priority: 3 });
        } else if (project.techStack.includes('MySQL')) {
          replacements.push({ pattern: /\bdatabase models\b/i, replacement: 'MySQL tables', priority: 1 });
          replacements.push({ pattern: /\bdatabase\b/i, replacement: 'MySQL', priority: 3 });
        }
        
        if (project.techStack.includes('Jest')) {
          replacements.push({ pattern: /\btesting framework\b/i, replacement: 'Jest', priority: 1 });
          replacements.push({ pattern: /\bunit tests\b/i, replacement: 'Jest unit tests', priority: 1 });
          replacements.push({ pattern: /\bintegration tests\b/i, replacement: 'Jest integration tests', priority: 1 });
          replacements.push({ pattern: /\btests\b/i, replacement: 'Jest tests', priority: 3 });
        } else if (project.techStack.includes('Mocha')) {
          replacements.push({ pattern: /\btesting framework\b/i, replacement: 'Mocha', priority: 1 });
          replacements.push({ pattern: /\bunit tests\b/i, replacement: 'Mocha unit tests', priority: 1 });
          replacements.push({ pattern: /\btests\b/i, replacement: 'Mocha tests', priority: 3 });
        }
        
        if (project.techStack.includes('TypeScript')) {
          replacements.push({ pattern: /\btype definitions\b/i, replacement: 'TypeScript types', priority: 1 });
          replacements.push({ pattern: /\binterfaces\b/i, replacement: 'TypeScript interfaces', priority: 2 });
        }
        
        // Sort by priority and apply replacements
        replacements.sort((a, b) => a.priority - b.priority);
        for (const { pattern, replacement } of replacements) {
          // Replace only the first match to avoid duplicates
          const match = description.match(pattern);
          if (match) {
            description = description.replace(pattern, replacement);
            break; // Apply only one replacement per description to avoid over-replacement
          }
        }
      }
      
      return {
        id: `task_${String(index + 1).padStart(3, '0')}`,
        description,
        assignedAgent: task.agent,
        priority: task.priority,
        dependencies: index > 0 && task.agent === 'coder' && template[index - 1].agent === 'planner'
          ? [`task_${String(index).padStart(3, '0')}`]
          : [],
        estimatedEffort: task.effort,
        customized: false,
        fallback: true
      };
    });
    
    // Ensure we have 15-20 tasks
    while (tasks.length < 15) {
      tasks.push(this.generateFillerTask(tasks.length + 1));
    }
    
    if (tasks.length > 20) {
      tasks.length = 20;
    }
    
    return tasks;
  }

  /**
   * Save tasks to project directory
   */
  async saveTasksToProject(projectPath, tasks) {
    try {
      const coordinatorDir = path.join(projectPath, '.agents', 'workspace', 'coordinator');
      await fs.mkdir(coordinatorDir, { recursive: true });
      
      const tasksFile = path.join(coordinatorDir, 'initial_tasks.json');
      const tasksData = {
        version: '1.0',
        generated: new Date().toISOString(),
        customized: tasks.some(t => t.customized),
        taskCount: tasks.length,
        distribution: this.getTaskDistribution(tasks),
        tasks
      };
      
      await fs.writeFile(tasksFile, JSON.stringify(tasksData, null, 2));
      this.logger.info(`Saved ${tasks.length} tasks to ${tasksFile}`);
      
      return tasksFile;
    } catch (error) {
      this.logger.error('Failed to save tasks:', error);
      throw error;
    }
  }

  /**
   * Get task distribution summary
   */
  getTaskDistribution(tasks) {
    const distribution = {
      planner: 0,
      coder: 0,
      tester: 0,
      reviewer: 0
    };
    
    tasks.forEach(task => {
      if (distribution.hasOwnProperty(task.assignedAgent)) {
        distribution[task.assignedAgent]++;
      }
    });
    
    return distribution;
  }
}

module.exports = TaskCustomizer;
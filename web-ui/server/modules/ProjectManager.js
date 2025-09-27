const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const TaskCustomizer = require('./TaskCustomizer');

class ProjectManager {
  constructor(logger) {
    this.logger = logger;
    this.projects = new Map();
    this.agentManager = null; // Will be set by server
    this.taskCustomizer = new TaskCustomizer(logger);
    this.eventEmitter = null; // Will be set by server for progress events
    this.loadProjects();
  }
  
  setEventEmitter(eventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  setAgentManager(agentManager) {
    this.agentManager = agentManager;
  }

  async loadProjects() {
    try {
      const configPath = path.join(process.env.HOME, '.config', 'agent-framework', 'projects.json');
      const data = await fs.readFile(configPath, 'utf8');
      const projects = JSON.parse(data);
      projects.forEach(project => {
        this.projects.set(project.id, project);
      });
      this.logger.info(`Loaded ${this.projects.size} projects`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error('Error loading projects:', error);
      }
    }
  }

  async saveProjects() {
    try {
      const configDir = path.join(process.env.HOME, '.config', 'agent-framework');
      await fs.mkdir(configDir, { recursive: true });
      
      const configPath = path.join(configDir, 'projects.json');
      const projects = Array.from(this.projects.values());
      await fs.writeFile(configPath, JSON.stringify(projects, null, 2));
      this.logger.info('Projects saved');
    } catch (error) {
      this.logger.error('Error saving projects:', error);
    }
  }

  async createProject(projectData) {
    // Map goals to ensure they have the correct field names
    const mappedGoals = (projectData.goals || []).map((goal, index) => ({
      id: goal.id || `goal_${index + 1}`,
      description: goal.text || goal.description || '',  // Map 'text' to 'description'
      status: goal.status || 'pending',
      priority: goal.priority || 'medium',
      category: goal.category,
      metrics: goal.metrics || []
    }));

    const project = {
      id: uuidv4(),
      name: projectData.name,
      path: projectData.path,
      description: projectData.description || '',
      type: projectData.type || '',
      techStack: projectData.techStack || [],
      goals: mappedGoals,
      vision: projectData.vision || {},
      testingStrategy: projectData.testingStrategy || {},
      architecture: projectData.architecture || {},
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'active',
      agents: [],
      config: projectData
    };

    // Create project directory if it doesn't exist
    const projectPath = project.path.replace('~', process.env.HOME);
    try {
      await fs.access(projectPath);
      this.logger.info(`Project directory already exists: ${projectPath}`);
    } catch (error) {
      // Directory doesn't exist, create it
      try {
        await fs.mkdir(projectPath, { recursive: true });
        this.logger.info(`Created project directory: ${projectPath}`);
      } catch (mkdirError) {
        throw new Error(`Failed to create project directory: ${mkdirError.message}`);
      }
    }

    // Create .agents directory structure
    const agentsDir = path.join(projectPath, '.agents');
    const agentsDirs = [
      path.join(agentsDir, 'docs'),
      path.join(agentsDir, 'config'),
      path.join(agentsDir, 'agents'),
      path.join(agentsDir, 'logs'),
      path.join(agentsDir, 'status'),
      path.join(agentsDir, 'inboxes'),
      path.join(agentsDir, 'outboxes'),
      path.join(agentsDir, 'workspace'),
      path.join(agentsDir, 'archive'),
    ];

    for (const dir of agentsDirs) {
      await fs.mkdir(dir, { recursive: true });
    }
    this.logger.info(`Created .agents directory structure in: ${projectPath}`);

    // Create initial project files
    try {
      // Create all agent documentation files in .agents/docs
      const docsDir = path.join(agentsDir, 'docs');
      const configDir = path.join(agentsDir, 'config');
      
      // Create README.md
      const readmeContent = `# ${project.name}

${project.description}

## Technology Stack
${project.techStack.map(tech => `- ${tech}`).join('\n')}

## Project Type
${project.type}

## Architecture
- Pattern: ${project.architecture.pattern || 'Not specified'}
- Database: ${project.architecture.database || 'Not specified'}

## Goals
${project.goals.map((goal, i) => `${i + 1}. ${goal.description || goal.text || goal}`).join('\n')}

## Getting Started
1. Install dependencies
2. Configure environment variables
3. Run development server

Created with Agent Framework
`;
      await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
      
      // Create PROJECT_SPEC.md in .agents/docs
      const specContent = `# Project Specification: ${project.name}

## Overview
${project.description}

## Technical Requirements
- Project Type: ${project.type}
- Technology Stack: ${project.techStack.join(', ')}

## Testing Strategy
- Unit Test Coverage: ${project.testingStrategy.unitTestCoverage || 0}%
- Frameworks: ${(project.testingStrategy.frameworks || []).join(', ') || 'None specified'}

## Configuration
\`\`\`json
${JSON.stringify(projectData, null, 2)}
\`\`\`
`;
      await fs.writeFile(path.join(docsDir, 'PROJECT_SPEC.md'), specContent);
      
      // Create GOALS.json in .agents/docs
      const goalsData = {
        project: project.name,
        version: '0.1.0',
        generated: new Date().toISOString(),
        goals: project.goals.map((goal, index) => ({
          id: goal.id || `goal-${index + 1}`,
          description: goal.description || goal.text || goal,
          priority: goal.priority || 'medium',
          status: goal.status || 'pending',
          created: new Date().toISOString(),
          acceptanceCriteria: goal.acceptanceCriteria || [],
        })),
        metrics: {
          test_coverage_target: project.testingStrategy?.unitTestCoverage || 80,
          test_coverage_current: null,
          quality_gates: {
            tests_must_pass: true,
            linting_required: true,
            type_checking: project.techStack?.includes('TypeScript') || false,
          },
        },
        progress: {
          completed_goals: 0,
          total_goals: project.goals.length,
          last_updated: new Date().toISOString(),
        },
      };
      await fs.writeFile(
        path.join(docsDir, 'GOALS.json'), 
        JSON.stringify(goalsData, null, 2)
      );
      
      // Create PROJECT_VISION.md if vision data is provided
      if (project.vision && Object.keys(project.vision).length > 0) {
        const visionContent = `# Project Vision: ${project.name}

## Product Overview
**Product Name:** ${project.vision.productName || project.name}
**Tagline:** ${project.vision.tagline || 'Not specified'}
**Product Type:** ${project.vision.productType || project.type || 'Not specified'}

## Problem Statement
${project.vision.problemStatement || 'Not specified'}

## Target Audience
${project.vision.targetAudience || 'Not specified'}

## Core Features
${(project.vision.coreFeatures || []).map(feature => `- ${feature}`).join('\n') || '- Not specified'}

## Unique Value Proposition
${project.vision.uniqueValue || 'Not specified'}

## Success Metrics
${(project.vision.successMetrics || []).map(metric => `- ${metric}`).join('\n') || '- Not specified'}

## Constraints
${(project.vision.constraints || []).map(constraint => `- ${constraint}`).join('\n') || '- None specified'}

---
*This vision document guides the development process and helps agents understand the product context.*
`;
        await fs.writeFile(path.join(docsDir, 'PROJECT_VISION.md'), visionContent);
      }
      
      // Create TESTING_STRATEGY.md
      const testingStrategyContent = `# Testing Strategy for ${project.name}

## Overview
This document defines the comprehensive testing approach for ${project.name}.

## Test Coverage Requirements

### Minimum Coverage
- **Target:** ${project.testingStrategy?.unitTestCoverage || 80}%
- **Stretch Goal:** ${(project.testingStrategy?.unitTestCoverage || 80) + 10}%
- **Critical Paths:** 100%

### Coverage Metrics
- Line coverage
- Branch coverage
- Function coverage

## Test Categories

### Unit Tests
- **Purpose:** Test individual functions and components in isolation
- **Location:** \`${project.testDir || 'tests'}/unit/\`
- **Naming:** \`*.test.*\` or \`*.spec.*\`
- **Coverage Goal:** All business logic functions

### Integration Tests  
- **Purpose:** Test component interactions and API endpoints
- **Location:** \`${project.testDir || 'tests'}/integration/\`
- **Enabled:** ${project.testingStrategy?.integrationTesting ? 'Yes' : 'No'}
- **Coverage Goal:** All API endpoints and service integrations

### End-to-End Tests
- **Purpose:** Validate complete user workflows
- **Location:** \`${project.testDir || 'tests'}/e2e/\`
- **Enabled:** ${project.testingStrategy?.e2eTesting ? 'Yes' : 'No'}
- **Coverage Goal:** Critical user paths

### Performance Testing
- **Enabled:** ${project.testingStrategy?.performanceTesting ? 'Yes' : 'No'}
- **Goals:** Response time < 200ms, Support concurrent users

### Security Testing
- **Enabled:** ${project.testingStrategy?.securityTesting ? 'Yes' : 'No'}
- **Focus:** OWASP Top 10, Authentication, Authorization

### Accessibility Testing
- **Enabled:** ${project.testingStrategy?.accessibilityTesting ? 'Yes' : 'No'}
- **Standards:** WCAG 2.1 Level AA

## Test Execution

### Command
\`\`\`bash
${project.testCommand || 'npm test'}
\`\`\`

### CI/CD Integration
- **Enabled:** ${project.testingStrategy?.cicd ? 'Yes' : 'No'}
- **Automation Level:** ${project.testingStrategy?.automationLevel || 'semi-auto'}

### Continuous Testing
- Run tests before any commit
- All tests must pass for work to be considered complete
- Run full test suite at least once per hour

### Test Development Workflow
1. Write test first (TDD approach when possible)
2. Implement feature/fix
3. Ensure test passes
4. Check coverage meets requirements
5. Run full test suite

## Testing Tools

### Frameworks
${(project.testingStrategy?.frameworks || []).map(f => `- ${f}`).join('\n') || '- To be determined'}

### Technology Stack
${project.techStack.map(tech => `- ${tech}`).join('\n')}

## Critical Test Areas

### Based on Project Architecture
- Pattern: ${project.architecture?.pattern || 'Not specified'}
- Database: ${project.architecture?.database || 'Not specified'}
- API Style: ${project.architecture?.apiStyle || 'Not specified'}

### Priority Areas for Testing
1. Core business logic
2. Data validation and transformation
3. External service integrations
4. Error handling and edge cases
5. Security-sensitive operations

## Test Data Management

### Approach
- Use fixtures for consistent test data
- Mock external dependencies
- Use test databases/environments when needed
- Clean up test data after execution

## Performance Testing

### Benchmarks
- Response time requirements: < 2 seconds
- Throughput expectations: Based on user load
- Resource usage limits: Monitor memory and CPU

## Agent Guidelines for Testing

### For Tester Agent
1. Run \`${project.testCommand || 'npm test'}\` regularly
2. Report all failures immediately
3. Track coverage trends
4. Suggest areas needing more tests

### For Coder Agent
1. Write tests for all new code
2. Update tests when modifying existing code
3. Aim for ${project.testingStrategy?.unitTestCoverage || 80}% coverage minimum

### For Reviewer Agent
1. Verify test coverage in reviews
2. Check test quality, not just presence
3. Ensure tests actually validate behavior

---
*This strategy should be updated as the project evolves.*
`;
      await fs.writeFile(path.join(docsDir, 'TESTING_STRATEGY.md'), testingStrategyContent);

      // Create AGENT_INSTRUCTIONS.md
      const agentInstructionsContent = `# Agent Instructions for ${project.name}

## Overview
This document provides specific instructions for each agent working on ${project.name}.

## General Instructions (All Agents)

### Project Context
- **Project Type:** ${project.type}
- **Technology Stack:** ${project.techStack.join(', ')}
- **Source Directory:** \`${project.srcDir || 'src'}/\`
- **Test Directory:** \`${project.testDir || 'tests'}/\`
- **Test Command:** \`${project.testCommand || 'npm test'}\`

### Quality Standards
1. Maintain ${project.testingStrategy?.unitTestCoverage || 80}% minimum test coverage
2. All tests must pass before marking work complete
3. Follow existing code patterns and conventions
4. Write clear, maintainable code
5. Document complex logic

### Communication
- Report progress regularly to coordinator
- Request help when blocked
- Share findings that might help other agents

## Coordinator Agent

### Primary Responsibilities
1. Orchestrate work across all agents
2. Prioritize tasks based on GOALS.json
3. Monitor progress toward objectives
4. Ensure balanced workload distribution

### Specific Instructions
- Review GOALS.json daily for priority changes
- Create task breakdowns for complex goals
- Track which agent is working on what
- Identify and resolve bottlenecks
- Report overall progress metrics

### Success Metrics
- All goals progressing steadily
- No agent idle while work exists
- Dependencies resolved proactively

## Planner Agent

### Primary Responsibilities
1. Analyze codebase structure and patterns
2. Create detailed implementation plans
3. Identify technical dependencies
4. Suggest architectural improvements

### Specific Instructions
- Study the project structure in \`${project.srcDir || 'src'}/\`
- Understand the testing approach in \`${project.testDir || 'tests'}/\`
- Break complex features into steps
- Consider the architecture: ${project.architecture?.pattern || 'Not specified'}
- Identify reusable patterns

### Planning Priorities
1. Features that support multiple goals
2. Foundation work that enables future features
3. Technical debt that blocks progress
4. Performance and security improvements

## Tester Agent

### Primary Responsibilities
1. Execute test suite regularly
2. Analyze test failures
3. Report coverage metrics
4. Suggest test improvements

### Specific Instructions
- Run tests using: \`${project.testCommand || 'npm test'}\`
- Focus on \`${project.testDir || 'tests'}/\` for test files
- Maintain ${project.testingStrategy?.unitTestCoverage || 80}% coverage minimum
- Report failures immediately to coder
- Track coverage trends over time

### Testing Focus Areas
${project.architecture?.database ? '- Database operations and queries\n' : ''}- API endpoints and responses
- Data validation logic
- Error handling paths
- Edge cases and boundaries

## Coder Agent

### Primary Responsibilities
1. Implement new features
2. Fix bugs and test failures
3. Write corresponding tests
4. Refactor and improve code

### Specific Instructions
- Implement in \`${project.srcDir || 'src'}/\`
- Write tests in \`${project.testDir || 'tests'}/\`
- Follow best practices for: ${project.techStack.join(', ')}
${project.techStack.includes('TypeScript') ? '- Ensure proper TypeScript types\n- Run tsc for type checking\n' : ''}- Test your code before marking complete

### Coding Standards
1. Clear variable and function names
2. Consistent indentation and formatting
3. Comprehensive error handling
4. Appropriate comments for complex logic
5. No console.logs or debug prints in final code

## Reviewer Agent

### Primary Responsibilities
1. Review code quality and standards
2. Check test coverage
3. Identify potential issues
4. Suggest improvements

### Specific Instructions
- Review all code in \`${project.srcDir || 'src'}/\`
- Verify tests in \`${project.testDir || 'tests'}/\`
- Check coverage meets ${project.testingStrategy?.unitTestCoverage || 80}%
- Ensure consistency with architecture
- Look for security vulnerabilities

### Review Checklist
- [ ] Code follows project conventions
- [ ] Tests cover new/modified code
- [ ] No obvious bugs or issues
- [ ] Error handling is appropriate
- [ ] Documentation is updated if needed
- [ ] Performance implications considered
- [ ] Security best practices followed

## Working with Project Goals

All agents should regularly review GOALS.json to understand:
1. Current priorities
2. Overall project direction
3. Success criteria

### Goal Completion Criteria
A goal is considered complete when:
1. All requirements are implemented
2. Tests are written and passing
3. Code is reviewed and approved
4. Coverage meets requirements
5. Documentation is updated

## Collaboration Guidelines

### Inter-Agent Communication
- **Coordinator → All:** Task assignments and priorities
- **Planner → Coordinator:** Implementation plans and dependencies
- **Tester → Coder:** Test failures and coverage gaps
- **Coder → Tester:** Request testing after changes
- **Reviewer → Coder:** Issues found during review
- **All → Coordinator:** Status updates and blockers

### Escalation Path
1. Try to resolve within agent capabilities
2. Request help from relevant agent
3. Escalate to coordinator if blocked
4. Coordinator may request human intervention

---
*These instructions are specific to ${project.name} and should be followed by all agents.*
`;
      await fs.writeFile(path.join(docsDir, 'AGENT_INSTRUCTIONS.md'), agentInstructionsContent);

      // Create PROJECT_REQUIREMENTS.md if requirements data is provided
      if (projectData.requirements && Object.keys(projectData.requirements).length > 0) {
        const req = projectData.requirements;
        const requirementsContent = `# Project Requirements: ${project.name}

## Problem Statement
${req.problemStatement || 'Not specified'}

## Target Users
${(req.targetUsers || []).map(user => `- ${user}`).join('\n') || '- Not specified'}

## Business Value
${req.businessValue || 'Not specified'}

## Success Criteria
${(req.successCriteria || []).map(criterion => `- ${criterion}`).join('\n') || '- Not specified'}

## Detailed Requirements

${(req.requirements || []).map(r => `### ${r.description}
**Type:** ${r.type}\n**Priority:** ${r.priority}\n**Rationale:** ${r.rationale || 'Not specified'}\n\n**Acceptance Criteria:**\n${(r.acceptanceCriteria || []).map(ac => `- ${ac}`).join('\n') || '- Not specified'}\n`).join('\n')}

## Constraints
${(req.constraints || []).map(c => `- ${c}`).join('\n') || '- None specified'}

## Assumptions
${(req.assumptions || []).map(a => `- ${a}`).join('\n') || '- None specified'}

## Out of Scope
${(req.outOfScope || []).map(item => `- ${item}`).join('\n') || '- None specified'}

---
*This requirements document defines what needs to be built and why.*
`;
        await fs.writeFile(path.join(docsDir, 'PROJECT_REQUIREMENTS.md'), requirementsContent);
      }

      // Create project.conf in .agents/config
      const projectConfContent = `# Project Configuration for Agent Framework
# Generated: ${new Date().toISOString()}

# Project Information
PROJECT_NAME="${project.name}"
PROJECT_DESC="${project.description}"
PROJECT_VERSION="0.1.0"
PROJECT_DIR="${projectPath}"

# Technology Stack
LANGUAGE="${project.techStack[0] || 'JavaScript'}"
FRAMEWORKS="${project.techStack.join(', ')}"
DATABASE="${project.architecture?.database || ''}"
TEST_FRAMEWORK="${(project.testingStrategy?.frameworks || []).join(', ')}"

# Project Structure
SRC_DIR="${project.srcDir || 'src'}"
TEST_DIR="${project.testDir || 'tests'}"
BUILD_DIR="${project.buildDir || 'dist'}"

# Testing Configuration
TEST_COMMAND="${project.testCommand || 'npm test'}"
TEST_COVERAGE="${project.testingStrategy?.unitTestCoverage || 80}"

# Agent Framework
FRAMEWORK_DIR="/home/rob/agent-framework"
AGENT_BASE_DIR="${agentsDir}"

# Architecture
ARCHITECTURE="${project.architecture?.pattern || 'Not specified'}"

# Load framework defaults
if [ -f "/home/rob/agent-framework/config/default.conf" ]; then
    source "/home/rob/agent-framework/config/default.conf"
fi
`;
      await fs.writeFile(path.join(configDir, 'project.conf'), projectConfContent);

      // Create basic directory structure
      const directories = ['src', 'tests', 'docs', '.github'];
      for (const dir of directories) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }
      
      // Create .gitignore
      const gitignoreContent = `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
`;
      await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
      
      this.logger.info(`Created initial project files in: ${projectPath}`);
    } catch (error) {
      this.logger.error('Error creating project files:', error);
    }

    // Generate customized tasks using AI
    try {
      this.logger.info('Generating customized project tasks...');
      
      // Emit progress event if available
      if (this.eventEmitter) {
        this.eventEmitter.emit('project:taskCustomization', {
          projectId: project.id,
          status: 'starting',
          message: 'Customizing project tasks with AI...'
        });
      }
      
      // Generate tasks using Claude
      const customizedTasks = await this.taskCustomizer.generateCustomTasks(project);
      
      // Save tasks to project directory
      const tasksFile = await this.taskCustomizer.saveTasksToProject(projectPath, customizedTasks);
      
      // Add task info to project metadata
      project.initialTasks = {
        count: customizedTasks.length,
        customized: customizedTasks.some(t => t.customized),
        distribution: this.taskCustomizer.getTaskDistribution(customizedTasks),
        generatedAt: new Date().toISOString(),
        filePath: tasksFile
      };
      
      // Emit completion event
      if (this.eventEmitter) {
        this.eventEmitter.emit('project:taskCustomization', {
          projectId: project.id,
          status: 'completed',
          message: `Generated ${customizedTasks.length} customized tasks`,
          taskCount: customizedTasks.length,
          distribution: project.initialTasks.distribution
        });
      }
      
      this.logger.info(`Generated ${customizedTasks.length} customized tasks for project`);
    } catch (error) {
      this.logger.error('Failed to customize tasks:', error);
      
      // Emit error event but don't fail project creation
      if (this.eventEmitter) {
        this.eventEmitter.emit('project:taskCustomization', {
          projectId: project.id,
          status: 'error',
          message: 'Using default tasks due to customization error',
          error: error.message
        });
      }
      
      // Create minimal default tasks as fallback
      const fallbackTasks = this.taskCustomizer.createEnhancedDefaultTasks(project);
      await this.taskCustomizer.saveTasksToProject(projectPath, fallbackTasks);
      
      project.initialTasks = {
        count: fallbackTasks.length,
        customized: false,
        fallback: true,
        generatedAt: new Date().toISOString()
      };
    }

    this.projects.set(project.id, project);
    await this.saveProjects();
    
    this.logger.info(`Project created: ${project.name} (${project.id})`);
    return project;
  }

  getProject(projectId) {
    return this.projects.get(projectId);
  }

  getAllProjects() {
    return Array.from(this.projects.values());
  }

  async updateProject(projectId, updates) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    Object.assign(project, updates, {
      updated: new Date().toISOString()
    });

    this.projects.set(projectId, project);
    await this.saveProjects();
    
    this.logger.info(`Project updated: ${projectId}`);
    return project;
  }

  async deleteProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.projects.delete(projectId);
    await this.saveProjects();
    
    this.logger.info(`Project deleted: ${projectId}`);
    return { success: true };
  }

  getProjectState(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      return null;
    }

    // Get actual running agents
    const agentStates = this.getAgentStates(projectId);
    const runningAgentIds = agentStates
      .filter(agent => agent.status === 'running')
      .map(agent => agent.id);

    return {
      ...project,
      agents: runningAgentIds,  // Array of agent IDs for backward compatibility
      agentStates: agentStates,  // Full agent state info
      metrics: this.calculateMetrics(project)
    };
  }

  getAgentStates(projectId) {
    const project = this.projects.get(projectId);
    if (!project) return [];

    // Get actual agent states from IntegratedAgentManager
    if (this.agentManager) {
      const runningAgents = this.agentManager.getAllAgentsForProject(projectId);
      return runningAgents;
    }

    // Fallback if agent manager not available
    return [];
  }

  calculateMetrics(project) {
    const totalGoals = project.goals.length;
    const completedGoals = project.goals.filter(g => g.status === 'completed').length;
    
    // Get actual running agents count
    let activeAgents = 0;
    if (this.agentManager) {
      const runningAgents = this.agentManager.getAllAgentsForProject(project.id);
      activeAgents = runningAgents.filter(a => a.status === 'running').length;
    }
    
    return {
      totalGoals,
      completedGoals,
      progress: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
      activeAgents
    };
  }

  async updateGoal(projectId, goalId, update) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const goal = project.goals.find(g => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    Object.assign(goal, update, {
      updated: new Date().toISOString()
    });

    // Save to GOALS.json
    try {
      const goalsPath = path.join(project.path, 'GOALS.json');
      await fs.writeFile(goalsPath, JSON.stringify(project.goals, null, 2));
    } catch (error) {
      this.logger.error('Error saving goals:', error);
    }

    await this.updateProject(projectId, { goals: project.goals });
    return goal;
  }

  async validateProject(projectPath) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check required files
    const requiredFiles = ['PROJECT_SPEC.md', 'GOALS.json'];
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(projectPath, file));
      } catch (error) {
        validation.valid = false;
        validation.errors.push(`Missing required file: ${file}`);
      }
    }

    // Check optional files
    const optionalFiles = ['TECH_STACK.md', 'TESTING_STRATEGY.md', 'ARCHITECTURE.md'];
    for (const file of optionalFiles) {
      try {
        await fs.access(path.join(projectPath, file));
      } catch (error) {
        validation.warnings.push(`Missing optional file: ${file}`);
      }
    }

    return validation;
  }
}

module.exports = ProjectManager;
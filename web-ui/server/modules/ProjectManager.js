const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ProjectManager {
  constructor(logger) {
    this.logger = logger;
    this.projects = new Map();
    this.agentManager = null; // Will be set by server
    this.loadProjects();
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

    // Create initial project files
    try {
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
      
      // Create PROJECT_SPEC.md
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
      await fs.writeFile(path.join(projectPath, 'PROJECT_SPEC.md'), specContent);
      
      // Create GOALS.json
      await fs.writeFile(
        path.join(projectPath, 'GOALS.json'), 
        JSON.stringify(project.goals, null, 2)
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
        await fs.writeFile(path.join(projectPath, 'PROJECT_VISION.md'), visionContent);
      }
      
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
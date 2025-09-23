const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ProjectManager {
  constructor(logger) {
    this.logger = logger;
    this.projects = new Map();
    this.loadProjects();
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
    const project = {
      id: uuidv4(),
      name: projectData.name,
      path: projectData.path,
      description: projectData.description || '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'inactive',
      agents: [],
      goals: [],
      config: projectData.config || {}
    };

    // Validate project path exists
    try {
      await fs.access(project.path);
    } catch (error) {
      throw new Error(`Project path does not exist: ${project.path}`);
    }

    // Check for required files
    const requiredFiles = ['PROJECT_SPEC.md', 'GOALS.json'];
    for (const file of requiredFiles) {
      const filePath = path.join(project.path, file);
      try {
        await fs.access(filePath);
      } catch (error) {
        this.logger.warn(`Required file missing: ${file}`);
      }
    }

    // Load goals if available
    try {
      const goalsPath = path.join(project.path, 'GOALS.json');
      const goalsData = await fs.readFile(goalsPath, 'utf8');
      project.goals = JSON.parse(goalsData);
    } catch (error) {
      this.logger.warn('Could not load GOALS.json:', error.message);
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

    return {
      ...project,
      agents: this.getAgentStates(projectId),
      metrics: this.calculateMetrics(project)
    };
  }

  getAgentStates(projectId) {
    const project = this.projects.get(projectId);
    if (!project) return [];

    // This would integrate with AgentManager
    return project.agents.map(agentId => ({
      id: agentId,
      status: 'unknown',
      lastActivity: null
    }));
  }

  calculateMetrics(project) {
    const totalGoals = project.goals.length;
    const completedGoals = project.goals.filter(g => g.status === 'completed').length;
    
    return {
      totalGoals,
      completedGoals,
      progress: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
      activeAgents: project.agents.length
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
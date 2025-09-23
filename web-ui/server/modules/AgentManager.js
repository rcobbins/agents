const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class AgentManager {
  constructor(logger) {
    this.logger = logger;
    this.agents = new Map();
    this.healthCheckInterval = null;
  }

  async launchAgent(projectId, agentType, config = {}) {
    const agentKey = `${projectId}:${agentType}`;
    
    // Check if agent is already running
    if (this.agents.has(agentKey)) {
      const agent = this.agents.get(agentKey);
      if (agent.status === 'running') {
        throw new Error(`Agent ${agentType} is already running for project ${projectId}`);
      }
    }

    // Get framework directory
    const frameworkDir = path.join(__dirname, '../../..');
    const agentScript = path.join(frameworkDir, 'agents', 'templates', `${agentType}.sh`);
    
    // Verify agent script exists
    try {
      await fs.access(agentScript);
    } catch (error) {
      throw new Error(`Agent script not found: ${agentType}`);
    }

    // Spawn agent process
    const agentProcess = spawn('bash', [agentScript], {
      cwd: config.projectPath || process.cwd(),
      env: {
        ...process.env,
        PROJECT_ID: projectId,
        AGENT_TYPE: agentType,
        PROJECT_PATH: config.projectPath || process.cwd(),
        DEBUG: config.debug || false,
        ...config.env
      },
      detached: false
    });

    // Create agent record
    const agent = {
      id: agentType,
      projectId,
      process: agentProcess,
      pid: agentProcess.pid,
      status: 'running',
      startTime: new Date().toISOString(),
      config,
      logs: [],
      errors: []
    };

    // Handle stdout
    agentProcess.stdout.on('data', (data) => {
      const message = data.toString();
      agent.logs.push({
        timestamp: new Date().toISOString(),
        message
      });
      
      // Keep only last 100 logs
      if (agent.logs.length > 100) {
        agent.logs.shift();
      }
      
      this.logger.info(`[${agentType}] ${message.trim()}`);
    });

    // Handle stderr
    agentProcess.stderr.on('data', (data) => {
      const error = data.toString();
      agent.errors.push({
        timestamp: new Date().toISOString(),
        error
      });
      
      // Keep only last 50 errors
      if (agent.errors.length > 50) {
        agent.errors.shift();
      }
      
      this.logger.error(`[${agentType}] ${error.trim()}`);
    });

    // Handle process exit
    agentProcess.on('exit', (code, signal) => {
      agent.status = 'stopped';
      agent.exitCode = code;
      agent.exitSignal = signal;
      agent.endTime = new Date().toISOString();
      
      this.logger.info(`Agent ${agentType} exited with code ${code}`);
      
      // Auto-restart if configured
      if (config.autoRestart && code !== 0) {
        setTimeout(() => {
          this.launchAgent(projectId, agentType, config);
        }, 5000);
      }
    });

    // Handle process error
    agentProcess.on('error', (error) => {
      agent.status = 'error';
      agent.error = error.message;
      this.logger.error(`Agent ${agentType} error:`, error);
    });

    // Store agent
    this.agents.set(agentKey, agent);
    
    this.logger.info(`Agent ${agentType} launched for project ${projectId} (PID: ${agent.pid})`);
    return {
      id: agentType,
      pid: agent.pid,
      status: 'running'
    };
  }

  async stopAgent(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for project ${projectId}`);
    }

    if (agent.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running`);
    }

    // Send SIGTERM to gracefully stop
    agent.process.kill('SIGTERM');
    agent.status = 'stopping';

    // Force kill after 10 seconds
    setTimeout(() => {
      if (agent.status === 'stopping') {
        agent.process.kill('SIGKILL');
        agent.status = 'stopped';
      }
    }, 10000);

    this.logger.info(`Stopping agent ${agentId} for project ${projectId}`);
    return { success: true };
  }

  restartAgent(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for project ${projectId}`);
    }

    const config = agent.config;
    
    return this.stopAgent(projectId, agentId)
      .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
      .then(() => this.launchAgent(projectId, agentId, config));
  }

  getAgentStatus(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      return {
        id: agentId,
        status: 'not_running'
      };
    }

    return {
      id: agentId,
      pid: agent.pid,
      status: agent.status,
      startTime: agent.startTime,
      endTime: agent.endTime,
      uptime: this.calculateUptime(agent),
      logs: agent.logs.slice(-10),
      errors: agent.errors.slice(-5)
    };
  }

  getAllAgentsForProject(projectId) {
    const agents = [];
    
    for (const [key, agent] of this.agents) {
      if (key.startsWith(`${projectId}:`)) {
        agents.push({
          id: agent.id,
          status: agent.status,
          startTime: agent.startTime,
          uptime: this.calculateUptime(agent)
        });
      }
    }
    
    return agents;
  }

  calculateUptime(agent) {
    if (!agent.startTime) return 0;
    
    const start = new Date(agent.startTime);
    const end = agent.endTime ? new Date(agent.endTime) : new Date();
    return Math.floor((end - start) / 1000);
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      for (const [key, agent] of this.agents) {
        if (agent.status === 'running' && agent.process) {
          try {
            // Check if process is still alive
            process.kill(agent.pid, 0);
          } catch (error) {
            // Process is dead
            agent.status = 'crashed';
            agent.endTime = new Date().toISOString();
            this.logger.error(`Agent ${agent.id} has crashed`);
            
            // Auto-restart if configured
            if (agent.config.autoRestart) {
              this.launchAgent(agent.projectId, agent.id, agent.config);
            }
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  stopAllAgents() {
    this.logger.info('Stopping all agents...');
    
    for (const [key, agent] of this.agents) {
      if (agent.status === 'running' && agent.process) {
        agent.process.kill('SIGTERM');
      }
    }
    
    // Clear the map
    this.agents.clear();
  }

  async getAgentLogs(projectId, agentId, lines = 50) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      // Try to read from file
      const frameworkDir = path.join(__dirname, '../../..');
      const logFile = path.join(
        frameworkDir,
        '.agents',
        'logs',
        `${agentId}_${new Date().toISOString().split('T')[0]}.log`
      );
      
      try {
        const content = await fs.readFile(logFile, 'utf8');
        const logLines = content.split('\n').slice(-lines);
        return logLines;
      } catch (error) {
        return [];
      }
    }
    
    return agent.logs.slice(-lines).map(l => l.message);
  }
}

module.exports = AgentManager;
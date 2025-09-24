const { exec } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

/**
 * AgentLauncherSimple - Simple launcher using exec to avoid spawn/fork issues
 */
class AgentLauncherSimple extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger || console;
    this.agents = new Map();
  }
  
  /**
   * Launch an agent
   */
  async launchAgent(projectId, agentType, config = {}) {
    const agentKey = `${projectId}:${agentType}`;
    
    // Check if agent is already running
    if (this.agents.has(agentKey)) {
      const agent = this.agents.get(agentKey);
      if (agent.status === 'running') {
        throw new Error(`Agent ${agentType} is already running for project ${projectId}`);
      }
    }
    
    // Determine the runner script path
    const runnerScript = path.join(__dirname, '..', 'agents', 'runners', `run-${agentType}.js`);
    
    try {
      // Use exec to launch the agent
      this.logger.info(`Launching agent ${agentType} for project ${projectId}`);
      
      // Build environment variables string
      const envVars = {
        PROJECT_ID: projectId,
        PROJECT_PATH: config.projectPath || process.cwd(),
        AGENT_TYPE: agentType,
        DEBUG: config.debug || false
      };
      
      const envString = Object.entries(envVars)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      
      // Execute the script
      const command = `node "${runnerScript}"`;
      this.logger.info(`Executing: ${command}`);
      
      const agentProcess = exec(command, {
        cwd: config.projectPath || process.cwd(),
        env: { ...process.env, ...envVars },
        shell: '/bin/bash'  // Explicitly use bash
      });
      
      // Create agent record
      const agent = {
        id: agentType,
        projectId: projectId,
        process: agentProcess,
        pid: agentProcess.pid,
        status: 'running',
        startTime: new Date().toISOString(),
        config: config,
        logs: [],
        errors: []
      };
      
      // Handle stdout
      agentProcess.stdout.on('data', (data) => {
        const message = data.toString();
        agent.logs.push({
          timestamp: new Date().toISOString(),
          message: message.trim()
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
          error: error.trim()
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
        this.emit('agentStopped', { agentKey, code, signal });
      });
      
      // Handle process errors
      agentProcess.on('error', (error) => {
        agent.status = 'error';
        agent.error = error.message;
        this.logger.error(`Agent ${agentType} error:`, error);
        this.emit('agentError', { agentKey, error });
      });
      
      // Store agent
      this.agents.set(agentKey, agent);
      
      this.logger.info(`Agent ${agentType} launched successfully (PID: ${agent.pid})`);
      this.emit('agentLaunched', { agentKey, pid: agent.pid });
      
      return {
        id: agentType,
        pid: agent.pid,
        status: 'running'
      };
      
    } catch (error) {
      this.logger.error(`Failed to launch agent ${agentType}:`, error);
      throw error;
    }
  }
  
  /**
   * Stop an agent
   */
  async stopAgent(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for project ${projectId}`);
    }
    
    if (agent.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running`);
    }
    
    // Kill the process
    agent.process.kill('SIGTERM');
    agent.status = 'stopping';
    
    this.logger.info(`Stopping agent ${agentId} for project ${projectId}`);
    
    // Force kill after 10 seconds
    setTimeout(() => {
      if (agent.status === 'stopping') {
        agent.process.kill('SIGKILL');
        agent.status = 'stopped';
        this.logger.warn(`Force killed agent ${agentId}`);
      }
    }, 10000);
    
    return { success: true };
  }
  
  /**
   * Get agent status
   */
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
      logs: agent.logs.slice(-10),
      errors: agent.errors.slice(-5)
    };
  }
  
  /**
   * Get all agents for a project
   */
  getAllAgentsForProject(projectId) {
    const agents = [];
    
    for (const [key, agent] of this.agents) {
      if (key.startsWith(`${projectId}:`)) {
        agents.push({
          id: agent.id,
          status: agent.status,
          pid: agent.pid,
          startTime: agent.startTime
        });
      }
    }
    
    return agents;
  }
  
  /**
   * Stop all agents
   */
  async stopAllAgents() {
    this.logger.info('Stopping all agents...');
    
    const promises = [];
    for (const [key, agent] of this.agents) {
      if (agent.status === 'running' && agent.process) {
        const [projectId, agentId] = key.split(':');
        promises.push(this.stopAgent(projectId, agentId));
      }
    }
    
    await Promise.allSettled(promises);
    
    // Clear the map
    this.agents.clear();
  }
  
  /**
   * Get agent logs
   */
  getAgentLogs(projectId, agentId, lines = 50) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      return [];
    }
    
    return agent.logs.slice(-lines).map(l => l.message);
  }
  
  /**
   * Restart an agent
   */
  async restartAgent(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found for project ${projectId}`);
    }
    
    const config = agent.config;
    
    await this.stopAgent(projectId, agentId);
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.launchAgent(projectId, agentId, config);
  }
  
  // Stub methods for compatibility
  sendMessageToAgent() {
    this.logger.warn('IPC messaging not supported with exec launcher');
    return false;
  }
  
  healthCheck() {
    return {
      healthy: [],
      unhealthy: [],
      stopped: []
    };
  }
}

module.exports = AgentLauncherSimple;
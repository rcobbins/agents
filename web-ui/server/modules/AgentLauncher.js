const { fork } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

/**
 * AgentLauncher - Launches agents using child_process.fork() to avoid spawn issues
 */
class AgentLauncher extends EventEmitter {
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
    
    // Prepare environment variables
    const env = {
      ...process.env,
      PROJECT_ID: projectId,
      PROJECT_PATH: config.projectPath || process.cwd(),
      AGENT_TYPE: agentType,
      DEBUG: config.debug || false,
      ...config.env
    };
    
    try {
      // Use fork to launch the agent in a separate Node.js process
      this.logger.info(`Launching agent ${agentType} for project ${projectId}`);
      
      const agentProcess = fork(runnerScript, [], {
        env: env,
        cwd: config.projectPath || process.cwd(),
        silent: false // Allow stdout/stderr to be inherited
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
        errors: [],
        messageQueue: []
      };
      
      // Handle IPC messages from agent
      agentProcess.on('message', (message) => {
        this.handleAgentMessage(agentKey, message);
      });
      
      // Handle stdout (if silent mode is enabled)
      if (agentProcess.stdout) {
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
      }
      
      // Handle stderr
      if (agentProcess.stderr) {
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
      }
      
      // Handle process exit
      agentProcess.on('exit', (code, signal) => {
        agent.status = 'stopped';
        agent.exitCode = code;
        agent.exitSignal = signal;
        agent.endTime = new Date().toISOString();
        
        this.logger.info(`Agent ${agentType} exited with code ${code}`);
        this.emit('agentStopped', { agentKey, code, signal });
        
        // Auto-restart if configured
        if (config.autoRestart && code !== 0) {
          this.logger.info(`Auto-restarting agent ${agentType} in 5 seconds...`);
          setTimeout(() => {
            this.launchAgent(projectId, agentType, config)
              .catch(err => this.logger.error(`Failed to auto-restart ${agentType}: ${err.message}`));
          }, 5000);
        }
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
   * Handle IPC messages from agents
   */
  handleAgentMessage(agentKey, message) {
    const agent = this.agents.get(agentKey);
    if (!agent) return;
    
    // Store message
    agent.messageQueue.push({
      timestamp: new Date().toISOString(),
      message
    });
    
    // Keep only last 50 messages
    if (agent.messageQueue.length > 50) {
      agent.messageQueue.shift();
    }
    
    // Handle different message types
    switch (message.type) {
      case 'log':
        this.logger.info(`[IPC:${agent.id}] ${message.level}: ${message.message}`);
        break;
        
      case 'status':
        agent.lastStatus = message.status;
        this.emit('agentStatus', { agentKey, status: message.status });
        break;
        
      case 'error':
        this.logger.error(`[IPC:${agent.id}] Error: ${message.error}`);
        this.emit('agentError', { agentKey, error: message.error });
        break;
        
      case 'heartbeat':
        agent.lastHeartbeat = new Date().toISOString();
        break;
        
      default:
        this.emit('agentMessage', { agentKey, message });
    }
  }
  
  /**
   * Send message to agent via IPC
   */
  sendMessageToAgent(projectId, agentId, message) {
    const agentKey = `${projectId}:${agentId}`;
    const agent = this.agents.get(agentKey);
    
    if (!agent || agent.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running`);
    }
    
    try {
      agent.process.send(message);
      this.logger.info(`Message sent to agent ${agentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to agent ${agentId}:`, error);
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
    
    // Send SIGTERM to gracefully stop
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
      uptime: this.calculateUptime(agent),
      lastHeartbeat: agent.lastHeartbeat,
      lastStatus: agent.lastStatus,
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
          startTime: agent.startTime,
          uptime: this.calculateUptime(agent),
          lastHeartbeat: agent.lastHeartbeat
        });
      }
    }
    
    return agents;
  }
  
  /**
   * Calculate agent uptime
   */
  calculateUptime(agent) {
    if (!agent.startTime) return 0;
    
    const start = new Date(agent.startTime);
    const end = agent.endTime ? new Date(agent.endTime) : new Date();
    return Math.floor((end - start) / 1000);
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
   * Health check for all agents
   */
  async healthCheck() {
    const health = {
      healthy: [],
      unhealthy: [],
      stopped: []
    };
    
    for (const [key, agent] of this.agents) {
      if (agent.status === 'running') {
        // Check if agent responded recently
        if (agent.lastHeartbeat) {
          const lastHeartbeatMs = new Date(agent.lastHeartbeat).getTime();
          const timeSinceHeartbeat = Date.now() - lastHeartbeatMs;
          
          if (timeSinceHeartbeat < 60000) { // Less than 1 minute
            health.healthy.push(key);
          } else {
            health.unhealthy.push(key);
          }
        } else {
          health.unhealthy.push(key);
        }
      } else {
        health.stopped.push(key);
      }
    }
    
    return health;
  }
}

module.exports = AgentLauncher;
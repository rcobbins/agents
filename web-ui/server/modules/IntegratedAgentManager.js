const EventEmitter = require('events');
const path = require('path');

/**
 * IntegratedAgentManager - Manages agents as in-process modules
 * Eliminates the need for spawning separate processes
 */
class IntegratedAgentManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger || console;
    this.agents = new Map();
    this.messageQueue = null; // Will be set to InMemoryMessageQueue
  }
  
  /**
   * Set the message queue for inter-agent communication
   */
  setMessageQueue(messageQueue) {
    this.messageQueue = messageQueue;
  }
  
  /**
   * Set the task manager for task distribution
   */
  setTaskManager(taskManager) {
    this.taskManager = taskManager;
  }
  
  /**
   * Launch an agent as an in-process module
   */
  async launchAgent(projectId, agentType, config = {}) {
    const agentKey = `${projectId}:${agentType}`;
    
    // Check if agent is already running
    if (this.agents.has(agentKey)) {
      const agentInfo = this.agents.get(agentKey);
      if (agentInfo.status === 'running') {
        throw new Error(`Agent ${agentType} is already running for project ${projectId}`);
      }
    }
    
    try {
      // Dynamically require the appropriate agent class
      let AgentClass;
      switch (agentType) {
        case 'coordinator':
          AgentClass = require('../agents/CoordinatorAgent');
          break;
        case 'planner':
          AgentClass = require('../agents/PlannerAgent');
          break;
        case 'coder':
          AgentClass = require('../agents/CoderAgent');
          break;
        case 'tester':
          AgentClass = require('../agents/TesterAgent');
          break;
        case 'reviewer':
          AgentClass = require('../agents/ReviewerAgent');
          break;
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }
      
      // Create agent instance
      const projectPath = config.projectPath || process.cwd();
      const agent = new AgentClass(projectPath);
      
      // Set integrated mode if the agent supports it
      if (agent.setRunMode) {
        agent.setRunMode('integrated');
      }
      
      // Set the shared message queue if available
      if (this.messageQueue && agent.setMessageQueue) {
        agent.setMessageQueue(this.messageQueue);
      }
      
      // Set the task manager if available
      if (this.taskManager && agent.setTaskManager) {
        agent.setTaskManager(this.taskManager);
      }
      
      // Create agent info record
      const agentInfo = {
        id: agentType,
        projectId: projectId,
        agent: agent,
        status: 'starting',
        startTime: new Date().toISOString(),
        config: config,
        logs: [],
        errors: [],
        lastHeartbeat: new Date().toISOString(),
        metrics: {
          messagesProcessed: 0,
          tasksCompleted: 0,
          errors: 0
        }
      };
      
      // Set up event listeners
      this.setupAgentListeners(agentKey, agent, agentInfo);
      
      // Store agent info
      this.agents.set(agentKey, agentInfo);
      
      // Initialize and start agent in non-blocking way
      setImmediate(async () => {
        try {
          this.logger.info(`Starting ${agentType} agent for project ${projectId}`);
          
          // Initialize the agent
          await agent.initialize();
          
          // Update status
          agentInfo.status = 'running';
          this.emit('agentStarted', { agentKey, agentType, projectId });
          
          // Start the event loop
          agent.runEventLoop().catch(error => {
            this.logger.error(`Agent ${agentType} event loop error:`, error);
            agentInfo.status = 'error';
            agentInfo.error = error.message;
            this.emit('agentError', { agentKey, error });
          });
          
        } catch (error) {
          this.logger.error(`Failed to initialize agent ${agentType}:`, error);
          agentInfo.status = 'error';
          agentInfo.error = error.message;
          this.emit('agentError', { agentKey, error });
        }
      });
      
      this.logger.info(`Agent ${agentType} launched successfully (integrated mode)`);
      
      return {
        id: agentType,
        status: 'starting'
      };
      
    } catch (error) {
      this.logger.error(`Failed to launch agent ${agentType}:`, error);
      throw error;
    }
  }
  
  /**
   * Set up event listeners for an agent
   */
  setupAgentListeners(agentKey, agent, agentInfo) {
    // Log events
    agent.on('log', (data) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: data.level || 'info',
        message: data.message
      };
      
      agentInfo.logs.push(logEntry);
      
      // Keep only last 100 logs
      if (agentInfo.logs.length > 100) {
        agentInfo.logs.shift();
      }
      
      this.logger.info(`[${agentInfo.id}] ${logEntry.message}`);
      // Emit with both old and new event names for compatibility
      this.emit('agentLog', { 
        agentKey, 
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        message: logEntry.message,
        log: logEntry 
      });
    });
    
    // Status updates
    agent.on('statusUpdated', (status) => {
      agentInfo.lastStatus = status;
      agentInfo.lastHeartbeat = new Date().toISOString();
      this.emit('agentStatus', { agentKey, status });
    });
    
    // Task completion
    agent.on('taskCompleted', (task) => {
      agentInfo.metrics.tasksCompleted++;
      this.emit('agentTaskCompleted', { agentKey, task });
    });
    
    // Message processed
    agent.on('messageProcessed', (message) => {
      agentInfo.metrics.messagesProcessed++;
      this.emit('agentMessageProcessed', { agentKey, message });
    });
    
    // Error events
    agent.on('error', (error) => {
      agentInfo.metrics.errors++;
      agentInfo.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message || error
      });
      
      // Keep only last 50 errors
      if (agentInfo.errors.length > 50) {
        agentInfo.errors.shift();
      }
      
      this.logger.error(`[${agentInfo.id}] Error:`, error);
      this.emit('agentError', { agentKey, error });
    });
    
    // Enhanced events for detailed monitoring
    
    // Agent thought process events
    agent.on('thought', (thoughtData) => {
      const thought = {
        ...thoughtData,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: thoughtData.timestamp || new Date().toISOString()
      };
      
      // Store recent thoughts (keep last 500)
      if (!agentInfo.thoughts) {
        agentInfo.thoughts = [];
      }
      agentInfo.thoughts.push(thought);
      if (agentInfo.thoughts.length > 500) {
        agentInfo.thoughts.shift();
      }
      
      this.emit('agentThought', thought);
    });
    
    // Agent decision events
    agent.on('decision', (decisionData) => {
      const decision = {
        ...decisionData,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('agentDecision', decision);
    });
    
    // Agent planning events
    agent.on('planning', (planData) => {
      const plan = {
        ...planData,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('agentPlanning', plan);
    });
    
    // File operation events
    agent.on('fileOperation', (operation) => {
      const fileOp = {
        ...operation,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('agentFileOperation', fileOp);
    });
    
    // Task state changes
    agent.on('taskStateChange', (taskData) => {
      const stateChange = {
        ...taskData,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('taskStateChange', stateChange);
    });
    
    // Inter-agent message events
    agent.on('messageSent', (msgData) => {
      const message = {
        ...msgData,
        from: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('interAgentMessage', message);
    });
    
    // Test execution events (for Tester agent)
    agent.on('testExecution', (testData) => {
      const test = {
        ...testData,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('testExecution', test);
    });
    
    // Code review events (for Reviewer agent)
    agent.on('codeReview', (reviewData) => {
      const review = {
        ...reviewData,
        agentId: agentInfo.id,
        projectId: agentInfo.projectId,
        timestamp: new Date().toISOString()
      };
      
      this.emit('codeReview', review);
    });
  }
  
  /**
   * Stop an agent
   */
  async stopAgent(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agentInfo = this.agents.get(agentKey);
    
    if (!agentInfo) {
      throw new Error(`Agent ${agentId} not found for project ${projectId}`);
    }
    
    if (agentInfo.status !== 'running' && agentInfo.status !== 'starting') {
      throw new Error(`Agent ${agentId} is not running`);
    }
    
    try {
      agentInfo.status = 'stopping';
      
      // Call agent's shutdown method if it exists
      if (agentInfo.agent && agentInfo.agent.shutdown) {
        await agentInfo.agent.shutdown();
      }
      
      // Remove all listeners
      if (agentInfo.agent) {
        agentInfo.agent.removeAllListeners();
      }
      
      agentInfo.status = 'stopped';
      agentInfo.endTime = new Date().toISOString();
      
      this.logger.info(`Agent ${agentId} stopped for project ${projectId}`);
      this.emit('agentStopped', { agentKey });
      
      return { success: true };
      
    } catch (error) {
      this.logger.error(`Error stopping agent ${agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Restart an agent
   */
  async restartAgent(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agentInfo = this.agents.get(agentKey);
    
    if (!agentInfo) {
      throw new Error(`Agent ${agentId} not found for project ${projectId}`);
    }
    
    const config = agentInfo.config;
    
    // Stop the agent
    await this.stopAgent(projectId, agentId);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Remove from map
    this.agents.delete(agentKey);
    
    // Relaunch
    return this.launchAgent(projectId, agentId, config);
  }
  
  /**
   * Get agent status
   */
  getAgentStatus(projectId, agentId) {
    const agentKey = `${projectId}:${agentId}`;
    const agentInfo = this.agents.get(agentKey);
    
    if (!agentInfo) {
      return {
        id: agentId,
        status: 'not_running'
      };
    }
    
    return {
      id: agentId,
      status: agentInfo.status,
      startTime: agentInfo.startTime,
      endTime: agentInfo.endTime,
      uptime: this.calculateUptime(agentInfo),
      lastHeartbeat: agentInfo.lastHeartbeat,
      lastStatus: agentInfo.lastStatus,
      metrics: agentInfo.metrics,
      logs: agentInfo.logs.slice(-10),
      errors: agentInfo.errors.slice(-5)
    };
  }
  
  /**
   * Get all agents for a project
   */
  getAllAgentsForProject(projectId) {
    const agents = [];
    
    for (const [key, agentInfo] of this.agents) {
      if (key.startsWith(`${projectId}:`)) {
        agents.push({
          id: agentInfo.id,
          status: agentInfo.status,
          startTime: agentInfo.startTime,
          uptime: this.calculateUptime(agentInfo),
          lastHeartbeat: agentInfo.lastHeartbeat,
          metrics: agentInfo.metrics
        });
      }
    }
    
    return agents;
  }
  
  /**
   * Send message to an agent
   */
  sendMessageToAgent(projectId, agentId, message) {
    const agentKey = `${projectId}:${agentId}`;
    const agentInfo = this.agents.get(agentKey);
    
    if (!agentInfo || agentInfo.status !== 'running') {
      throw new Error(`Agent ${agentId} is not running`);
    }
    
    // If agent has a receiveMessage method, use it
    if (agentInfo.agent && agentInfo.agent.receiveMessage) {
      agentInfo.agent.receiveMessage(message);
      this.logger.info(`Message sent to agent ${agentId}`);
      return true;
    }
    
    // Otherwise use the message queue if available
    if (this.messageQueue) {
      this.messageQueue.send(agentId, message);
      return true;
    }
    
    throw new Error(`Cannot send message to agent ${agentId} - no messaging mechanism available`);
  }
  
  /**
   * Stop all agents
   */
  async stopAllAgents() {
    this.logger.info('Stopping all integrated agents...');
    
    const promises = [];
    for (const [key, agentInfo] of this.agents) {
      if (agentInfo.status === 'running' || agentInfo.status === 'starting') {
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
    const agentInfo = this.agents.get(agentKey);
    
    if (!agentInfo) {
      return [];
    }
    
    return agentInfo.logs.slice(-lines).map(l => l.message);
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
    
    const now = Date.now();
    
    for (const [key, agentInfo] of this.agents) {
      if (agentInfo.status === 'running') {
        // Check if agent responded recently (within last minute)
        const lastHeartbeatMs = new Date(agentInfo.lastHeartbeat).getTime();
        const timeSinceHeartbeat = now - lastHeartbeatMs;
        
        if (timeSinceHeartbeat < 60000) { // Less than 1 minute
          health.healthy.push(key);
        } else {
          health.unhealthy.push(key);
        }
      } else {
        health.stopped.push(key);
      }
    }
    
    return health;
  }
  
  /**
   * Calculate agent uptime
   */
  calculateUptime(agentInfo) {
    if (!agentInfo.startTime) return 0;
    
    const start = new Date(agentInfo.startTime);
    const end = agentInfo.endTime ? new Date(agentInfo.endTime) : new Date();
    return Math.floor((end - start) / 1000);
  }
  
  /**
   * Start health check monitoring
   */
  startHealthChecks(interval = 30000) {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      
      if (health.unhealthy.length > 0) {
        this.logger.warn(`Unhealthy agents detected: ${health.unhealthy.join(', ')}`);
        this.emit('unhealthyAgents', health.unhealthy);
      }
    }, interval);
  }
  
  /**
   * Stop health check monitoring
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

module.exports = IntegratedAgentManager;
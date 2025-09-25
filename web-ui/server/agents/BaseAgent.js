const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const ClaudeCliWrapper = require('./ClaudeCliWrapper');

/**
 * BaseAgent - Core functionality for all AI agents
 * Replicates and enhances the bash base-agent.sh functionality
 */
class BaseAgent extends EventEmitter {
  constructor(agentName, agentRole, projectDir) {
    super();
    
    this.agentName = agentName;
    this.agentRole = agentRole;
    // Resolve ~ to home directory
    this.projectDir = (projectDir || process.cwd()).replace(/^~/, os.homedir());
    this.agentBaseDir = path.join(this.projectDir, '.agents');
    
    // Run mode: 'integrated' or 'standalone'
    this.runMode = 'standalone';
    this.integratedMessageQueue = null;
    
    // Core directories
    this.directories = {
      inbox: path.join(this.agentBaseDir, 'inboxes', agentName),
      outbox: path.join(this.agentBaseDir, 'outboxes', agentName),
      workspace: path.join(this.agentBaseDir, 'workspace', agentName),
      logs: path.join(this.agentBaseDir, 'logs'),
      status: path.join(this.agentBaseDir, 'status'),
      docs: path.join(this.agentBaseDir, 'docs')
    };
    
    this.logFile = path.join(this.directories.logs, `${agentName}.log`);
    this.statusFile = path.join(this.directories.status, `${agentName}.status`);
    
    // Project documentation
    this.projectSpec = null;
    this.projectVision = null;
    this.goals = null;
    this.agentInstructions = null;
    
    // State
    this.isRunning = false;
    this.eventLoopInterval = null;
    this.messageQueue = [];
    this.messageUnsubscribe = null;
    
    // Claude CLI integration
    this.claude = new ClaudeCliWrapper(agentName);
  }
  
  /**
   * Set run mode (integrated or standalone)
   */
  setRunMode(mode) {
    if (mode !== 'integrated' && mode !== 'standalone') {
      throw new Error(`Invalid run mode: ${mode}`);
    }
    this.runMode = mode;
    this.log(`Run mode set to: ${mode}`);
  }
  
  /**
   * Set the message queue for integrated mode
   */
  setMessageQueue(messageQueue) {
    this.integratedMessageQueue = messageQueue;
    
    // Subscribe to messages if in integrated mode
    if (this.runMode === 'integrated' && messageQueue) {
      // Unsubscribe from previous queue if any
      if (this.messageUnsubscribe) {
        this.messageUnsubscribe();
      }
      
      // Subscribe to new queue
      this.messageUnsubscribe = messageQueue.subscribe(this.agentName, (message) => {
        this.handleIncomingMessage(message);
      });
      
      this.log('Subscribed to integrated message queue');
    }
  }
  
  /**
   * Handle incoming messages in integrated mode
   */
  handleIncomingMessage(message) {
    // Add to internal queue for processing
    this.messageQueue.push(message);
    
    // Emit event
    this.emit('messageReceived', message);
    
    // If not running event loop, process immediately
    if (!this.eventLoopInterval) {
      setImmediate(() => this.processMessages());
    }
  }
  
  /**
   * Process queued messages (for integrated mode)
   */
  async processMessages() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        // Handle control messages
        if (message.type === 'control') {
          await this.handleControlMessage(message);
        } 
        // Handle task messages
        else if (message.type === 'task') {
          await this.handleTaskMessage(message);
        }
        // Handle other message types
        else {
          await this.handleGenericMessage(message);
        }
        
        // Emit event for processed message
        this.emit('messageProcessed', message);
        
        // Update heartbeat on activity
        this.emit('statusUpdated', {
          agent: this.agentName,
          status: 'processing',
          details: `Processing message from ${message.from}`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logError(`Failed to process message: ${error.message}`);
        this.emit('error', error);
      }
    }
  }
  
  /**
   * Handle task messages (can be overridden by specific agents)
   */
  async handleTaskMessage(message) {
    this.log(`Processing task message from ${message.from}: ${JSON.stringify(message.content)}`);
    // Default implementation - specific agents should override this
  }
  
  /**
   * Handle control messages
   */
  async handleControlMessage(message) {
    this.log(`Processing control message: ${message.content}`);
    
    if (message.content === 'shutdown') {
      await this.shutdown();
    } else if (message.content === 'status') {
      this.emit('statusUpdated', {
        agent: this.agentName,
        status: this.isRunning ? 'running' : 'stopped',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Handle generic messages
   */
  async handleGenericMessage(message) {
    this.log(`Received message from ${message.from}: ${JSON.stringify(message.content)}`);
    // Default implementation
  }
  
  /**
   * Ask Claude - wrapper for Claude CLI integration
   */
  async askClaude(prompt, context = '') {
    try {
      // Limit context size to prevent command-line issues
      const MAX_CONTEXT_LENGTH = 5000;
      
      // Build context with size limits
      let projectContext = context;
      if (!projectContext) {
        const visionSummary = this.projectVision ? 
          this.projectVision.substring(0, 1000) + (this.projectVision.length > 1000 ? '...[truncated]' : '') : 
          'Not loaded';
        
        const specSummary = this.projectSpec ? 
          this.projectSpec.substring(0, 1500) + (this.projectSpec.length > 1500 ? '...[truncated]' : '') : 
          'Not loaded';
        
        const goalsSummary = Array.isArray(this.goals) && this.goals.length > 0 ? 
          JSON.stringify(this.goals.slice(0, 5), null, 2) + (this.goals.length > 5 ? '\n...[more goals]' : '') : 
          'Not loaded or empty';
        
        const instructionsSummary = this.agentInstructions ? 
          this.agentInstructions.substring(0, 500) + (this.agentInstructions.length > 500 ? '...[truncated]' : '') : 
          'Not loaded';
        
        projectContext = `
Project Vision Summary:
${visionSummary}

Project Specification Summary:
${specSummary}

Key Goals (first 5):
${goalsSummary}

Agent Instructions:
${instructionsSummary}
`;
      }
      
      // Ensure total context doesn't exceed limit
      if (projectContext.length > MAX_CONTEXT_LENGTH) {
        projectContext = projectContext.substring(0, MAX_CONTEXT_LENGTH) + '\n...[context truncated due to size]';
        this.log(`Context truncated from ${projectContext.length} to ${MAX_CONTEXT_LENGTH} chars`);
      }
      
      const response = await this.claude.ask(prompt, {
        projectContext: projectContext,
        outputFormat: 'text'
      });
      
      return response;
    } catch (error) {
      this.logError(`Failed to ask Claude: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Initialize agent - set up directories and load project context
   */
  async initialize() {
    try {
      // Create all required directories
      for (const dir of Object.values(this.directories)) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      // Load project documentation
      await this.loadProjectDocs();
      
      // Update status
      await this.updateStatus('initializing', 'Agent starting up');
      
      // Write PID file
      const pidFile = path.join(this.directories.status, `${this.agentName}.pid`);
      await fs.writeFile(pidFile, process.pid.toString());
      
      this.log(`Initializing ${this.agentName} (${this.agentRole})`);
      
      // Agent-specific initialization (to be overridden)
      if (typeof this.initializeAgent === 'function') {
        await this.initializeAgent();
      }
      
      this.emit('initialized');
    } catch (error) {
      this.logError(`Initialization failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Load project documentation from files
   */
  async loadProjectDocs() {
    try {
      // Load PROJECT_SPEC.md from project root
      const specPath = path.join(this.projectDir, 'PROJECT_SPEC.md');
      if (await this.fileExists(specPath)) {
        this.projectSpec = await fs.readFile(specPath, 'utf8');
        this.log('Loaded PROJECT_SPEC.md from project root');
      } else {
        // Fallback to .agents/docs directory
        const fallbackSpecPath = path.join(this.directories.docs, 'PROJECT_SPEC.md');
        if (await this.fileExists(fallbackSpecPath)) {
          this.projectSpec = await fs.readFile(fallbackSpecPath, 'utf8');
          this.log('Loaded PROJECT_SPEC.md from .agents/docs');
        }
      }
      
      // Load GOALS.json from project root
      const goalsPath = path.join(this.projectDir, 'GOALS.json');
      if (await this.fileExists(goalsPath)) {
        const goalsContent = await fs.readFile(goalsPath, 'utf8');
        try {
          const goalsData = JSON.parse(goalsContent);
          
          // Support both old format (direct array) and new format (nested)
          if (Array.isArray(goalsData)) {
            this.goals = goalsData;
          } else if (goalsData && Array.isArray(goalsData.goals)) {
            this.goals = goalsData.goals;
          } else {
            this.goals = [];
            this.log('Warning: GOALS.json has unexpected format, using empty array');
          }
          this.log(`Loaded ${this.goals.length} project goals from project root`);
        } catch (error) {
          this.goals = [];
          this.logError(`Failed to parse GOALS.json from project root: ${error.message}`);
        }
      } else {
        // Fallback to .agents/docs directory
        const fallbackGoalsPath = path.join(this.directories.docs, 'GOALS.json');
        if (await this.fileExists(fallbackGoalsPath)) {
          const goalsContent = await fs.readFile(fallbackGoalsPath, 'utf8');
          try {
            const goalsData = JSON.parse(goalsContent);
            
            // Support both old format (direct array) and new format (nested)
            if (Array.isArray(goalsData)) {
              this.goals = goalsData;
            } else if (goalsData && Array.isArray(goalsData.goals)) {
              this.goals = goalsData.goals;
            } else {
              this.goals = [];
              this.log('Warning: GOALS.json has unexpected format, using empty array');
            }
            this.log(`Loaded ${this.goals.length} project goals from .agents/docs`);
          } catch (error) {
            this.goals = [];
            this.logError(`Failed to parse GOALS.json from .agents/docs: ${error.message}`);
          }
        }
      }
      
      // Load PROJECT_VISION.md if it exists
      const visionPath = path.join(this.projectDir, 'PROJECT_VISION.md');
      if (await this.fileExists(visionPath)) {
        this.projectVision = await fs.readFile(visionPath, 'utf8');
        this.log('Loaded PROJECT_VISION.md');
      }
      
      // Load agent-specific instructions
      const instructionsPath = path.join(this.directories.docs, 'AGENT_INSTRUCTIONS.md');
      if (await this.fileExists(instructionsPath)) {
        const instructions = await fs.readFile(instructionsPath, 'utf8');
        // Extract section for this agent
        const agentSection = this.extractAgentSection(instructions, this.agentName);
        if (agentSection) {
          this.agentInstructions = agentSection;
          this.log('Loaded agent-specific instructions');
        }
      }
    } catch (error) {
      this.logError(`Failed to load project docs: ${error.message}`);
    }
  }
  
  /**
   * Extract agent-specific section from instructions
   */
  extractAgentSection(instructions, agentName) {
    const regex = new RegExp(`## ${agentName}([\\s\\S]*?)(?=##|$)`, 'i');
    const match = instructions.match(regex);
    return match ? match[1].trim() : null;
  }
  
  /**
   * Send message to another agent
   */
  async sendMessage(recipient, message, priority = 'normal') {
    try {
      const messageData = {
        from: this.agentName,
        to: recipient,
        content: message,
        priority: priority,
        type: 'task',
        timestamp: new Date().toISOString()
      };
      
      let messageId;
      
      // Use integrated message queue if available and in integrated mode
      if (this.runMode === 'integrated' && this.integratedMessageQueue) {
        messageId = this.integratedMessageQueue.send(recipient, messageData, { priority });
        this.log(`Message sent to ${recipient} via integrated queue: ${messageId}`);
      } else {
        // Fall back to file-based messaging for standalone mode
        messageId = `${Date.now()}_${this.agentName}_${uuidv4().slice(0, 8)}`;
        const recipientInbox = path.join(this.agentBaseDir, 'inboxes', recipient);
        const messageFile = path.join(recipientInbox, `${messageId}.msg`);
        
        messageData.id = messageId;
        messageData.message = message; // Keep backward compatibility
        
        await fs.mkdir(recipientInbox, { recursive: true });
        await fs.writeFile(messageFile, JSON.stringify(messageData, null, 2));
        
        this.log(`Message sent to ${recipient} via file system: ${messageId}`);
      }
      
      this.emit('messageSent', messageData);
      
      return messageId;
    } catch (error) {
      this.logError(`Failed to send message: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Receive a message directly (for integrated mode)
   */
  receiveMessage(message) {
    this.handleIncomingMessage(message);
  }
  
  /**
   * Process incoming message
   */
  async processMessage(messageFile) {
    try {
      const content = await fs.readFile(messageFile, 'utf8');
      const message = JSON.parse(content);
      
      this.log(`Processing message from ${message.from}: ${message.id}`);
      
      // Handle control messages
      if (message.message === 'HEALTH_CHECK') {
        await this.healthCheck();
      } else if (message.message === 'STOP') {
        await this.shutdown();
      } else {
        // Agent-specific message handling (to be overridden)
        await this.handleTask(message);
      }
      
      // Archive processed message
      const processedDir = path.join(this.directories.workspace, 'processed');
      await fs.mkdir(processedDir, { recursive: true });
      const processedFile = path.join(processedDir, `${path.basename(messageFile)}_processed`);
      await fs.rename(messageFile, processedFile);
      
      this.emit('messageProcessed', message);
    } catch (error) {
      this.logError(`Failed to process message: ${error.message}`);
    }
  }
  
  /**
   * Default task handler (to be overridden by specific agents)
   */
  async handleTask(message) {
    this.log(`Base agent received task: ${JSON.stringify(message.message)}`);
    // Specific agents will override this
  }
  
  /**
   * Update agent status
   */
  async updateStatus(status, details = '') {
    try {
      const statusData = {
        agent: this.agentName,
        status: status,
        details: details,
        timestamp: new Date().toISOString(),
        pid: process.pid
      };
      
      await fs.writeFile(this.statusFile, JSON.stringify(statusData, null, 2));
      this.emit('statusUpdated', statusData);
    } catch (error) {
      this.logError(`Failed to update status: ${error.message}`);
    }
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    try {
      const healthFile = path.join(this.directories.outbox, `health_${Date.now()}`);
      await fs.writeFile(healthFile, 'HEALTHY');
      await this.updateStatus('healthy', 'Responding to health check');
      this.log('Health check completed');
    } catch (error) {
      this.logError(`Health check failed: ${error.message}`);
    }
  }
  
  /**
   * Main event loop - check for messages and periodic tasks
   */
  async runEventLoop() {
    if (this.isRunning) {
      this.log('Event loop already running');
      return;
    }
    
    this.isRunning = true;
    await this.updateStatus('running', 'Agent running');
    this.log(`Starting ${this.agentName} event loop`);
    
    // Track if we're currently processing to avoid overlaps
    let isProcessing = false;
    
    // Process messages every 2 seconds (matching bash implementation)
    this.eventLoopInterval = setInterval(() => {
      // Skip if still processing previous iteration
      if (isProcessing) {
        this.log('Skipping event loop iteration - previous still processing');
        return;
      }
      
      isProcessing = true;
      
      // Use immediate execution to handle async operations properly
      (async () => {
        try {
          // Emit heartbeat for health monitoring
          this.emit('statusUpdated', {
            agent: this.agentName,
            status: 'running',
            details: 'Event loop active',
            timestamp: new Date().toISOString()
          });
          
          // Process queued messages in integrated mode
          if (this.runMode === 'integrated' && this.messageQueue.length > 0) {
            await this.processMessages();
          }
          
          // Check for messages in inbox (for standalone mode)
          if (this.runMode === 'standalone') {
            const messages = await this.getInboxMessages();
            for (const messageFile of messages) {
              await this.processMessage(messageFile);
            }
          }
          
          // Check for control signals
          await this.checkControlSignals();
          
          // Periodic tasks (to be overridden)
          if (typeof this.periodicTasks === 'function') {
            await this.periodicTasks();
          }
        } catch (error) {
          this.logError(`Event loop error: ${error.message}`);
        } finally {
          isProcessing = false;
        }
      })();
    }, 2000);
    
    this.emit('eventLoopStarted');
  }
  
  /**
   * Get messages from inbox
   */
  async getInboxMessages() {
    try {
      const files = await fs.readdir(this.directories.inbox);
      const messageFiles = files
        .filter(f => f.endsWith('.msg'))
        .map(f => path.join(this.directories.inbox, f));
      return messageFiles;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logError(`Failed to read inbox: ${error.message}`);
      }
      return [];
    }
  }
  
  /**
   * Check for control signals
   */
  async checkControlSignals() {
    try {
      const stopFile = path.join(this.directories.inbox, 'STOP');
      if (await this.fileExists(stopFile)) {
        await fs.unlink(stopFile);
        await this.shutdown();
      }
      
      const healthCheckFile = path.join(this.directories.inbox, 'HEALTH_CHECK');
      if (await this.fileExists(healthCheckFile)) {
        await fs.unlink(healthCheckFile);
        await this.healthCheck();
      }
    } catch (error) {
      this.logError(`Failed to check control signals: ${error.message}`);
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.log('Shutdown signal received');
    this.isRunning = false;
    
    if (this.eventLoopInterval) {
      clearInterval(this.eventLoopInterval);
      this.eventLoopInterval = null;
    }
    
    // Unsubscribe from message queue if in integrated mode
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
      this.messageUnsubscribe = null;
    }
    
    await this.updateStatus('stopped', 'Agent stopped');
    
    // Cleanup (to be overridden if needed)
    if (typeof this.cleanup === 'function') {
      await this.cleanup();
    }
    
    // Remove PID file (only in standalone mode)
    if (this.runMode === 'standalone') {
      try {
        const pidFile = path.join(this.directories.status, `${this.agentName}.pid`);
        await fs.unlink(pidFile);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
    
    this.emit('shutdown');
    
    // Only exit process if in standalone mode
    if (this.runMode === 'standalone') {
      process.exit(0);
    }
  }
  
  /**
   * Logging functions
   */
  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.agentName}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      // Ensure log directory exists before writing
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
    
    this.emit('log', { level: 'info', message });
  }
  
  async logError(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.agentName}] ERROR: ${message}\n`;
    
    console.error(logMessage.trim());
    
    try {
      // Ensure log directory exists before writing
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
    
    this.emit('log', { level: 'error', message });
  }
  
  async logSuccess(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.agentName}] SUCCESS: ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
    
    this.emit('log', { level: 'success', message });
  }
  
  /**
   * Utility functions
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Set up signal handlers
   */
  setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('uncaughtException', (error) => {
      this.logError(`Uncaught exception: ${error.message}`);
      this.shutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      this.logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    });
  }
}

module.exports = BaseAgent;
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const chokidar = require('chokidar');
const { v4: uuidv4 } = require('uuid');

/**
 * MessageQueue - Enhanced file-based messaging system with file watching
 */
class MessageQueue extends EventEmitter {
  constructor(agentName, baseDir) {
    super();
    
    this.agentName = agentName;
    this.baseDir = baseDir || path.join(process.cwd(), '.agents');
    this.inbox = path.join(this.baseDir, 'inboxes', agentName);
    this.outbox = path.join(this.baseDir, 'outboxes', agentName);
    
    this.watcher = null;
    this.processingQueue = [];
    this.processedMessages = new Set();
    this.isProcessing = false;
  }
  
  /**
   * Initialize the message queue
   */
  async initialize() {
    // Create directories if they don't exist
    await fs.mkdir(this.inbox, { recursive: true });
    await fs.mkdir(this.outbox, { recursive: true });
    
    // Create processed directory for archiving
    const processedDir = path.join(this.baseDir, 'workspace', this.agentName, 'processed');
    await fs.mkdir(processedDir, { recursive: true });
  }
  
  /**
   * Send a message to another agent
   */
  async send(recipient, message, priority = 'normal') {
    try {
      const messageId = `${Date.now()}_${this.agentName}_${uuidv4().slice(0, 8)}`;
      const recipientInbox = path.join(this.baseDir, 'inboxes', recipient);
      
      // Ensure recipient inbox exists
      await fs.mkdir(recipientInbox, { recursive: true });
      
      const messageData = {
        id: messageId,
        from: this.agentName,
        to: recipient,
        message: message,
        priority: priority,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };
      
      // Priority determines filename prefix for sorting
      const priorityPrefix = priority === 'high' ? '0_' : priority === 'low' ? '2_' : '1_';
      const messageFile = path.join(recipientInbox, `${priorityPrefix}${messageId}.msg`);
      
      await fs.writeFile(messageFile, JSON.stringify(messageData, null, 2));
      
      this.emit('messageSent', {
        messageId,
        recipient,
        priority,
        message
      });
      
      return messageId;
    } catch (error) {
      this.emit('error', new Error(`Failed to send message: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Watch for incoming messages using chokidar
   */
  watch(callback) {
    if (this.watcher) {
      this.watcher.close();
    }
    
    // Set up file watcher for inbox
    this.watcher = chokidar.watch(path.join(this.inbox, '*.msg'), {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });
    
    // Handle new messages
    this.watcher.on('add', async (filePath) => {
      const fileName = path.basename(filePath);
      
      // Skip if already processed
      if (this.processedMessages.has(fileName)) {
        return;
      }
      
      try {
        // Add to processing queue
        this.processingQueue.push(filePath);
        
        // Process queue
        await this.processQueue(callback);
        
      } catch (error) {
        this.emit('error', error);
      }
    });
    
    // Handle errors
    this.watcher.on('error', (error) => {
      this.emit('error', new Error(`Watcher error: ${error.message}`));
    });
    
    this.emit('watchingStarted', this.inbox);
  }
  
  /**
   * Process message queue
   */
  async processQueue(callback) {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      // Sort queue by priority (filename prefix)
      this.processingQueue.sort();
      
      const messageFile = this.processingQueue.shift();
      const fileName = path.basename(messageFile);
      
      if (this.processedMessages.has(fileName)) {
        continue;
      }
      
      try {
        const message = await this.readMessage(messageFile);
        
        if (message) {
          // Mark as processed before callback to prevent reprocessing
          this.processedMessages.add(fileName);
          
          // Execute callback
          if (callback) {
            await callback(message, messageFile);
          }
          
          // Archive the message
          await this.archiveMessage(messageFile);
          
          this.emit('messageProcessed', message);
        }
      } catch (error) {
        this.emit('error', new Error(`Failed to process message ${fileName}: ${error.message}`));
        
        // Re-add to queue for retry if it still exists
        if (await this.fileExists(messageFile)) {
          setTimeout(() => {
            this.processingQueue.push(messageFile);
          }, 5000); // Retry after 5 seconds
        }
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Stop watching for messages
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.emit('watchingStopped');
    }
  }
  
  /**
   * Get next unprocessed message (for polling mode)
   */
  async getNextMessage() {
    try {
      const files = await fs.readdir(this.inbox);
      const messageFiles = files
        .filter(f => f.endsWith('.msg'))
        .filter(f => !this.processedMessages.has(f))
        .sort(); // Sort by priority prefix
      
      if (messageFiles.length === 0) {
        return null;
      }
      
      const nextFile = messageFiles[0];
      const filePath = path.join(this.inbox, nextFile);
      const message = await this.readMessage(filePath);
      
      if (message) {
        this.processedMessages.add(nextFile);
        await this.archiveMessage(filePath);
      }
      
      return message;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.emit('error', new Error(`Failed to get next message: ${error.message}`));
      }
      return null;
    }
  }
  
  /**
   * Read and parse a message file
   */
  async readMessage(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const message = JSON.parse(content);
      
      // Add file path for reference
      message.filePath = filePath;
      
      return message;
    } catch (error) {
      this.emit('error', new Error(`Failed to read message ${filePath}: ${error.message}`));
      return null;
    }
  }
  
  /**
   * Archive processed message
   */
  async archiveMessage(messageFile) {
    try {
      const processedDir = path.join(this.baseDir, 'workspace', this.agentName, 'processed');
      const fileName = path.basename(messageFile);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedFile = path.join(processedDir, `${timestamp}_${fileName}`);
      
      await fs.rename(messageFile, archivedFile);
      
      this.emit('messageArchived', archivedFile);
    } catch (error) {
      // If rename fails, try to delete
      try {
        await fs.unlink(messageFile);
      } catch (deleteError) {
        this.emit('error', new Error(`Failed to archive message: ${error.message}`));
      }
    }
  }
  
  /**
   * Send a broadcast message to multiple agents
   */
  async broadcast(recipients, message, priority = 'normal') {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const messageId = await this.send(recipient, message, priority);
        results.push({ recipient, messageId, success: true });
      } catch (error) {
        results.push({ recipient, error: error.message, success: false });
      }
    }
    
    this.emit('broadcastSent', {
      message,
      results
    });
    
    return results;
  }
  
  /**
   * Acknowledge message receipt (for advanced workflows)
   */
  async acknowledge(messageId, status = 'processed') {
    try {
      const ackData = {
        messageId,
        acknowledgedBy: this.agentName,
        status,
        timestamp: new Date().toISOString()
      };
      
      const ackFile = path.join(this.outbox, `ack_${messageId}.json`);
      await fs.writeFile(ackFile, JSON.stringify(ackData, null, 2));
      
      this.emit('messageAcknowledged', ackData);
    } catch (error) {
      this.emit('error', new Error(`Failed to acknowledge message: ${error.message}`));
    }
  }
  
  /**
   * Get pending messages count
   */
  async getPendingCount() {
    try {
      const files = await fs.readdir(this.inbox);
      const messageFiles = files.filter(f => f.endsWith('.msg'));
      return messageFiles.length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Clear all processed message tracking (for cleanup)
   */
  clearProcessedTracking() {
    this.processedMessages.clear();
    this.processingQueue = [];
  }
  
  /**
   * Utility function to check file existence
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
   * Clean up resources
   */
  async cleanup() {
    this.stopWatching();
    this.clearProcessedTracking();
  }
}

module.exports = MessageQueue;
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * InMemoryMessageQueue - Direct in-memory messaging for integrated agents
 * Replaces file-based messaging when agents run in the same process
 */
class InMemoryMessageQueue extends EventEmitter {
  constructor() {
    super();
    
    // Message queues for each agent
    this.queues = new Map();
    
    // Message history for debugging
    this.messageHistory = [];
    this.maxHistorySize = 1000;
    
    // Statistics
    this.stats = {
      totalMessagesSent: 0,
      totalMessagesDelivered: 0,
      totalMessagesDropped: 0
    };
  }
  
  /**
   * Register an agent to receive messages
   */
  registerAgent(agentName) {
    if (!this.queues.has(agentName)) {
      this.queues.set(agentName, {
        messages: [],
        listeners: new Set(),
        stats: {
          received: 0,
          processed: 0,
          dropped: 0
        }
      });
      
      this.emit('agentRegistered', { agentName });
    }
  }
  
  /**
   * Unregister an agent
   */
  unregisterAgent(agentName) {
    if (this.queues.has(agentName)) {
      const queue = this.queues.get(agentName);
      
      // Clear listeners
      queue.listeners.clear();
      
      // Mark remaining messages as dropped
      this.stats.totalMessagesDropped += queue.messages.length;
      queue.stats.dropped += queue.messages.length;
      
      // Remove queue
      this.queues.delete(agentName);
      
      this.emit('agentUnregistered', { agentName });
    }
  }
  
  /**
   * Send a message to an agent
   */
  send(recipient, message, options = {}) {
    const messageId = `${Date.now()}_${uuidv4().slice(0, 8)}`;
    
    const messageData = {
      id: messageId,
      from: message.from || 'system',
      to: recipient,
      type: message.type || 'task',
      priority: options.priority || 'normal',
      content: message.content || message,
      timestamp: new Date().toISOString(),
      metadata: {
        ...message.metadata,
        deliveryAttempts: 0
      }
    };
    
    // Add to history
    this.addToHistory(messageData);
    
    // Update stats
    this.stats.totalMessagesSent++;
    
    // Check if recipient is registered
    if (!this.queues.has(recipient)) {
      this.registerAgent(recipient);
    }
    
    const queue = this.queues.get(recipient);
    
    // Add message to queue
    if (options.priority === 'high') {
      queue.messages.unshift(messageData);
    } else {
      queue.messages.push(messageData);
    }
    
    queue.stats.received++;
    
    // Notify listeners
    this.notifyListeners(recipient, messageData);
    
    // Emit global message event
    this.emit('messageSent', {
      from: messageData.from,
      to: recipient,
      messageId,
      type: messageData.type
    });
    
    return messageId;
  }
  
  /**
   * Broadcast a message to multiple agents
   */
  broadcast(recipients, message, options = {}) {
    const messageIds = [];
    
    for (const recipient of recipients) {
      const messageId = this.send(recipient, message, options);
      messageIds.push(messageId);
    }
    
    return messageIds;
  }
  
  /**
   * Receive messages for an agent (pull model)
   */
  receive(agentName, limit = 10) {
    if (!this.queues.has(agentName)) {
      return [];
    }
    
    const queue = this.queues.get(agentName);
    const messages = queue.messages.splice(0, limit);
    
    // Update stats
    queue.stats.processed += messages.length;
    this.stats.totalMessagesDelivered += messages.length;
    
    return messages;
  }
  
  /**
   * Peek at messages without removing them
   */
  peek(agentName, limit = 10) {
    if (!this.queues.has(agentName)) {
      return [];
    }
    
    const queue = this.queues.get(agentName);
    return queue.messages.slice(0, limit);
  }
  
  /**
   * Subscribe to messages for an agent (push model)
   */
  subscribe(agentName, callback) {
    if (!this.queues.has(agentName)) {
      this.registerAgent(agentName);
    }
    
    const queue = this.queues.get(agentName);
    queue.listeners.add(callback);
    
    // Process any pending messages
    this.processPendingMessages(agentName);
    
    // Return unsubscribe function
    return () => {
      queue.listeners.delete(callback);
    };
  }
  
  /**
   * Process pending messages for an agent
   */
  processPendingMessages(agentName) {
    const queue = this.queues.get(agentName);
    if (!queue || queue.listeners.size === 0) return;
    
    // Process messages in batches to avoid blocking
    setImmediate(() => {
      while (queue.messages.length > 0 && queue.listeners.size > 0) {
        const message = queue.messages.shift();
        queue.stats.processed++;
        this.stats.totalMessagesDelivered++;
        
        // Notify all listeners
        for (const listener of queue.listeners) {
          try {
            listener(message);
          } catch (error) {
            console.error(`Error in message listener for ${agentName}:`, error);
          }
        }
      }
    });
  }
  
  /**
   * Notify listeners when a new message arrives
   */
  notifyListeners(agentName, message) {
    const queue = this.queues.get(agentName);
    if (!queue || queue.listeners.size === 0) {
      console.log(`[MessageQueue] No listeners for ${agentName}, message queued`);
      return;
    }
    
    // Process asynchronously to avoid blocking
    setImmediate(() => {
      // Remove message from queue since we're delivering it directly
      const index = queue.messages.indexOf(message);
      if (index > -1) {
        queue.messages.splice(index, 1);
        queue.stats.processed++;
        this.stats.totalMessagesDelivered++;
        
        console.log(`[MessageQueue] Delivering message ${message.id} to ${agentName} (${queue.listeners.size} listeners)`);
        
        // Notify all listeners
        let deliveredCount = 0;
        for (const listener of queue.listeners) {
          try {
            listener(message);
            deliveredCount++;
          } catch (error) {
            console.error(`Error in message listener for ${agentName}:`, error);
          }
        }
        
        if (deliveredCount > 0) {
          console.log(`[MessageQueue] Message ${message.id} delivered to ${deliveredCount} listeners`);
          this.emit('messageDelivered', {
            messageId: message.id,
            to: agentName,
            listenerCount: deliveredCount
          });
        }
      }
    });
  }
  
  /**
   * Get queue status for an agent
   */
  getQueueStatus(agentName) {
    if (!this.queues.has(agentName)) {
      return {
        registered: false,
        queueSize: 0,
        stats: { received: 0, processed: 0, dropped: 0 }
      };
    }
    
    const queue = this.queues.get(agentName);
    return {
      registered: true,
      queueSize: queue.messages.length,
      listenerCount: queue.listeners.size,
      stats: queue.stats,
      oldestMessage: queue.messages[0] ? queue.messages[0].timestamp : null
    };
  }
  
  /**
   * Get overall statistics
   */
  getStats() {
    const agentStats = {};
    for (const [name, queue] of this.queues) {
      agentStats[name] = {
        queueSize: queue.messages.length,
        stats: queue.stats
      };
    }
    
    return {
      global: this.stats,
      agents: agentStats,
      historySize: this.messageHistory.length
    };
  }
  
  /**
   * Clear all messages for an agent
   */
  clearQueue(agentName) {
    if (this.queues.has(agentName)) {
      const queue = this.queues.get(agentName);
      const droppedCount = queue.messages.length;
      
      queue.stats.dropped += droppedCount;
      this.stats.totalMessagesDropped += droppedCount;
      
      queue.messages = [];
      
      this.emit('queueCleared', { agentName, droppedCount });
    }
  }
  
  /**
   * Clear all queues
   */
  clearAllQueues() {
    for (const agentName of this.queues.keys()) {
      this.clearQueue(agentName);
    }
  }
  
  /**
   * Add message to history
   */
  addToHistory(message) {
    this.messageHistory.push({
      ...message,
      historyTimestamp: Date.now()
    });
    
    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }
  
  /**
   * Get message history
   */
  getHistory(filter = {}) {
    let history = [...this.messageHistory];
    
    if (filter.from) {
      history = history.filter(m => m.from === filter.from);
    }
    
    if (filter.to) {
      history = history.filter(m => m.to === filter.to);
    }
    
    if (filter.type) {
      history = history.filter(m => m.type === filter.type);
    }
    
    if (filter.since) {
      const sinceTime = new Date(filter.since).getTime();
      history = history.filter(m => m.historyTimestamp >= sinceTime);
    }
    
    if (filter.limit) {
      history = history.slice(-filter.limit);
    }
    
    return history;
  }
  
  /**
   * Simulate network delay (for testing)
   */
  simulateDelay(minMs = 10, maxMs = 50) {
    const originalSend = this.send.bind(this);
    
    this.send = (recipient, message, options) => {
      const delay = Math.random() * (maxMs - minMs) + minMs;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(originalSend(recipient, message, options));
        }, delay);
      });
    };
  }
  
  /**
   * Reset the message queue
   */
  reset() {
    this.queues.clear();
    this.messageHistory = [];
    this.stats = {
      totalMessagesSent: 0,
      totalMessagesDelivered: 0,
      totalMessagesDropped: 0
    };
    
    this.emit('reset');
  }
}

module.exports = InMemoryMessageQueue;
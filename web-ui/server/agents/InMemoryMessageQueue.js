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
    
    // Message flow tracking for visualization
    this.messageFlows = []; // Keep last 1000 flows
    this.flowStats = new Map(); // agent-pair -> stats
    this.maxFlowsSize = 1000;
    
    // Agent activity tracking
    this.agentActivity = new Map(); // agent -> { sent, received, lastActive }
    
    // Task manager reference for task status updates
    this.taskManager = null;
  }
  
  /**
   * Set the task manager for task status updates
   */
  setTaskManager(taskManager) {
    this.taskManager = taskManager;
  }
  
  /**
   * Handle task status updates from agent messages
   */
  handleTaskStatusUpdate(message) {
    if (!this.taskManager || !message.content) {
      return;
    }
    
    const content = message.content;
    const from = message.from;
    
    // Handle task completion messages
    if (content.type === 'TASK_COMPLETED' && content.taskId) {
      console.log(`[MessageQueue] Task ${content.taskId} completed by ${from}`);
      this.taskManager.updateTaskStatus(content.taskId, 'completed', {
        completedBy: from,
        result: content.result
      }).catch(error => {
        console.error(`Failed to update task status to completed: ${error.message}`);
      });
    }
    
    // Handle task failure messages  
    if (content.type === 'TASK_FAILED' && content.taskId) {
      console.log(`[MessageQueue] Task ${content.taskId} failed by ${from}`);
      this.taskManager.updateTaskStatus(content.taskId, 'failed', {
        failedBy: from,
        error: content.error
      }).catch(error => {
        console.error(`Failed to update task status to failed: ${error.message}`);
      });
    }
    
    // Handle task progress messages
    if (content.type === 'TASK_PROGRESS' && content.taskId) {
      console.log(`[MessageQueue] Task ${content.taskId} progress update from ${from}`);
      // TaskManager doesn't have a progress method yet, but we can emit an event
      this.emit('task:progress', {
        taskId: content.taskId,
        progress: content.progress,
        from: from
      });
    }
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
    
    // Track message flow
    this.trackMessageFlow(messageData);
    
    // Update agent activity
    this.updateAgentActivity(messageData.from, 'sent');
    this.updateAgentActivity(recipient, 'received');
    
    // Check if recipient is registered
    if (!this.queues.has(recipient)) {
      this.registerAgent(recipient);
    }
    
    const queue = this.queues.get(recipient);
    
    // Add message to queue with priority handling
    this.insertWithPriority(queue, messageData);
    
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
    
    // Emit flow update event for real-time visualization
    this.emit('flow:update', {
      from: messageData.from,
      to: recipient,
      type: messageData.type,
      priority: messageData.priority,
      timestamp: messageData.timestamp
    });
    
    return messageId;
  }
  
  /**
   * Insert message into queue based on priority
   * Priority levels: critical > high > normal > low
   */
  insertWithPriority(queue, messageData) {
    const priorityScore = {
      'critical': 4,
      'high': 3,
      'normal': 2,
      'low': 1
    };
    
    const messageScore = priorityScore[messageData.priority] || 2;
    
    // Find the correct position to insert based on priority
    let insertIndex = queue.messages.length;
    for (let i = 0; i < queue.messages.length; i++) {
      const existingScore = priorityScore[queue.messages[i].priority] || 2;
      if (messageScore > existingScore) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert at the calculated position
    queue.messages.splice(insertIndex, 0, messageData);
  }
  
  /**
   * Send a priority message (convenience method)
   */
  sendPriority(recipient, message, priority = 'high') {
    return this.send(recipient, message, { priority });
  }
  
  /**
   * Send a critical message (highest priority)
   */
  sendCritical(recipient, message) {
    return this.send(recipient, message, { priority: 'critical' });
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
          
          // Update TaskManager if this is a task status message
          this.handleTaskStatusUpdate(message);
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
   * Track message flow between agents
   */
  trackMessageFlow(messageData) {
    // Add to flows array
    this.messageFlows.push({
      from: messageData.from,
      to: messageData.to,
      type: messageData.type,
      priority: messageData.priority,
      timestamp: messageData.timestamp,
      size: JSON.stringify(messageData.content).length
    });
    
    // Trim flows if too large
    if (this.messageFlows.length > this.maxFlowsSize) {
      this.messageFlows.shift();
    }
    
    // Update flow statistics
    const flowKey = `${messageData.from}->${messageData.to}`;
    const stats = this.flowStats.get(flowKey) || {
      count: 0,
      totalSize: 0,
      types: new Map(),
      priorities: new Map(),
      firstMessage: messageData.timestamp,
      lastMessage: messageData.timestamp
    };
    
    stats.count++;
    stats.totalSize += JSON.stringify(messageData.content).length;
    stats.lastMessage = messageData.timestamp;
    
    // Track message types
    const typeCount = stats.types.get(messageData.type) || 0;
    stats.types.set(messageData.type, typeCount + 1);
    
    // Track priorities
    const priorityCount = stats.priorities.get(messageData.priority) || 0;
    stats.priorities.set(messageData.priority, priorityCount + 1);
    
    this.flowStats.set(flowKey, stats);
  }
  
  /**
   * Update agent activity statistics
   */
  updateAgentActivity(agentName, action) {
    const activity = this.agentActivity.get(agentName) || {
      sent: 0,
      received: 0,
      lastActive: null,
      status: 'idle'
    };
    
    if (action === 'sent') {
      activity.sent++;
    } else if (action === 'received') {
      activity.received++;
    }
    
    activity.lastActive = new Date().toISOString();
    activity.status = 'active';
    
    this.agentActivity.set(agentName, activity);
    
    // Set status back to idle after 30 seconds of no activity
    setTimeout(() => {
      const currentActivity = this.agentActivity.get(agentName);
      if (currentActivity && currentActivity.lastActive === activity.lastActive) {
        currentActivity.status = 'idle';
        this.agentActivity.set(agentName, currentActivity);
        this.emit('agent:idle', { agentName });
      }
    }, 30000);
  }
  
  /**
   * Get message flow data for visualization
   */
  getFlowData() {
    // Prepare nodes from agent activity
    const nodes = [];
    for (const [agentName, activity] of this.agentActivity) {
      nodes.push({
        id: agentName,
        label: agentName,
        status: activity.status,
        sent: activity.sent,
        received: activity.received,
        lastActive: activity.lastActive
      });
    }
    
    // Prepare edges from flow stats
    const edges = [];
    for (const [flowKey, stats] of this.flowStats) {
      const [source, target] = flowKey.split('->');
      edges.push({
        source,
        target,
        count: stats.count,
        totalSize: stats.totalSize,
        types: Array.from(stats.types.entries()),
        priorities: Array.from(stats.priorities.entries()),
        averageSize: Math.round(stats.totalSize / stats.count),
        lastMessage: stats.lastMessage
      });
    }
    
    // Recent flows for animation
    const recentFlows = this.messageFlows.slice(-50).map(flow => ({
      from: flow.from,
      to: flow.to,
      type: flow.type,
      priority: flow.priority,
      timestamp: flow.timestamp
    }));
    
    return {
      nodes,
      edges,
      recentFlows,
      stats: {
        totalMessages: this.stats.totalMessagesSent,
        totalDelivered: this.stats.totalMessagesDelivered,
        activeAgents: nodes.filter(n => n.status === 'active').length
      }
    };
  }
  
  /**
   * Get flow statistics for a specific time range
   */
  getFlowStatsByTime(since) {
    const sinceTime = new Date(since).toISOString();
    const filteredFlows = this.messageFlows.filter(f => f.timestamp >= sinceTime);
    
    const stats = {
      messageCount: filteredFlows.length,
      byType: {},
      byPriority: {},
      byAgentPair: {},
      totalSize: 0
    };
    
    filteredFlows.forEach(flow => {
      // By type
      stats.byType[flow.type] = (stats.byType[flow.type] || 0) + 1;
      
      // By priority
      stats.byPriority[flow.priority] = (stats.byPriority[flow.priority] || 0) + 1;
      
      // By agent pair
      const pairKey = `${flow.from}->${flow.to}`;
      stats.byAgentPair[pairKey] = (stats.byAgentPair[pairKey] || 0) + 1;
      
      // Total size
      stats.totalSize += flow.size;
    });
    
    return stats;
  }
  
  /**
   * Clear flow data
   */
  clearFlowData() {
    this.messageFlows = [];
    this.flowStats.clear();
    this.agentActivity.clear();
    this.emit('flow:cleared');
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
    this.clearFlowData();
    
    this.emit('reset');
  }
}

module.exports = InMemoryMessageQueue;
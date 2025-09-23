const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class MessageBroker {
  constructor(logger) {
    this.logger = logger;
    this.messageQueues = new Map();
  }

  async sendMessage(projectId, from, to, type, content) {
    const messageId = uuidv4();
    const message = {
      id: messageId,
      projectId,
      from,
      to,
      type,
      content,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Get or create queue for recipient
    const queueKey = `${projectId}:${to}`;
    if (!this.messageQueues.has(queueKey)) {
      this.messageQueues.set(queueKey, []);
    }
    
    const queue = this.messageQueues.get(queueKey);
    queue.push(message);

    // Write to filesystem for agent to pick up
    await this.writeMessageToInbox(projectId, to, message);

    this.logger.info(`Message ${messageId} sent from ${from} to ${to}`);
    return messageId;
  }

  async writeMessageToInbox(projectId, agentId, message) {
    const frameworkDir = path.join(__dirname, '../../..');
    const inboxDir = path.join(frameworkDir, '.agents', 'inbox', agentId);
    
    try {
      await fs.mkdir(inboxDir, { recursive: true });
      const messageFile = path.join(inboxDir, `${message.id}.msg`);
      await fs.writeFile(messageFile, JSON.stringify(message, null, 2));
    } catch (error) {
      this.logger.error('Error writing message to inbox:', error);
    }
  }

  async readMessages(projectId, agentId, messageType = null) {
    const queueKey = `${projectId}:${agentId}`;
    const queue = this.messageQueues.get(queueKey) || [];
    
    let messages = [...queue];
    
    if (messageType) {
      messages = messages.filter(m => m.type === messageType);
    }
    
    return messages;
  }

  async consumeMessage(projectId, agentId, messageId) {
    const queueKey = `${projectId}:${agentId}`;
    const queue = this.messageQueues.get(queueKey);
    
    if (!queue) {
      throw new Error('No messages in queue');
    }
    
    const index = queue.findIndex(m => m.id === messageId);
    if (index === -1) {
      throw new Error('Message not found');
    }
    
    const message = queue[index];
    queue.splice(index, 1);
    
    // Remove from filesystem
    await this.removeMessageFromInbox(projectId, agentId, messageId);
    
    return message;
  }

  async removeMessageFromInbox(projectId, agentId, messageId) {
    const frameworkDir = path.join(__dirname, '../../..');
    const messageFile = path.join(frameworkDir, '.agents', 'inbox', agentId, `${messageId}.msg`);
    
    try {
      await fs.unlink(messageFile);
    } catch (error) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        this.logger.error('Error removing message from inbox:', error);
      }
    }
  }

  getQueueStatus(projectId) {
    const status = {};
    
    for (const [key, queue] of this.messageQueues) {
      if (key.startsWith(`${projectId}:`)) {
        const agentId = key.split(':')[1];
        status[agentId] = {
          pending: queue.length,
          oldest: queue[0]?.timestamp || null
        };
      }
    }
    
    return status;
  }

  clearQueue(projectId, agentId = null) {
    if (agentId) {
      const queueKey = `${projectId}:${agentId}`;
      this.messageQueues.delete(queueKey);
    } else {
      // Clear all queues for project
      for (const key of this.messageQueues.keys()) {
        if (key.startsWith(`${projectId}:`)) {
          this.messageQueues.delete(key);
        }
      }
    }
    
    this.logger.info(`Cleared queue for ${agentId || 'all agents'} in project ${projectId}`);
  }

  getMessageHistory(projectId, limit = 100) {
    const history = [];
    
    for (const [_, queue] of this.messageQueues) {
      for (const message of queue) {
        if (message.projectId === projectId) {
          history.push(message);
        }
      }
    }
    
    // Sort by timestamp and limit
    return history
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
}

module.exports = MessageBroker;
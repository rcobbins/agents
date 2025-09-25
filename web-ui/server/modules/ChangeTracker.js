const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createTwoFilesPatch } = require('diff');

/**
 * ChangeTracker - Tracks file changes made by agents
 */
class ChangeTracker extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    
    // Store changes by ID
    this.changes = new Map();
    
    // Store file snapshots for comparison
    this.fileSnapshots = new Map();
    
    // Track changes by agent
    this.agentChanges = new Map();
    
    // Track changes by file
    this.fileChanges = new Map();
    
    // Change history (last 1000 changes)
    this.changeHistory = [];
    this.maxHistorySize = 1000;
    
    // Statistics
    this.stats = {
      totalChanges: 0,
      appliedChanges: 0,
      revertedChanges: 0,
      pendingChanges: 0,
      byType: {
        create: 0,
        modify: 0,
        delete: 0
      }
    };
  }
  
  /**
   * Track a file change
   */
  async trackChange(agentId, filePath, operation, taskId = null) {
    try {
      // Get the current content before the change
      const before = await this.getSnapshot(filePath);
      
      const change = {
        id: uuidv4(),
        agentId,
        taskId,
        filePath,
        fileName: path.basename(filePath),
        directory: path.dirname(filePath),
        operation, // 'create', 'modify', 'delete'
        before,
        after: null,
        diff: null,
        status: 'pending', // 'pending', 'applied', 'reverted', 'failed'
        timestamp: new Date().toISOString(),
        appliedAt: null,
        metadata: {}
      };
      
      // Store change
      this.changes.set(change.id, change);
      
      // Track by agent
      if (!this.agentChanges.has(agentId)) {
        this.agentChanges.set(agentId, []);
      }
      this.agentChanges.get(agentId).push(change.id);
      
      // Track by file
      if (!this.fileChanges.has(filePath)) {
        this.fileChanges.set(filePath, []);
      }
      this.fileChanges.get(filePath).push(change.id);
      
      // Update stats
      this.stats.totalChanges++;
      this.stats.pendingChanges++;
      this.stats.byType[operation]++;
      
      // Add to history
      this.addToHistory(change);
      
      // Emit event
      this.emit('change:tracked', change);
      
      this.logger.info(`Tracked ${operation} change for ${filePath} by ${agentId}`);
      
      return change;
    } catch (error) {
      this.logger.error(`Failed to track change: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Complete a tracked change with the after content
   */
  async completeChange(changeId, afterContent = null) {
    const change = this.changes.get(changeId);
    if (!change) {
      throw new Error(`Change ${changeId} not found`);
    }
    
    try {
      // Get the actual file content after the change
      if (afterContent === null && change.operation !== 'delete') {
        afterContent = await this.getSnapshot(change.filePath);
      }
      
      change.after = afterContent;
      change.appliedAt = new Date().toISOString();
      change.status = 'applied';
      
      // Generate diff
      if (change.operation === 'modify') {
        change.diff = this.generateDiff(
          change.filePath,
          change.before || '',
          change.after || ''
        );
      } else if (change.operation === 'create') {
        change.diff = this.generateDiff(
          change.filePath,
          '',
          change.after || ''
        );
      } else if (change.operation === 'delete') {
        change.diff = this.generateDiff(
          change.filePath,
          change.before || '',
          ''
        );
      }
      
      // Update snapshot
      this.updateSnapshot(change.filePath, afterContent);
      
      // Update stats
      this.stats.pendingChanges--;
      this.stats.appliedChanges++;
      
      // Update change
      this.changes.set(changeId, change);
      
      // Emit event
      this.emit('change:completed', change);
      
      this.logger.info(`Completed change ${changeId} for ${change.filePath}`);
      
      return change;
    } catch (error) {
      // Mark as failed
      change.status = 'failed';
      change.metadata.error = error.message;
      this.changes.set(changeId, change);
      
      this.stats.pendingChanges--;
      
      this.emit('change:failed', change);
      
      throw error;
    }
  }
  
  /**
   * Get a snapshot of a file
   */
  async getSnapshot(filePath) {
    try {
      // Check cache first
      if (this.fileSnapshots.has(filePath)) {
        return this.fileSnapshots.get(filePath);
      }
      
      // Try to read the file
      const content = await fs.readFile(filePath, 'utf-8');
      this.fileSnapshots.set(filePath, content);
      return content;
    } catch (error) {
      // File doesn't exist yet
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Update a file snapshot
   */
  updateSnapshot(filePath, content) {
    if (content === null) {
      this.fileSnapshots.delete(filePath);
    } else {
      this.fileSnapshots.set(filePath, content);
    }
  }
  
  /**
   * Generate a unified diff
   */
  generateDiff(filePath, before, after) {
    return createTwoFilesPatch(
      `a/${path.basename(filePath)}`,
      `b/${path.basename(filePath)}`,
      before || '',
      after || '',
      'before',
      'after',
      { context: 3 }
    );
  }
  
  /**
   * Revert a change
   */
  async revertChange(changeId) {
    const change = this.changes.get(changeId);
    if (!change) {
      throw new Error(`Change ${changeId} not found`);
    }
    
    if (change.status !== 'applied') {
      throw new Error(`Change ${changeId} is not applied (status: ${change.status})`);
    }
    
    try {
      // Revert based on operation type
      if (change.operation === 'create') {
        // Delete the created file
        await fs.unlink(change.filePath);
      } else if (change.operation === 'modify') {
        // Restore original content
        if (change.before !== null) {
          await fs.writeFile(change.filePath, change.before, 'utf-8');
        }
      } else if (change.operation === 'delete') {
        // Restore deleted file
        if (change.before !== null) {
          await fs.writeFile(change.filePath, change.before, 'utf-8');
        }
      }
      
      // Update change status
      change.status = 'reverted';
      change.revertedAt = new Date().toISOString();
      this.changes.set(changeId, change);
      
      // Update snapshot
      this.updateSnapshot(change.filePath, change.before);
      
      // Update stats
      this.stats.appliedChanges--;
      this.stats.revertedChanges++;
      
      // Emit event
      this.emit('change:reverted', change);
      
      this.logger.info(`Reverted change ${changeId} for ${change.filePath}`);
      
      return change;
    } catch (error) {
      this.logger.error(`Failed to revert change ${changeId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get changes by agent
   */
  getAgentChanges(agentId, options = {}) {
    const changeIds = this.agentChanges.get(agentId) || [];
    let changes = changeIds.map(id => this.changes.get(id)).filter(Boolean);
    
    // Apply filters
    if (options.status) {
      changes = changes.filter(c => c.status === options.status);
    }
    
    if (options.operation) {
      changes = changes.filter(c => c.operation === options.operation);
    }
    
    if (options.since) {
      const sinceTime = new Date(options.since);
      changes = changes.filter(c => new Date(c.timestamp) >= sinceTime);
    }
    
    // Sort by timestamp (newest first)
    changes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (options.limit) {
      changes = changes.slice(0, options.limit);
    }
    
    return changes;
  }
  
  /**
   * Get changes by file
   */
  getFileChanges(filePath, options = {}) {
    const changeIds = this.fileChanges.get(filePath) || [];
    let changes = changeIds.map(id => this.changes.get(id)).filter(Boolean);
    
    // Apply filters
    if (options.status) {
      changes = changes.filter(c => c.status === options.status);
    }
    
    // Sort by timestamp (newest first)
    changes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (options.limit) {
      changes = changes.slice(0, options.limit);
    }
    
    return changes;
  }
  
  /**
   * Get recent changes
   */
  getRecentChanges(limit = 50) {
    return this.changeHistory.slice(-limit);
  }
  
  /**
   * Get changes by status
   */
  getChangesByStatus(status) {
    const changes = [];
    for (const change of this.changes.values()) {
      if (change.status === status) {
        changes.push(change);
      }
    }
    return changes;
  }
  
  /**
   * Get change by ID
   */
  getChange(changeId) {
    return this.changes.get(changeId);
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      recentChanges: this.changeHistory.slice(-10).map(c => ({
        id: c.id,
        agentId: c.agentId,
        filePath: c.filePath,
        operation: c.operation,
        status: c.status,
        timestamp: c.timestamp
      }))
    };
  }
  
  /**
   * Add to history
   */
  addToHistory(change) {
    this.changeHistory.push({
      ...change,
      historyTimestamp: Date.now()
    });
    
    // Trim history if too large
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }
  }
  
  /**
   * Clear old completed changes
   */
  clearOldChanges(hoursOld = 24) {
    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [changeId, change] of this.changes.entries()) {
      if ((change.status === 'applied' || change.status === 'reverted') &&
          new Date(change.timestamp).getTime() < cutoffTime) {
        this.changes.delete(changeId);
        removedCount++;
        
        // Remove from agent tracking
        const agentChanges = this.agentChanges.get(change.agentId);
        if (agentChanges) {
          const index = agentChanges.indexOf(changeId);
          if (index > -1) {
            agentChanges.splice(index, 1);
          }
        }
        
        // Remove from file tracking
        const fileChanges = this.fileChanges.get(change.filePath);
        if (fileChanges) {
          const index = fileChanges.indexOf(changeId);
          if (index > -1) {
            fileChanges.splice(index, 1);
          }
        }
      }
    }
    
    this.logger.info(`Cleared ${removedCount} old changes`);
    return removedCount;
  }
  
  /**
   * Reset the change tracker
   */
  reset() {
    this.changes.clear();
    this.fileSnapshots.clear();
    this.agentChanges.clear();
    this.fileChanges.clear();
    this.changeHistory = [];
    
    this.stats = {
      totalChanges: 0,
      appliedChanges: 0,
      revertedChanges: 0,
      pendingChanges: 0,
      byType: {
        create: 0,
        modify: 0,
        delete: 0
      }
    };
    
    this.emit('reset');
  }
}

module.exports = ChangeTracker;
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * TaskManager - Manages task lifecycle and work queue
 */
class TaskManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger || console;
    this.tasks = new Map(); // taskId -> Task
    this.tasksByStatus = {
      pending: new Set(),
      planning: new Set(),
      in_progress: new Set(),
      review: new Set(),
      testing: new Set(),
      completed: new Set(),
      blocked: new Set(),
      failed: new Set()
    };
    this.tasksByAgent = new Map(); // agentId -> Set<taskId>
    this.taskDependencies = new Map(); // taskId -> Set<dependencyTaskId>
    this.metrics = {
      totalCreated: 0,
      totalCompleted: 0,
      totalFailed: 0,
      averageCompletionTime: 0
    };
  }

  /**
   * Create a new task
   */
  createTask(data) {
    const task = {
      id: uuidv4(),
      title: data.title || 'Untitled Task',
      description: data.description || '',
      goalId: data.goalId,
      projectId: data.projectId,
      status: 'pending',
      priority: data.priority || 'normal',
      assignedAgent: null,
      dependencies: data.dependencies || [],
      estimatedTime: data.estimatedTime || null,
      actualTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      blockers: [],
      metadata: data.metadata || {},
      history: []
    };

    // Add to maps
    this.tasks.set(task.id, task);
    this.tasksByStatus.pending.add(task.id);
    
    // Track dependencies
    if (task.dependencies.length > 0) {
      this.taskDependencies.set(task.id, new Set(task.dependencies));
    }

    // Update metrics
    this.metrics.totalCreated++;

    // Add to history
    this.addToHistory(task.id, 'created', { status: 'pending' });

    // Emit event
    this.emit('task:created', task);

    this.logger.info(`Task created: ${task.id} - ${task.title}`);
    return task;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId, newStatus, details = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const oldStatus = task.status;
    
    // Validate status transition
    if (!this.isValidTransition(oldStatus, newStatus)) {
      throw new Error(`Invalid status transition: ${oldStatus} -> ${newStatus}`);
    }

    // Remove from old status set
    if (this.tasksByStatus[oldStatus]) {
      this.tasksByStatus[oldStatus].delete(taskId);
    }

    // Add to new status set
    if (this.tasksByStatus[newStatus]) {
      this.tasksByStatus[newStatus].add(taskId);
    }

    // Update task
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();

    // Handle status-specific updates
    if (newStatus === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    } else if (newStatus === 'completed') {
      task.completedAt = new Date().toISOString();
      if (task.startedAt) {
        task.actualTime = Date.now() - new Date(task.startedAt).getTime();
      }
      this.metrics.totalCompleted++;
      this.updateAverageCompletionTime(task.actualTime);
    } else if (newStatus === 'failed') {
      this.metrics.totalFailed++;
    }

    // Add to history
    this.addToHistory(taskId, 'status_changed', { 
      oldStatus, 
      newStatus,
      ...details 
    });

    // Emit event
    this.emit('task:statusChanged', {
      taskId,
      oldStatus,
      newStatus,
      task,
      details
    });

    this.logger.info(`Task ${taskId} status: ${oldStatus} -> ${newStatus}`);
    return task;
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId, agentId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousAgent = task.assignedAgent;
    
    // Remove from previous agent if assigned
    if (previousAgent && this.tasksByAgent.has(previousAgent)) {
      this.tasksByAgent.get(previousAgent).delete(taskId);
    }

    // Assign to new agent
    task.assignedAgent = agentId;
    task.updatedAt = new Date().toISOString();

    // Track by agent
    if (!this.tasksByAgent.has(agentId)) {
      this.tasksByAgent.set(agentId, new Set());
    }
    this.tasksByAgent.get(agentId).add(taskId);

    // Add to history
    this.addToHistory(taskId, 'assigned', { 
      previousAgent,
      newAgent: agentId 
    });

    // Emit event
    this.emit('task:assigned', {
      taskId,
      agentId,
      previousAgent,
      task
    });

    this.logger.info(`Task ${taskId} assigned to ${agentId}`);
    return task;
  }

  /**
   * Add blocker to task
   */
  addBlocker(taskId, blocker) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.blockers.push({
      id: uuidv4(),
      description: blocker.description,
      type: blocker.type || 'dependency',
      createdAt: new Date().toISOString()
    });

    // Update status to blocked if not already
    if (task.status !== 'blocked') {
      this.updateTaskStatus(taskId, 'blocked', { blocker });
    }

    task.updatedAt = new Date().toISOString();

    // Add to history
    this.addToHistory(taskId, 'blocker_added', blocker);

    // Emit event
    this.emit('task:blocked', {
      taskId,
      blocker,
      task
    });

    return task;
  }

  /**
   * Remove blocker from task
   */
  removeBlocker(taskId, blockerId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const blockerIndex = task.blockers.findIndex(b => b.id === blockerId);
    if (blockerIndex === -1) {
      throw new Error(`Blocker not found: ${blockerId}`);
    }

    const removed = task.blockers.splice(blockerIndex, 1)[0];
    task.updatedAt = new Date().toISOString();

    // If no more blockers, change status back to previous
    if (task.blockers.length === 0 && task.status === 'blocked') {
      // Determine appropriate status
      const newStatus = task.startedAt ? 'in_progress' : 'pending';
      this.updateTaskStatus(taskId, newStatus, { unblockedReason: 'All blockers removed' });
    }

    // Add to history
    this.addToHistory(taskId, 'blocker_removed', { blockerId, removed });

    // Emit event
    this.emit('task:unblocked', {
      taskId,
      blockerId,
      task
    });

    return task;
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status) {
    const taskIds = this.tasksByStatus[status];
    if (!taskIds) {
      return [];
    }

    return Array.from(taskIds).map(id => this.tasks.get(id)).filter(Boolean);
  }

  /**
   * Get tasks by agent
   */
  getTasksByAgent(agentId) {
    const taskIds = this.tasksByAgent.get(agentId);
    if (!taskIds) {
      return [];
    }

    return Array.from(taskIds).map(id => this.tasks.get(id)).filter(Boolean);
  }

  /**
   * Get all tasks for a project
   */
  getProjectTasks(projectId) {
    const tasks = [];
    for (const task of this.tasks.values()) {
      if (task.projectId === projectId) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Get task dependencies
   */
  getTaskDependencies(taskId) {
    const deps = this.taskDependencies.get(taskId);
    if (!deps) {
      return [];
    }

    return Array.from(deps).map(id => this.tasks.get(id)).filter(Boolean);
  }

  /**
   * Check if task can start (all dependencies completed)
   */
  canTaskStart(taskId) {
    const deps = this.taskDependencies.get(taskId);
    if (!deps || deps.size === 0) {
      return true;
    }

    for (const depId of deps) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Get queue metrics
   */
  getMetrics(projectId = null) {
    const metrics = {
      byStatus: {},
      byAgent: {},
      byPriority: {},
      ...this.metrics
    };

    // Count by status
    for (const [status, taskIds] of Object.entries(this.tasksByStatus)) {
      metrics.byStatus[status] = taskIds.size;
    }

    // Count by agent
    for (const [agentId, taskIds] of this.tasksByAgent.entries()) {
      metrics.byAgent[agentId] = taskIds.size;
    }

    // Count by priority
    const priorities = {};
    for (const task of this.tasks.values()) {
      if (!projectId || task.projectId === projectId) {
        priorities[task.priority] = (priorities[task.priority] || 0) + 1;
      }
    }
    metrics.byPriority = priorities;

    return metrics;
  }

  /**
   * Validate status transition
   */
  isValidTransition(from, to) {
    const validTransitions = {
      'pending': ['planning', 'in_progress', 'blocked', 'failed'],
      'planning': ['in_progress', 'blocked', 'failed', 'pending'],
      'in_progress': ['review', 'testing', 'blocked', 'failed', 'completed'],
      'review': ['in_progress', 'testing', 'blocked', 'failed'],
      'testing': ['in_progress', 'completed', 'failed', 'blocked'],
      'blocked': ['pending', 'planning', 'in_progress', 'failed'],
      'completed': [], // Terminal state
      'failed': ['pending', 'planning'] // Can retry
    };

    const allowed = validTransitions[from] || [];
    return allowed.includes(to);
  }

  /**
   * Add to task history
   */
  addToHistory(taskId, action, details = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    if (!task.history) {
      task.history = [];
    }

    task.history.push({
      timestamp: new Date().toISOString(),
      action,
      details
    });

    // Keep only last 100 history items
    if (task.history.length > 100) {
      task.history = task.history.slice(-100);
    }
  }

  /**
   * Update average completion time
   */
  updateAverageCompletionTime(newTime) {
    const total = this.metrics.totalCompleted;
    if (total === 1) {
      this.metrics.averageCompletionTime = newTime;
    } else {
      // Running average
      const oldAvg = this.metrics.averageCompletionTime;
      this.metrics.averageCompletionTime = ((oldAvg * (total - 1)) + newTime) / total;
    }
  }

  /**
   * Clear completed tasks older than specified hours
   */
  clearOldCompletedTasks(hoursOld = 24) {
    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
    const toRemove = [];

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' && task.completedAt) {
        const completedTime = new Date(task.completedAt).getTime();
        if (completedTime < cutoffTime) {
          toRemove.push(taskId);
        }
      }
    }

    for (const taskId of toRemove) {
      this.removeTask(taskId);
    }

    return toRemove.length;
  }

  /**
   * Remove a task completely
   */
  removeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // Remove from all tracking maps
    this.tasks.delete(taskId);
    
    // Remove from status tracking
    if (this.tasksByStatus[task.status]) {
      this.tasksByStatus[task.status].delete(taskId);
    }

    // Remove from agent tracking
    if (task.assignedAgent && this.tasksByAgent.has(task.assignedAgent)) {
      this.tasksByAgent.get(task.assignedAgent).delete(taskId);
    }

    // Remove from dependencies
    this.taskDependencies.delete(taskId);

    this.emit('task:removed', { taskId, task });
  }
}

module.exports = TaskManager;
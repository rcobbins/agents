/**
 * TaskQueueMonitor - Monitors task queue health and prevents starvation
 * Ensures coordinator never gets stuck with empty queue or stalled agents
 */
class TaskQueueMonitor {
  constructor(logger = console) {
    this.logger = logger;
    this.monitorInterval = null;
    this.healthCheckInterval = null;
    this.lastQueueCheck = null;
    this.emptyQueueCount = 0;
    this.stalledAgentThreshold = 300000; // 5 minutes
    this.maxEmptyQueueChecks = 3; // Trigger recovery after 3 empty checks
    this.metrics = {
      recoveryAttempts: 0,
      stalledAgentsDetected: 0,
      emergencyTasksInjected: 0,
      healthChecks: 0
    };
  }

  /**
   * Start monitoring a coordinator
   */
  startMonitoring(coordinator, options = {}) {
    const {
      checkInterval = 60000, // Check every minute
      healthInterval = 30000, // Health check every 30 seconds
      autoRecover = true
    } = options;

    this.logger.log('[TaskQueueMonitor] Starting monitoring service');
    
    // Monitor task queue
    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkTaskQueue(coordinator, autoRecover);
      } catch (error) {
        this.logger.logError(`[TaskQueueMonitor] Error checking task queue: ${error.message}`);
      }
    }, checkInterval);

    // Monitor agent health
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAgentHealth(coordinator, autoRecover);
      } catch (error) {
        this.logger.logError(`[TaskQueueMonitor] Error checking agent health: ${error.message}`);
      }
    }, healthInterval);

    // Initial check
    this.checkTaskQueue(coordinator, autoRecover);
    this.checkAgentHealth(coordinator, autoRecover);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.logger.log('[TaskQueueMonitor] Monitoring stopped');
  }

  /**
   * Check task queue health
   */
  async checkTaskQueue(coordinator, autoRecover) {
    this.lastQueueCheck = Date.now();
    const queueLength = coordinator.taskQueue?.length || 0;
    const pendingTasks = coordinator.taskQueue?.filter(t => t.status === 'pending').length || 0;
    const inProgressTasks = coordinator.taskQueue?.filter(t => t.status === 'in_progress').length || 0;
    const failedTasks = coordinator.taskQueue?.filter(t => t.status === 'failed').length || 0;

    this.logger.log(`[TaskQueueMonitor] Queue Status - Total: ${queueLength}, Pending: ${pendingTasks}, In Progress: ${inProgressTasks}, Failed: ${failedTasks}`);

    // Check for empty queue
    if (pendingTasks === 0 && inProgressTasks === 0) {
      this.emptyQueueCount++;
      this.logger.log(`[TaskQueueMonitor] Empty queue detected (${this.emptyQueueCount}/${this.maxEmptyQueueChecks})`);
      
      if (this.emptyQueueCount >= this.maxEmptyQueueChecks && autoRecover) {
        await this.handleEmptyQueue(coordinator);
      }
    } else {
      this.emptyQueueCount = 0; // Reset counter
    }

    // Check for too many failed tasks
    if (failedTasks > 5 && autoRecover) {
      this.logger.log(`[TaskQueueMonitor] High number of failed tasks: ${failedTasks}`);
      await this.handleFailedTasks(coordinator);
    }

    // Check for stuck queue (all tasks blocked)
    const blockedTasks = coordinator.taskQueue?.filter(t => 
      t.status === 'pending' && 
      t.dependencies?.length > 0 &&
      !this.canExecuteTask(t, coordinator.taskQueue)
    ).length || 0;

    if (blockedTasks === pendingTasks && pendingTasks > 0 && autoRecover) {
      this.logger.logError(`[TaskQueueMonitor] All tasks are blocked by dependencies!`);
      await this.handleBlockedQueue(coordinator);
    }
  }

  /**
   * Check if a task can be executed (dependencies met)
   */
  canExecuteTask(task, taskQueue) {
    if (!task.dependencies || task.dependencies.length === 0) return true;
    
    return task.dependencies.every(depId => {
      const dep = taskQueue.find(t => t.id === depId);
      return dep && dep.status === 'completed';
    });
  }

  /**
   * Check agent health
   */
  async checkAgentHealth(coordinator, autoRecover) {
    this.metrics.healthChecks++;
    const now = Date.now();
    
    for (const [agentName, status] of Object.entries(coordinator.agentStatus || {})) {
      // Check for stalled agents
      if (status.status === 'busy' && status.currentTask) {
        const task = coordinator.taskQueue?.find(t => t.id === status.currentTask);
        if (task && task.assignedAt) {
          const taskAge = now - new Date(task.assignedAt).getTime();
          
          if (taskAge > this.stalledAgentThreshold) {
            this.logger.log(`[TaskQueueMonitor] Agent ${agentName} appears stalled on task ${status.currentTask} (${Math.round(taskAge/60000)} minutes)`);
            this.metrics.stalledAgentsDetected++;
            
            if (autoRecover) {
              await this.handleStalledAgent(coordinator, agentName, task);
            }
          }
        }
      }

      // Check for agents that haven't been seen recently
      if (status.lastSeen) {
        const lastSeenAge = now - new Date(status.lastSeen).getTime();
        if (lastSeenAge > 600000) { // 10 minutes
          this.logger.log(`[TaskQueueMonitor] Agent ${agentName} hasn't been seen for ${Math.round(lastSeenAge/60000)} minutes`);
        }
      }
    }
  }

  /**
   * Handle empty queue situation
   */
  async handleEmptyQueue(coordinator) {
    this.logger.log('[TaskQueueMonitor] Initiating empty queue recovery');
    this.metrics.recoveryAttempts++;
    this.emptyQueueCount = 0; // Reset counter
    
    try {
      // First, try to generate new tasks from goals
      if (coordinator.generateRecoveryTasks) {
        await coordinator.generateRecoveryTasks();
      }
      
      // Check if tasks were added
      await coordinator.loadTaskQueue?.();
      const newQueueLength = coordinator.taskQueue?.length || 0;
      
      if (newQueueLength === 0) {
        // Still empty, inject emergency tasks
        await this.injectEmergencyTasks(coordinator);
      } else {
        this.logger.log(`[TaskQueueMonitor] Recovery successful, ${newQueueLength} tasks in queue`);
      }
    } catch (error) {
      this.logger.logError(`[TaskQueueMonitor] Recovery failed: ${error.message}`);
      // Force inject emergency tasks
      await this.injectEmergencyTasks(coordinator);
    }
  }

  /**
   * Inject emergency tasks
   */
  async injectEmergencyTasks(coordinator) {
    this.logger.log('[TaskQueueMonitor] Injecting emergency tasks');
    this.metrics.emergencyTasksInjected++;
    
    const emergencyTasks = [
      {
        id: `emergency_${Date.now()}_1`,
        description: 'Analyze current project state and identify next steps',
        assignedAgent: 'planner',
        priority: 'critical',
        dependencies: [],
        estimatedEffort: 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0,
        isEmergency: true
      },
      {
        id: `emergency_${Date.now()}_2`,
        description: 'Review completed work and create follow-up tasks',
        assignedAgent: 'reviewer',
        priority: 'high',
        dependencies: [],
        estimatedEffort: 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0,
        isEmergency: true
      }
    ];

    for (const task of emergencyTasks) {
      if (coordinator.addTask) {
        await coordinator.addTask(task);
      } else {
        // Direct insertion
        coordinator.taskQueue = coordinator.taskQueue || [];
        coordinator.taskQueue.push(task);
      }
    }
    
    // Save queue
    if (coordinator.saveTaskQueue) {
      await coordinator.saveTaskQueue();
    }
    
    // Trigger distribution
    if (coordinator.distributeTasks) {
      await coordinator.distributeTasks();
    }
    
    this.logger.log(`[TaskQueueMonitor] Injected ${emergencyTasks.length} emergency tasks`);
  }

  /**
   * Handle failed tasks
   */
  async handleFailedTasks(coordinator) {
    this.logger.log('[TaskQueueMonitor] Processing failed tasks');
    
    const failedTasks = coordinator.taskQueue?.filter(t => t.status === 'failed') || [];
    const MAX_RETRIES = 5;
    
    for (const task of failedTasks) {
      if ((task.attempts || 0) < MAX_RETRIES) {
        // Reset for retry
        task.status = 'pending';
        task.attempts = (task.attempts || 0) + 1;
        delete task.error;
        delete task.failedAt;
        this.logger.log(`[TaskQueueMonitor] Resetting failed task ${task.id} for retry (attempt ${task.attempts})`);
      } else {
        // Create a recovery task
        const recoveryTask = {
          id: `recovery_${task.id}_${Date.now()}`,
          description: `Investigate and resolve issue with: ${task.description}`,
          assignedAgent: 'planner',
          priority: 'high',
          dependencies: [],
          estimatedEffort: 2,
          status: 'pending',
          originalTask: task.id,
          isRecovery: true
        };
        
        if (coordinator.addTask) {
          await coordinator.addTask(recoveryTask);
        }
        
        // Mark original as abandoned
        task.status = 'abandoned';
        this.logger.log(`[TaskQueueMonitor] Created recovery task for abandoned task ${task.id}`);
      }
    }
    
    if (coordinator.saveTaskQueue) {
      await coordinator.saveTaskQueue();
    }
  }

  /**
   * Handle blocked queue (circular dependencies)
   */
  async handleBlockedQueue(coordinator) {
    this.logger.log('[TaskQueueMonitor] Resolving blocked queue');
    
    // Find tasks with unmet dependencies
    const blockedTasks = coordinator.taskQueue?.filter(t => 
      t.status === 'pending' && 
      t.dependencies?.length > 0 &&
      !this.canExecuteTask(t, coordinator.taskQueue)
    ) || [];

    for (const task of blockedTasks) {
      // Check for circular dependencies or missing tasks
      const invalidDeps = task.dependencies.filter(depId => {
        const dep = coordinator.taskQueue.find(t => t.id === depId);
        return !dep || dep.status === 'abandoned';
      });
      
      if (invalidDeps.length > 0) {
        // Remove invalid dependencies
        task.dependencies = task.dependencies.filter(d => !invalidDeps.includes(d));
        this.logger.log(`[TaskQueueMonitor] Removed invalid dependencies from task ${task.id}: ${invalidDeps.join(', ')}`);
      }
    }
    
    // If still blocked, force one task to start
    if (blockedTasks.length > 0) {
      const forceStart = blockedTasks[0];
      forceStart.dependencies = [];
      forceStart.forcedStart = true;
      this.logger.log(`[TaskQueueMonitor] Force-starting blocked task ${forceStart.id}`);
    }
    
    if (coordinator.saveTaskQueue) {
      await coordinator.saveTaskQueue();
    }
  }

  /**
   * Handle stalled agent
   */
  async handleStalledAgent(coordinator, agentName, task) {
    this.logger.log(`[TaskQueueMonitor] Handling stalled agent ${agentName} on task ${task.id}`);
    
    // Mark task as failed
    task.status = 'failed';
    task.error = 'Agent stalled - timeout exceeded';
    task.failedAt = new Date().toISOString();
    
    // Reset agent status
    if (coordinator.agentStatus[agentName]) {
      coordinator.agentStatus[agentName].status = 'available';
      coordinator.agentStatus[agentName].currentTask = null;
    }
    
    // Save states
    if (coordinator.saveTaskQueue) {
      await coordinator.saveTaskQueue();
    }
    if (coordinator.saveAgentStatus) {
      await coordinator.saveAgentStatus();
    }
    
    // Emit event
    if (coordinator.emit) {
      coordinator.emit('agent:stalled', {
        agent: agentName,
        task: task.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Trigger task redistribution
    if (coordinator.distributeTasks) {
      await coordinator.distributeTasks();
    }
  }

  /**
   * Generate recovery tasks based on current state
   */
  async generateRecoveryTasks(coordinator) {
    const workLog = coordinator.workLog || [];
    const hasCompletedWork = workLog.length > 0;
    
    const recoveryTasks = [];
    
    if (hasCompletedWork) {
      // Build on completed work
      recoveryTasks.push({
        id: `recovery_next_${Date.now()}`,
        description: 'Analyze completed work and determine next implementation steps',
        assignedAgent: 'planner',
        priority: 'high'
      });
    } else {
      // Start fresh
      recoveryTasks.push({
        id: `recovery_init_${Date.now()}`,
        description: 'Initialize project structure and create implementation roadmap',
        assignedAgent: 'planner',
        priority: 'critical'
      });
    }
    
    return recoveryTasks;
  }

  /**
   * Get monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      lastQueueCheck: this.lastQueueCheck,
      emptyQueueCount: this.emptyQueueCount,
      isMonitoring: !!this.monitorInterval
    };
  }
}

module.exports = TaskQueueMonitor;
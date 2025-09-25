const BaseAgent = require('./BaseAgent');
const fs = require('fs').promises;
const path = require('path');

/**
 * CoordinatorAgent - Orchestrates work between all agents
 */
class CoordinatorAgent extends BaseAgent {
  constructor(projectDir) {
    super('coordinator', 'Work Orchestrator and Planner', projectDir);
    
    // Coordinator-specific data
    this.taskQueue = [];
    this.workLog = [];
    this.agentStatus = {};
    this.agents = ['planner', 'tester', 'coder', 'reviewer'];
    
    // File paths for persistence
    this.taskQueueFile = path.join(this.directories.workspace, 'task_queue.json');
    this.workLogFile = path.join(this.directories.workspace, 'work_completed.json');
    this.agentStatusFile = path.join(this.directories.workspace, 'agent_status.json');
  }
  
  /**
   * Initialize coordinator-specific resources
   */
  async initializeAgent() {
    await this.log('Initializing Coordinator Agent');
    
    // Load or create task queue
    if (await this.fileExists(this.taskQueueFile)) {
      const content = await fs.readFile(this.taskQueueFile, 'utf8');
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          this.taskQueue = parsed;
        } else {
          this.taskQueue = [];
          await this.logError('Task queue file has invalid format, using empty array');
        }
      } catch (error) {
        this.taskQueue = [];
        await this.logError(`Failed to parse task queue: ${error.message}`);
      }
      await this.log(`Loaded ${this.taskQueue.length} tasks from queue`);
    } else {
      await fs.writeFile(this.taskQueueFile, '[]');
    }
    
    // Load or create work log
    if (await this.fileExists(this.workLogFile)) {
      const content = await fs.readFile(this.workLogFile, 'utf8');
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          this.workLog = parsed;
        } else {
          this.workLog = [];
          await this.logError('Work log file has invalid format, using empty array');
        }
      } catch (error) {
        this.workLog = [];
        await this.logError(`Failed to parse work log: ${error.message}`);
      }
      await this.log(`Loaded ${this.workLog.length} completed work items`);
    } else {
      await fs.writeFile(this.workLogFile, '[]');
    }
    
    // Initialize agent status
    for (const agent of this.agents) {
      this.agentStatus[agent] = {
        status: 'available',  // Changed from 'unknown' to 'available' so agents can receive tasks
        lastSeen: null,
        currentTask: null,
        tasksCompleted: 0
      };
    }
    
    // Analyze project if this is a fresh start
    if (this.taskQueue.length === 0) {
      await this.analyzeProject();
    }
    
    // Immediately try to distribute existing tasks
    await this.log('Performing initial task distribution check');
    await this.distributeTasks();
  }
  
  /**
   * Analyze project and create initial task list
   */
  async analyzeProject() {
    await this.log('Analyzing project to create initial task list');
    
    const prompt = `As a project coordinator, analyze this project and create an initial task list.
    
Project Vision:
${this.projectVision || 'Not provided'}
    
Project Specification:
${this.projectSpec || 'Not provided'}

Project Goals:
${JSON.stringify(this.goals, null, 2) || 'Not provided'}

Please provide a structured task list with the following for each task:
1. Task ID (unique identifier)
2. Task description
3. Assigned agent (planner, coder, tester, or reviewer)
4. Priority (high, medium, or low)
5. Dependencies (task IDs that must be completed first)
6. Estimated effort (hours)

Format the response as a JSON array of task objects.`;
    
    try {
      const response = await this.askClaude(prompt);
      
      // Try to parse the response as JSON
      let tasks = [];
      try {
        // Extract JSON from the response (it might be wrapped in markdown)
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          tasks = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        // If parsing fails, create a basic task list
        await this.logError(`Failed to parse task list from Claude: ${parseError.message}`);
        tasks = this.createDefaultTasks();
      }
      
      // Add tasks to queue
      for (const task of tasks) {
        await this.addTask(task);
      }
      
      await this.log(`Created ${tasks.length} initial tasks`);
    } catch (error) {
      await this.logError(`Failed to analyze project: ${error.message}`);
      // Create default tasks as fallback
      const defaultTasks = this.createDefaultTasks();
      for (const task of defaultTasks) {
        await this.addTask(task);
      }
    }
  }
  
  /**
   * Create default tasks as fallback
   */
  createDefaultTasks() {
    return [
      {
        id: 'task_001',
        description: 'Analyze project structure and create detailed implementation plan',
        assignedAgent: 'planner',
        priority: 'high',
        dependencies: [],
        estimatedEffort: 2,
        status: 'pending'
      },
      {
        id: 'task_002',
        description: 'Set up project scaffolding and base structure',
        assignedAgent: 'coder',
        priority: 'high',
        dependencies: ['task_001'],
        estimatedEffort: 3,
        status: 'pending'
      },
      {
        id: 'task_003',
        description: 'Create test framework and initial test cases',
        assignedAgent: 'tester',
        priority: 'medium',
        dependencies: ['task_002'],
        estimatedEffort: 2,
        status: 'pending'
      },
      {
        id: 'task_004',
        description: 'Review initial code structure and suggest improvements',
        assignedAgent: 'reviewer',
        priority: 'medium',
        dependencies: ['task_002'],
        estimatedEffort: 1,
        status: 'pending'
      }
    ];
  }
  
  /**
   * Add task to queue
   */
  async addTask(task) {
    // Ensure task has required fields
    const completeTask = {
      id: task.id || `task_${Date.now()}`,
      description: task.description,
      assignedAgent: task.assignedAgent,
      priority: task.priority || 'medium',
      dependencies: task.dependencies || [],
      estimatedEffort: task.estimatedEffort || 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0
    };
    
    this.taskQueue.push(completeTask);
    await this.saveTaskQueue();
    
    await this.log(`Added task ${completeTask.id} to queue`);
    return completeTask;
  }
  
  /**
   * Distribute tasks to agents
   */
  async distributeTasks() {
    const availableTasks = this.getAvailableTasks();
    await this.log(`Found ${availableTasks.length} available tasks to distribute`);
    
    for (const task of availableTasks) {
      const agent = task.assignedAgent;
      const agentStatus = this.agentStatus[agent].status;
      
      // Check if agent is available (not busy)
      if (agentStatus === 'busy') {
        await this.log(`Agent ${agent} is busy, skipping task ${task.id}`);
        continue;
      }
      
      // Agent is available or unknown - assign the task
      if (agentStatus === 'available' || agentStatus === 'unknown') {
        await this.log(`Assigning task ${task.id} to ${agentStatus} agent ${agent}`);
        await this.assignTaskToAgent(task, agent);
      } else {
        await this.log(`Agent ${agent} has unexpected status: ${agentStatus}, skipping task ${task.id}`);
      }
    }
  }
  
  /**
   * Get tasks that are ready to be executed (dependencies met)
   */
  getAvailableTasks() {
    // First check TaskManager if available
    if (this.useTaskManager && this.taskManager) {
      const tasks = this.taskManager.getProjectTasks(this.projectId);
      
      if (tasks.length > 0) {
        this.log(`Found ${tasks.length} tasks in TaskManager for project ${this.projectId}`);
        
        // Convert TaskManager tasks to internal format
        const availableTasks = tasks.filter(task => {
          const isAvailable = ['pending', 'planning'].includes(task.status);
          const noDeps = !task.dependencies || task.dependencies.length === 0 || 
            task.dependencies.every(depId => {
              const dep = tasks.find(t => t.id === depId);
              return dep && dep.status === 'completed';
            });
          return isAvailable && noDeps;
        }).map(task => ({
          id: task.id,
          description: task.description || task.title,
          assignedAgent: this.mapTaskToAgent(task),
          priority: task.priority,
          dependencies: task.dependencies,
          status: 'pending',
          fromTaskManager: true  // Flag to track source
        }));
        
        if (availableTasks.length > 0) {
          this.log(`${availableTasks.length} TaskManager tasks ready for distribution`);
          return availableTasks;
        }
      }
    }
    
    // Fallback to file-based task queue
    const MAX_RETRY_ATTEMPTS = 5;
    
    // Log current task queue state
    const pendingTasks = this.taskQueue.filter(task => task.status === 'pending');
    const failedTasks = this.taskQueue.filter(task => task.status === 'failed');
    const inProgressTasks = this.taskQueue.filter(task => task.status === 'in_progress');
    
    if (pendingTasks.length === 0 && failedTasks.length > 0) {
      this.log(`No pending tasks, but ${failedTasks.length} failed tasks that may be retried`);
    }
    
    if (pendingTasks.length === 0 && inProgressTasks.length > 0) {
      this.log(`No pending tasks, but ${inProgressTasks.length} tasks in progress: ${inProgressTasks.map(t => t.id).join(', ')}`);
    }
    
    return this.taskQueue
      .filter(task => {
        // Include pending tasks and failed tasks that can be retried
        if (task.status === 'pending') return true;
        if (task.status === 'failed' && (task.attempts || 0) < MAX_RETRY_ATTEMPTS) {
          // Check if enough time has passed since last failure (exponential backoff)
          const lastFailure = task.failedAt ? new Date(task.failedAt).getTime() : 0;
          const backoffTime = Math.min(60000 * Math.pow(2, task.attempts || 0), 300000); // Max 5 minutes
          const timeSinceFailure = Date.now() - lastFailure;
          
          if (timeSinceFailure >= backoffTime) {
            this.log(`Task ${task.id} ready for retry (attempt ${(task.attempts || 0) + 1}/${MAX_RETRY_ATTEMPTS})`);
            return true;
          }
        }
        return false;
      })
      .filter(task => {
        // Check if all dependencies are completed
        return task.dependencies.every(depId => {
          const dep = this.taskQueue.find(t => t.id === depId);
          return dep && dep.status === 'completed';
        });
      })
      .sort((a, b) => {
        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }
  
  /**
   * Map task to appropriate agent based on content
   */
  mapTaskToAgent(task) {
    const taskText = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
    
    if (taskText.includes('plan') || taskText.includes('design') || 
        taskText.includes('architect') || taskText.includes('structure')) {
      return 'planner';
    }
    if (taskText.includes('test') || taskText.includes('coverage') || 
        taskText.includes('spec') || taskText.includes('validate')) {
      return 'tester';
    }
    if (taskText.includes('review') || taskText.includes('refactor') || 
        taskText.includes('optimize') || taskText.includes('improve')) {
      return 'reviewer';
    }
    
    // Default to coder for implementation tasks
    return 'coder';
  }
  
  /**
   * Assign task to specific agent
   */
  async assignTaskToAgent(task, agentName) {
    await this.log(`Assigning task ${task.id} to ${agentName}`);
    
    // Handle TaskManager tasks differently
    if (task.fromTaskManager && this.useTaskManager && this.taskManager) {
      try {
        // Update via TaskManager
        await this.taskManager.assignTask(task.id, agentName);
        await this.taskManager.updateTaskStatus(task.id, 'in_progress');
        
        await this.log(`Updated TaskManager: task ${task.id} assigned to ${agentName}`);
      } catch (error) {
        await this.logError(`Failed to update TaskManager: ${error.message}`);
      }
      
      // Update local agent status
      this.agentStatus[agentName].status = 'busy';
      this.agentStatus[agentName].currentTask = task.id;
      await this.saveAgentStatus();
      
      // Send message to agent
      const message = {
        type: 'EXECUTE_TASK',
        task: task,
        context: {
          projectSpec: this.projectSpec,
          projectVision: this.projectVision,
          goals: this.goals
        }
      };
      
      await this.sendMessage(agentName, message, task.priority);
      return;
    }
    
    // Original file-based logic
    const wasFailedTask = task.status === 'failed';
    task.status = 'in_progress';
    task.assignedAt = new Date().toISOString();
    task.attempts = (task.attempts || 0) + 1;
    
    if (wasFailedTask) {
      await this.log(`Retrying previously failed task ${task.id} (attempt ${task.attempts})`);
      delete task.failedAt;
      delete task.error;
    }
    
    await this.saveTaskQueue();
    
    // Update agent status
    this.agentStatus[agentName].status = 'busy';
    this.agentStatus[agentName].currentTask = task.id;
    await this.saveAgentStatus();
    
    // Send message to agent
    const message = {
      type: 'EXECUTE_TASK',
      task: task,
      context: {
        projectSpec: this.projectSpec,
        projectVision: this.projectVision,
        goals: this.goals
      }
    };
    
    await this.sendMessage(agentName, message, task.priority);
  }
  
  /**
   * Handle task completion
   */
  async handleTaskCompletion(taskId, result, agentName) {
    await this.log(`Task ${taskId} completed by ${agentName}`);
    
    // Find and update task
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;
      
      // Add to work log
      this.workLog.push({
        taskId: taskId,
        description: task.description,
        completedBy: agentName,
        completedAt: task.completedAt,
        result: result
      });
      
      await this.saveTaskQueue();
      await this.saveWorkLog();
      
      // Generate follow-up tasks based on completion
      await this.generateFollowUpTasks(task, result);
    }
    
    // Update agent status
    this.agentStatus[agentName].status = 'available';
    this.agentStatus[agentName].currentTask = null;
    this.agentStatus[agentName].tasksCompleted++;
    await this.saveAgentStatus();
    
    // Check if all tasks are completed
    await this.checkProjectCompletion();
    
    // Distribute next tasks
    await this.distributeTasks();
  }
  
  /**
   * Generate follow-up tasks based on task completion
   */
  async generateFollowUpTasks(completedTask, result) {
    await this.log(`Analyzing completed task ${completedTask.id} for follow-up work`);
    
    // Only generate follow-ups for certain task types
    if (completedTask.assignedAgent === 'planner' && result?.plan) {
      // Extract actionable items from planner's result
      const prompt = `Based on this completed planning task and its results, identify any immediate follow-up tasks needed.

Completed Task: ${completedTask.description}
Task Result: ${JSON.stringify(result, null, 2).substring(0, 1000)}

Project Goals:
${JSON.stringify(this.goals?.slice(0, 3), null, 2)}

If there are concrete implementation tasks that should follow this plan, provide them as a JSON array with:
- id: unique task ID
- description: clear task description
- assignedAgent: coder, tester, or reviewer
- priority: high, medium, or low
- dependencies: array of task IDs
- estimatedEffort: hours

Only generate tasks that are directly actionable. Return empty array if no follow-up needed.`;

      try {
        const response = await this.askClaude(prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const newTasks = JSON.parse(jsonMatch[0]);
          for (const newTask of newTasks) {
            await this.addTask({
              ...newTask,
              id: newTask.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              generatedFrom: completedTask.id
            });
          }
          if (newTasks.length > 0) {
            await this.log(`Generated ${newTasks.length} follow-up tasks from ${completedTask.id}`);
          }
        }
      } catch (error) {
        await this.logError(`Failed to generate follow-up tasks: ${error.message}`);
      }
    }
  }
  
  /**
   * Handle task failure
   */
  async handleTaskFailure(taskId, error, agentName) {
    await this.logError(`Task ${taskId} failed: ${error}`);
    
    const MAX_RETRY_ATTEMPTS = 5;
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      // Mark as failed but allow retry later via getAvailableTasks
      task.status = 'failed';
      task.failedAt = new Date().toISOString();
      task.error = error;
      
      if ((task.attempts || 0) < MAX_RETRY_ATTEMPTS) {
        await this.log(`Task ${taskId} failed on attempt ${task.attempts}. Will retry later (${MAX_RETRY_ATTEMPTS - task.attempts} attempts remaining)`);
      } else {
        await this.logError(`Task ${taskId} permanently failed after ${MAX_RETRY_ATTEMPTS} attempts`);
      }
      
      await this.saveTaskQueue();
    }
    
    // Update agent status
    this.agentStatus[agentName].status = 'available';
    this.agentStatus[agentName].currentTask = null;
    await this.saveAgentStatus();
    
    // Distribute next tasks
    await this.distributeTasks();
  }
  
  /**
   * Check if project is completed
   */
  async checkProjectCompletion() {
    const pendingTasks = this.taskQueue.filter(t => t.status === 'pending' || t.status === 'in_progress');
    
    if (pendingTasks.length === 0) {
      const failedTasks = this.taskQueue.filter(t => t.status === 'failed');
      
      if (failedTasks.length > 0) {
        await this.log(`Project has ${failedTasks.length} failed tasks`);
      } else {
        await this.logSuccess('All tasks completed successfully!');
        await this.generateProjectReport();
      }
    }
  }
  
  /**
   * Generate project completion report
   */
  async generateProjectReport() {
    const report = {
      projectName: path.basename(this.projectDir),
      completionDate: new Date().toISOString(),
      totalTasks: this.taskQueue.length,
      completedTasks: this.taskQueue.filter(t => t.status === 'completed').length,
      failedTasks: this.taskQueue.filter(t => t.status === 'failed').length,
      totalEffort: this.taskQueue.reduce((sum, t) => sum + (t.estimatedEffort || 0), 0),
      agentPerformance: this.agentStatus,
      taskDetails: this.taskQueue
    };
    
    const reportFile = path.join(this.directories.workspace, 'project_report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    await this.log('Project report generated');
  }
  
  /**
   * Handle messages from other agents
   */
  async handleTask(message) {
    // Handle both direct task messages and wrapped messages
    const messageContent = message.message || message.content || message;
    const { type, ...data } = messageContent;
    const sender = message.from || data.from || 'unknown';
    
    switch (type) {
      case 'TASK_COMPLETED':
        await this.handleTaskCompletion(data.taskId, data.result, sender);
        break;
        
      case 'TASK_FAILED':
        await this.handleTaskFailure(data.taskId, data.error, sender);
        break;
        
      case 'STATUS_UPDATE':
        this.agentStatus[sender] = {
          ...this.agentStatus[sender],
          ...data.status,
          lastSeen: new Date().toISOString()
        };
        await this.saveAgentStatus();
        break;
        
      case 'REQUEST_TASK':
        await this.distributeTasks();
        break;
        
      default:
        await this.log(`Received unknown message type: ${type}`);
    }
  }
  
  /**
   * Override handleTaskMessage for integrated mode
   */
  async handleTaskMessage(message) {
    await this.handleTask(message);
  }
  
  /**
   * Periodic tasks for coordinator
   */
  async periodicTasks() {
    // Check agent health every 10 seconds (reduced for testing)
    const now = Date.now();
    if (!this.lastHealthCheck || now - this.lastHealthCheck > 10000) {
      await this.checkAgentHealth();
      this.lastHealthCheck = now;
    }
    
    // Try to distribute tasks
    await this.log('Running periodic task distribution check');
    await this.distributeTasks();
  }
  
  /**
   * Check health of all agents
   */
  async checkAgentHealth() {
    let recoveryNeeded = false;
    
    // First check for orphaned in_progress tasks
    const inProgressTasks = this.taskQueue.filter(t => t.status === 'in_progress');
    for (const task of inProgressTasks) {
      // Check if any agent claims this task
      const hasOwner = Object.values(this.agentStatus).some(
        status => status.currentTask === task.id
      );
      
      if (!hasOwner) {
        await this.log(`Found orphaned in_progress task ${task.id} with no agent owner, resetting to pending`);
        task.status = 'pending';
        task.attempts = (task.attempts || 0);
        delete task.assignedAt;
        recoveryNeeded = true;
      }
    }
    
    for (const agent of this.agents) {
      const status = this.agentStatus[agent];
      
      if (status.lastSeen) {
        const lastSeenMs = new Date(status.lastSeen).getTime();
        const timeSinceLastSeen = Date.now() - lastSeenMs;
        
        // If agent hasn't been seen in 5 minutes, mark as offline
        if (timeSinceLastSeen > 300000) {
          await this.log(`Agent ${agent} appears offline (last seen ${Math.floor(timeSinceLastSeen/60000)} minutes ago)`);
          status.status = 'offline';
          
          // If agent had a task, mark it as pending for reassignment
          if (status.currentTask) {
            const task = this.taskQueue.find(t => t.id === status.currentTask);
            if (task && task.status === 'in_progress') {
              task.status = 'pending';
              task.attempts = (task.attempts || 0) + 1;
              task.lastFailure = `Agent ${agent} went offline`;
              await this.log(`Reassigning task ${task.id} from offline agent ${agent}`);
              recoveryNeeded = true;
            }
            status.currentTask = null;
          }
        }
      } else {
        // Agent has never been seen, mark as unknown
        status.status = 'unknown';
      }
      
      // Check for stuck tasks (in progress for more than 10 minutes)
      if (status.currentTask && status.status === 'busy') {
        const task = this.taskQueue.find(t => t.id === status.currentTask);
        if (task && task.assignedAt) {
          const assignedTime = new Date(task.assignedAt).getTime();
          const timeInProgress = Date.now() - assignedTime;
          
          if (timeInProgress > 600000) { // 10 minutes
            await this.log(`Task ${task.id} appears stuck on ${agent} (${Math.floor(timeInProgress/60000)} minutes)`);
            
            // Reset task and agent status
            task.status = 'pending';
            task.attempts = (task.attempts || 0) + 1;
            task.lastFailure = 'Task timeout';
            status.status = 'available';
            status.currentTask = null;
            recoveryNeeded = true;
            
            // Send health check to agent
            await this.sendMessage(agent, {
              type: 'HEALTH_CHECK',
              requestId: `health_${Date.now()}`
            }, 'high');
          }
        }
      }
    }
    
    await this.saveAgentStatus();
    await this.saveTaskQueue();
    
    // If recovery needed, trigger task distribution
    if (recoveryNeeded) {
      await this.log('Triggering task redistribution due to agent recovery');
      await this.distributeTasks();
    }
  }
  
  /**
   * Save methods for persistence
   */
  async saveTaskQueue() {
    await fs.writeFile(this.taskQueueFile, JSON.stringify(this.taskQueue, null, 2));
  }
  
  async saveWorkLog() {
    await fs.writeFile(this.workLogFile, JSON.stringify(this.workLog, null, 2));
  }
  
  async saveAgentStatus() {
    await fs.writeFile(this.agentStatusFile, JSON.stringify(this.agentStatus, null, 2));
  }
  
  /**
   * Cleanup on shutdown
   */
  async cleanup() {
    // Save all state
    await this.saveTaskQueue();
    await this.saveWorkLog();
    await this.saveAgentStatus();
  }
}

module.exports = CoordinatorAgent;
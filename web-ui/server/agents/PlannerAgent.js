const BaseAgent = require('./BaseAgent');

/**
 * PlannerAgent - Creates detailed plans from high-level goals
 */
class PlannerAgent extends BaseAgent {
  constructor(projectDir) {
    super('planner', 'Technical Planning Specialist', projectDir);
  }
  
  /**
   * Handle task from coordinator
   */
  async handleTask(message) {
    // Handle both direct task messages and wrapped messages
    const messageContent = message.message || message.content || message;
    const { type, task, context } = messageContent;
    
    if (type === 'EXECUTE_TASK') {
      await this.log(`Received planning task: ${task.description}`);
      
      try {
        // Use loaded project documentation if context is missing
        const enhancedContext = {
          projectSpec: context?.projectSpec || this.projectSpec,
          projectVision: context?.projectVision || this.projectVision,
          goals: context?.goals || this.goals
        };
        
        // Execute the planning task
        const plan = await this.createPlan(task, enhancedContext);
        
        // Send completion message back to coordinator
        await this.sendMessage('coordinator', {
          type: 'TASK_COMPLETED',
          taskId: task.id,
          result: plan
        });
        
        await this.logSuccess(`Planning task completed: ${task.id}`);
      } catch (error) {
        await this.logError(`Planning task failed: ${error.message}`);
        
        // Send failure message
        await this.sendMessage('coordinator', {
          type: 'TASK_FAILED',
          taskId: task.id,
          error: error.message
        });
      }
    }
  }
  
  /**
   * Override handleTaskMessage for integrated mode
   */
  async handleTaskMessage(message) {
    await this.handleTask(message);
  }
  
  /**
   * Create a detailed plan for the task
   */
  async createPlan(task, context) {
    // Build comprehensive context string
    let contextString = '';
    
    if (context.projectVision) {
      contextString += `Project Vision:\n${context.projectVision}\n\n`;
    }
    
    if (context.projectSpec) {
      contextString += `Project Specification:\n${context.projectSpec}\n\n`;
    }
    
    if (context.goals) {
      contextString += `Project Goals:\n${JSON.stringify(context.goals, null, 2)}\n\n`;
    }
    
    const prompt = `As a technical planner, create a detailed implementation plan for this task:
    
Task: ${task.description}
Task ID: ${task.id}
Priority: ${task.priority}

${contextString}

Please provide:
1. Detailed step-by-step implementation plan
2. Technical requirements and dependencies
3. Potential challenges and solutions
4. Estimated timeline for each step
5. Success criteria

Format your response as a structured plan with clear sections.`;
    
    const response = await this.askClaude(prompt);
    
    return {
      taskId: task.id,
      plan: response,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Break down high-level goals into tasks
   */
  async breakDownGoals(goals) {
    const prompt = `Break down these high-level goals into concrete, actionable tasks:
    
Goals:
${JSON.stringify(goals, null, 2)}

For each task provide:
- Task description
- Required agent (coder/tester/reviewer)
- Dependencies
- Priority
- Estimated effort in hours

Return as a JSON array of tasks.`;
    
    const response = await this.askClaude(prompt);
    
    // Parse and return tasks
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      await this.logError(`Failed to parse tasks: ${error.message}`);
    }
    
    return [];
  }
}

module.exports = PlannerAgent;
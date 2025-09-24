const BaseAgent = require('./BaseAgent');
const fs = require('fs').promises;
const path = require('path');

/**
 * CoderAgent - Writes and refactors code
 */
class CoderAgent extends BaseAgent {
  constructor(projectDir) {
    super('coder', 'Code Implementation Specialist', projectDir);
  }
  
  /**
   * Handle task from coordinator
   */
  async handleTask(message) {
    const { type, task, context } = message.message;
    
    if (type === 'EXECUTE_TASK') {
      await this.log(`Received coding task: ${task.description}`);
      
      try {
        // Execute the coding task
        const result = await this.implementFeature(task, context);
        
        // Send completion message back to coordinator
        await this.sendMessage('coordinator', {
          type: 'TASK_COMPLETED',
          taskId: task.id,
          result: result
        });
        
        await this.logSuccess(`Coding task completed: ${task.id}`);
      } catch (error) {
        await this.logError(`Coding task failed: ${error.message}`);
        
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
   * Implement a feature based on task specifications
   */
  async implementFeature(task, context) {
    const prompt = `As a senior developer, implement the following task:
    
Task: ${task.description}
Task ID: ${task.id}
Priority: ${task.priority}

Project Context:
${JSON.stringify(context, null, 2)}

Please provide:
1. Complete, production-ready code implementation
2. Follow best practices and existing patterns in the codebase
3. Include proper error handling
4. Add appropriate comments for complex logic
5. Suggest file names and locations for the code

Format your response with clear code blocks and explanations.`;
    
    const response = await this.askClaude(prompt);
    
    // Try to extract code blocks and save them
    const codeBlocks = this.extractCodeBlocks(response);
    const savedFiles = [];
    
    for (const block of codeBlocks) {
      if (block.filename) {
        const filePath = path.join(this.projectDir, block.filename);
        try {
          // Create directory if it doesn't exist
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          // Write the code to file
          await fs.writeFile(filePath, block.code);
          savedFiles.push(filePath);
          await this.log(`Saved code to ${filePath}`);
        } catch (error) {
          await this.logError(`Failed to save file ${filePath}: ${error.message}`);
        }
      }
    }
    
    return {
      taskId: task.id,
      implementation: response,
      filesCreated: savedFiles,
      codeBlocks: codeBlocks,
      completedAt: new Date().toISOString()
    };
  }
  
  /**
   * Extract code blocks from Claude's response
   */
  extractCodeBlocks(response) {
    const blocks = [];
    const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
    const filenameRegex = /(?:file:|filename:|\/\/|#)\s*(\S+\.\w+)/i;
    
    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'plaintext';
      const code = match[2].trim();
      
      // Try to extract filename from comments or context
      const filenameMatch = response.substring(Math.max(0, match.index - 100), match.index).match(filenameRegex);
      const filename = filenameMatch ? filenameMatch[1] : null;
      
      blocks.push({
        language,
        code,
        filename
      });
    }
    
    return blocks;
  }
  
  /**
   * Fix a bug in existing code
   */
  async fixBug(bugDescription, filePath) {
    let existingCode = '';
    try {
      existingCode = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      await this.logError(`Could not read file ${filePath}`);
    }
    
    const prompt = `Fix the following bug in the code:
    
Bug Description: ${bugDescription}
File: ${filePath}

Existing Code:
\`\`\`
${existingCode}
\`\`\`

Provide the fixed code with explanations of what was changed and why.`;
    
    const response = await this.askClaude(prompt);
    return response;
  }
  
  /**
   * Refactor code for better quality
   */
  async refactorCode(filePath, refactorGoals) {
    let existingCode = '';
    try {
      existingCode = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      await this.logError(`Could not read file ${filePath}`);
    }
    
    const prompt = `Refactor the following code to improve its quality:
    
Refactoring Goals: ${refactorGoals}
File: ${filePath}

Existing Code:
\`\`\`
${existingCode}
\`\`\`

Provide the refactored code with explanations of the improvements made.`;
    
    const response = await this.askClaude(prompt);
    return response;
  }
}

module.exports = CoderAgent;
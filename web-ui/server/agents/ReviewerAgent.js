const BaseAgent = require('./BaseAgent');
const fs = require('fs').promises;
const path = require('path');

/**
 * ReviewerAgent - Code review and quality assurance
 */
class ReviewerAgent extends BaseAgent {
  constructor(projectDir) {
    super('reviewer', 'Code Review and Quality Specialist', projectDir);
  }
  
  /**
   * Handle task from coordinator
   */
  async handleTask(message) {
    const { type, task, context } = message.message;
    
    if (type === 'EXECUTE_TASK') {
      await this.log(`Received review task: ${task.description}`);
      
      try {
        // Execute the review task
        const result = await this.executeReviewTask(task, context);
        
        // Send completion message back to coordinator
        await this.sendMessage('coordinator', {
          type: 'TASK_COMPLETED',
          taskId: task.id,
          result: result
        });
        
        await this.logSuccess(`Review task completed: ${task.id}`);
      } catch (error) {
        await this.logError(`Review task failed: ${error.message}`);
        
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
   * Execute a code review task
   */
  async executeReviewTask(task, context) {
    const prompt = `As a senior code reviewer, perform a comprehensive review for this task:
    
Task: ${task.description}
Task ID: ${task.id}

Project Context:
${JSON.stringify(context, null, 2)}

Please provide:
1. Code quality assessment
2. Security vulnerabilities check
3. Performance considerations
4. Best practices compliance
5. Specific recommendations for improvement
6. Architecture and design feedback

Format as a detailed code review report.`;
    
    const response = await this.askClaude(prompt);
    
    // Extract actionable items from the review
    const actionItems = this.extractActionItems(response);
    
    return {
      taskId: task.id,
      review: response,
      actionItems: actionItems,
      completedAt: new Date().toISOString()
    };
  }
  
  /**
   * Review code in a specific file
   */
  async reviewCode(filePath) {
    let code = '';
    try {
      code = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      await this.logError(`Could not read file ${filePath}`);
      return null;
    }
    
    const prompt = `Perform a thorough code review of the following file:
    
File: ${filePath}

Code:
\`\`\`
${code}
\`\`\`

Review the code for:
1. Code quality and readability
2. Potential bugs or issues
3. Security vulnerabilities
4. Performance bottlenecks
5. Best practices and design patterns
6. Test coverage needs
7. Documentation quality

Provide specific, actionable feedback with line numbers where applicable.`;
    
    const review = await this.askClaude(prompt);
    
    return {
      file: filePath,
      review: review,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Check code against standards
   */
  async checkStandards(filePath, standards) {
    let code = '';
    try {
      code = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      await this.logError(`Could not read file ${filePath}`);
      return null;
    }
    
    const prompt = `Check if the following code complies with these standards:
    
Standards:
${standards}

Code:
\`\`\`
${code}
\`\`\`

Provide a detailed compliance report with:
1. Standards met
2. Standards violated
3. Specific violations with line numbers
4. Suggestions for compliance
5. Overall compliance score`;
    
    const compliance = await this.askClaude(prompt);
    return compliance;
  }
  
  /**
   * Suggest improvements for code
   */
  async suggestImprovements(code, goals) {
    const prompt = `Suggest improvements for the following code:
    
Improvement Goals: ${goals}

Code:
\`\`\`
${code}
\`\`\`

Provide:
1. Specific improvement suggestions
2. Refactored code examples
3. Benefits of each improvement
4. Implementation difficulty
5. Priority recommendations`;
    
    const suggestions = await this.askClaude(prompt);
    return suggestions;
  }
  
  /**
   * Review architecture and design
   */
  async reviewArchitecture(projectStructure) {
    const prompt = `Review the architecture and design of this project:
    
Project Structure:
${JSON.stringify(projectStructure, null, 2)}

Evaluate:
1. Architecture patterns and principles
2. Separation of concerns
3. Scalability considerations
4. Maintainability
5. Security architecture
6. Performance design
7. Technology choices

Provide recommendations for architectural improvements.`;
    
    const architectureReview = await this.askClaude(prompt);
    return architectureReview;
  }
  
  /**
   * Extract actionable items from review
   */
  extractActionItems(review) {
    const items = [];
    
    // Look for patterns that indicate action items
    const patterns = [
      /(?:should|must|need to|recommend|suggest)\s+(.+?)(?:\.|;|\n)/gi,
      /(?:fix|improve|refactor|update|change)\s+(.+?)(?:\.|;|\n)/gi,
      /(?:\d+\.)\s*(.+?)(?:\.|;|\n)/gi // Numbered lists
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(review)) !== null) {
        const item = match[1].trim();
        if (item.length > 10 && item.length < 200) {
          items.push({
            action: item,
            priority: this.classifyPriority(item)
          });
        }
      }
    }
    
    // Remove duplicates
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex((i) => i.action === item.action)
    );
    
    return uniqueItems;
  }
  
  /**
   * Classify priority of action items
   */
  classifyPriority(action) {
    const lowercased = action.toLowerCase();
    
    if (lowercased.includes('security') || 
        lowercased.includes('vulnerability') ||
        lowercased.includes('critical') ||
        lowercased.includes('bug')) {
      return 'high';
    }
    
    if (lowercased.includes('performance') ||
        lowercased.includes('error') ||
        lowercased.includes('fix')) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Generate review summary
   */
  async generateReviewSummary(reviews) {
    const prompt = `Generate an executive summary of these code reviews:
    
Reviews:
${JSON.stringify(reviews, null, 2)}

Include:
1. Overall code quality assessment
2. Key findings and issues
3. Priority recommendations
4. Risk assessment
5. Next steps

Format as a concise executive summary.`;
    
    const summary = await this.askClaude(prompt);
    return summary;
  }
}

module.exports = ReviewerAgent;
import { SmartSuggestionEngine } from './suggestions';
import { ProjectValidator } from './projectValidation';
import { PROJECT_TEMPLATES } from '../data/projectTemplates';
import { TECH_STACK_PRESETS } from '../data/techStackData';
import { PageContext } from './pageContextAnalyzer';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: any[];
}

export interface AssistantContext {
  projectType?: string;
  techStack: string[];
  currentStep: string;
  experience: 'beginner' | 'intermediate' | 'advanced';
  currentPage?: string;
  pageType?: string;
  projectId?: string | null;
}

export class ProjectAssistant {
  private suggestionEngine: SmartSuggestionEngine;
  private validator: ProjectValidator;
  private context: AssistantContext;
  private messageHistory: AssistantMessage[];

  constructor() {
    this.suggestionEngine = new SmartSuggestionEngine();
    this.validator = new ProjectValidator();
    this.context = {
      techStack: [],
      currentStep: 'start',
      experience: 'beginner'
    };
    this.messageHistory = [];
  }

  /**
   * Process user message and generate response
   */
  async processMessage(message: string, pageContext?: PageContext): Promise<AssistantMessage> {
    const userMessage: AssistantMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.messageHistory.push(userMessage);

    try {
      // Try to use the real Claude backend first
      const response = await this.callAssistantAPI(message, pageContext);
      
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions
      };
      this.messageHistory.push(assistantMessage);
      return assistantMessage;
      
    } catch (error) {
      console.warn('Failed to call assistant API, using fallback:', error);
      
      // Fall back to local generation
      const response = await this.generateResponse(message, pageContext);
      
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions
      };
      this.messageHistory.push(assistantMessage);
      return assistantMessage;
    }
  }

  /**
   * Call the backend assistant API
   */
  private async callAssistantAPI(message: string, pageContext?: PageContext): Promise<{
    content: string;
    suggestions?: any[];
  }> {
    const response = await fetch('http://localhost:3001/api/assistant/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context: this.context,
        pageContext
      })
    });

    if (!response.ok) {
      throw new Error(`Assistant API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract suggestions from the response if present
    const suggestions = this.extractSuggestionsFromResponse(data.content, pageContext);
    
    return {
      content: data.content,
      suggestions
    };
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestionsFromResponse(content: string, pageContext?: PageContext): any[] {
    const suggestions: any[] = [];
    
    // Page-specific suggestions
    if (pageContext) {
      switch (pageContext.pageType) {
        case 'agentMonitor':
          if (content.toLowerCase().includes('restart') || content.toLowerCase().includes('stuck')) {
            suggestions.push({ label: 'Restart all agents', action: 'restart_agents' });
          }
          if (content.toLowerCase().includes('log') || content.toLowerCase().includes('debug')) {
            suggestions.push({ label: 'View agent logs', action: 'view_logs' });
          }
          break;

        case 'workQueue':
          if (content.toLowerCase().includes('priorit')) {
            suggestions.push({ label: 'Auto-prioritize tasks', action: 'prioritize' });
          }
          if (content.toLowerCase().includes('block')) {
            suggestions.push({ label: 'Show blockers', action: 'show_blockers' });
          }
          break;

        case 'testResults':
          if (content.toLowerCase().includes('fail') || content.toLowerCase().includes('fix')) {
            suggestions.push({ label: 'Debug failures', action: 'debug_tests' });
          }
          if (content.toLowerCase().includes('coverage')) {
            suggestions.push({ label: 'Coverage report', action: 'coverage_report' });
          }
          break;

        default:
          // Generic suggestions
          if (content.toLowerCase().includes('template')) {
            suggestions.push({ label: 'View templates', action: 'show_templates' });
          }
          if (content.toLowerCase().includes('tech') || content.toLowerCase().includes('stack')) {
            suggestions.push({ label: 'Explore tech stack', action: 'tech_stack' });
          }
          if (content.toLowerCase().includes('test')) {
            suggestions.push({ label: 'Configure testing', action: 'testing' });
          }
      }
    }
    
    return suggestions;
  }

  /**
   * Generate response based on user input
   */
  private async generateResponse(message: string, pageContext?: PageContext): Promise<{
    content: string;
    suggestions?: any[];
  }> {
    const lower = message.toLowerCase();

    // Page-specific responses
    if (pageContext) {
      const pageResponse = this.getPageSpecificResponse(message, pageContext);
      if (pageResponse) return pageResponse;
    }

    // Handle common questions
    if (lower.includes('help') || lower.includes('what')) {
      return this.getHelpResponse(pageContext);
    }

    if (lower.includes('suggest') || lower.includes('recommend')) {
      return this.getSuggestionResponse();
    }

    if (lower.includes('template')) {
      return this.getTemplateResponse();
    }

    if (lower.includes('tech') || lower.includes('stack')) {
      return this.getTechStackResponse();
    }

    if (lower.includes('test')) {
      return this.getTestingResponse();
    }

    if (lower.includes('architecture') || lower.includes('structure')) {
      return this.getArchitectureResponse();
    }

    // Analyze requirements if it's a description
    if (message.length > 50) {
      return this.analyzeRequirementsResponse(message);
    }

    // Default response
    return {
      content: `I'm here to help you with ${pageContext?.pageName || 'your project'}! Ask me anything about the current page, or I can help with general development questions.`
    };
  }

  /**
   * Get page-specific response
   */
  private getPageSpecificResponse(message: string, pageContext: PageContext): { content: string; suggestions?: any[] } | null {
    const lower = message.toLowerCase();
    
    switch (pageContext.pageType) {
      case 'agentMonitor':
        if (lower.includes('stuck') || lower.includes('not running')) {
          return {
            content: `I see you're having issues with agents. Here's what to check:\n\n1. **Agent Status**: ${pageContext.pageData.runningAgents || 0} of ${pageContext.pageData.agentCount || 0} agents are running\n2. **Common Issues**:\n   - Check if the Claude CLI is accessible\n   - Verify project configuration\n   - Look for error messages in logs\n3. **Quick Fix**: Try restarting the stuck agent or use the "Reset Agent" feature\n\nWould you like me to help debug a specific agent?`,
            suggestions: [
              { label: 'Check logs', action: 'view_logs' },
              { label: 'Restart agents', action: 'restart_agents' },
            ]
          };
        }
        break;

      case 'workQueue':
        if (lower.includes('priorit') || lower.includes('order')) {
          return {
            content: `For task prioritization, consider:\n\n**Current Status**:\n- ${pageContext.pageData.pendingTasks || 0} pending tasks\n- ${pageContext.pageData.inProgressTasks || 0} in progress\n- ${pageContext.pageData.blockedTasks || 0} blocked\n\n**Prioritization Strategy**:\n1. Clear blockers first\n2. Focus on critical/high priority items\n3. Balance workload across agents\n4. Consider task dependencies\n\nDrag and drop tasks between columns to reorganize them.`,
            suggestions: [
              { label: 'Show critical tasks', action: 'filter_critical' },
              { label: 'Clear blockers', action: 'clear_blockers' },
            ]
          };
        }
        break;

      case 'testResults':
        if (lower.includes('fail') || lower.includes('error')) {
          const coverage = pageContext.pageData.coverage || 0;
          return {
            content: `Test Analysis:\n\n**Current Results**:\n- Passing: ${pageContext.pageData.passingTests || 0}\n- Failing: ${pageContext.pageData.failingTests || 0}\n- Coverage: ${coverage}%\n\n**Common failure causes**:\n- Environment differences\n- Missing dependencies\n- Timing issues in async tests\n- Incorrect mocks\n\nClick on failing tests to see detailed error messages.`,
            suggestions: [
              { label: 'Re-run tests', action: 'rerun_tests' },
              { label: 'View failure details', action: 'view_failures' },
            ]
          };
        }
        break;

      case 'analytics':
        if (lower.includes('metric') || lower.includes('trend')) {
          return {
            content: `Here's what your metrics show:\n\n${Object.entries(pageContext.metrics || {}).slice(0, 5).map(([key, value]) => 
              `- **${key}**: ${value}${key.includes('percent') || key.includes('coverage') ? '%' : ''}`
            ).join('\n')}\n\n**Insights**:\n- Look for patterns in the data\n- Compare with previous periods\n- Identify bottlenecks\n- Set improvement targets`,
            suggestions: [
              { label: 'Export data', action: 'export_metrics' },
              { label: 'Show trends', action: 'view_trends' },
            ]
          };
        }
        break;
    }

    return null;
  }

  /**
   * Get help response
   */
  private getHelpResponse(pageContext?: PageContext): { content: string; suggestions?: any[] } {
    const helpText = `I'm here to help you create your project! Here's what I can assist with:

🎯 **Project Templates**: Choose from pre-configured templates for common project types
🛠️ **Tech Stack**: Get recommendations for technologies that work well together
🏗️ **Architecture**: Design patterns and project structure suggestions
🧪 **Testing**: Testing framework recommendations and coverage targets
📋 **Goals**: Help defining clear project objectives

**Quick tips:**
- Start by selecting a project type to get tailored suggestions
- Use templates for faster setup with best practices included
- I can analyze your requirements if you describe what you want to build

What would you like to know more about?`;

    return {
      content: helpText,
      suggestions: [
        { label: 'Show templates', action: 'show_templates' },
        { label: 'Recommend tech stack', action: 'recommend_stack' },
        { label: 'Explain architecture patterns', action: 'explain_architecture' }
      ]
    };
  }

  /**
   * Get suggestion response based on context
   */
  private getSuggestionResponse(): { content: string; suggestions?: any[] } {
    const suggestions = this.suggestionEngine.getContextualSuggestions({
      projectType: this.context.projectType,
      techStack: this.context.techStack,
      experience: this.context.experience
    });

    if (suggestions.length === 0) {
      return {
        content: "Tell me more about your project so I can provide better suggestions. What type of application are you building?"
      };
    }

    const content = `Based on your project, here are my top recommendations:\n\n${
      suggestions.slice(0, 3).map((s, i) => 
        `${i + 1}. **${s.title}**\n   ${s.description}`
      ).join('\n\n')
    }`;

    return {
      content,
      suggestions: suggestions.slice(0, 3)
    };
  }

  /**
   * Get template recommendations
   */
  private getTemplateResponse(): { content: string; suggestions?: any[] } {
    const templates = this.context.projectType
      ? Object.values(PROJECT_TEMPLATES).filter(t => t.category === this.context.projectType)
      : Object.values(PROJECT_TEMPLATES).slice(0, 5);

    const content = `Here are recommended templates for your project:\n\n${
      templates.slice(0, 3).map(t => 
        `**${t.name}** ${t.icon}\n${t.description}\n- Stack: ${t.techStack.slice(0, 4).join(', ')}\n- Setup time: ${t.setupTime}`
      ).join('\n\n')
    }\n\nWould you like to use one of these templates?`;

    return {
      content,
      suggestions: templates.slice(0, 3).map(t => ({
        label: `Use ${t.name}`,
        template: t.id
      }))
    };
  }

  /**
   * Get tech stack recommendations
   */
  private getTechStackResponse(): { content: string; suggestions?: any[] } {
    if (!this.context.projectType) {
      return {
        content: "What type of project are you building? This will help me recommend the best tech stack for your needs."
      };
    }

    const suggested = this.suggestionEngine.suggestTechStack(
      this.context.projectType,
      { experience: this.context.experience }
    );

    const presets = Object.values(TECH_STACK_PRESETS)
      .filter(p => p.useCase.toLowerCase().includes(this.context.projectType || 'web'))
      .slice(0, 2);

    const content = `For a ${this.context.projectType} project, I recommend:\n\n**Core Technologies:**\n${
      suggested.slice(0, 6).map(t => `- ${t}`).join('\n')
    }\n\n**Popular Presets:**\n${
      presets.map(p => `- **${p.name}**: ${p.description}`).join('\n')
    }\n\nThese technologies work well together and have strong community support.`;

    return {
      content,
      suggestions: [
        { label: 'Use suggested stack', stack: suggested },
        ...presets.map(p => ({ label: `Use ${p.name}`, stack: p.stack }))
      ]
    };
  }

  /**
   * Get testing recommendations
   */
  private getTestingResponse(): { content: string } {
    const framework = this.suggestionEngine.suggestTestFramework(this.context.techStack);
    
    const content = `For testing your project, I recommend:\n\n**Framework:** ${framework}\n\n**Best Practices:**\n- Set coverage target between 70-85%\n- Write tests as you develop (TDD)\n- Include unit, integration, and e2e tests\n- Use mocking for external dependencies\n\n**Testing Structure:**\n- Unit tests for business logic\n- Integration tests for API endpoints\n- E2E tests for critical user flows\n- Performance tests for bottlenecks\n\nWould you like help setting up your testing strategy?`;

    return { content };
  }

  /**
   * Get architecture recommendations
   */
  private getArchitectureResponse(): { content: string } {
    const size = this.context.techStack.length > 8 ? 'large' : 
                 this.context.techStack.length > 4 ? 'medium' : 'small';
    
    const architecture = this.suggestionEngine.suggestArchitecture(
      this.context.projectType || 'web',
      size,
      this.context.techStack
    );

    const content = `For your project, I recommend a **${architecture.type}** architecture.\n\n**Rationale:** ${architecture.rationale}\n\n**Key Components:**\n${
      architecture.components.map(c => `- ${c}`).join('\n')
    }\n\n**Benefits:**\n- Clear separation of concerns\n- Easy to test and maintain\n- Scalable as your project grows\n- Well-established patterns\n\nThis structure will help keep your code organized and maintainable.`;

    return { content };
  }

  /**
   * Analyze requirements and provide suggestions
   */
  private analyzeRequirementsResponse(description: string): { content: string; suggestions?: any[] } {
    const analysis = this.suggestionEngine.analyzeRequirements(description);
    
    this.context.projectType = analysis.suggestedType;
    this.context.techStack = analysis.suggestedStack;

    const content = `Based on your description, here's what I understand:\n\n**Project Type:** ${
      analysis.suggestedType.charAt(0).toUpperCase() + analysis.suggestedType.slice(1)
    } Application\n\n**Suggested Technologies:**\n${
      analysis.suggestedStack.map(t => `- ${t}`).join('\n')
    }\n\n**Key Features Detected:**\n${
      analysis.suggestedFeatures.map(f => `- ${f}`).join('\n')
    }\n\n*Confidence: ${analysis.confidence}%*\n\nIs this correct? I can help you refine these choices or suggest alternatives.`;

    return {
      content,
      suggestions: [
        { label: 'Looks good!', action: 'confirm' },
        { label: 'Adjust tech stack', action: 'adjust_stack' },
        { label: 'Change project type', action: 'change_type' }
      ]
    };
  }

  /**
   * Get explanation for a specific technology
   */
  async explainTechnology(tech: string): Promise<string> {
    const explanations: Record<string, string> = {
      'React': 'React is a JavaScript library for building user interfaces. It uses a component-based architecture and virtual DOM for efficient updates. Great for interactive UIs.',
      'TypeScript': 'TypeScript adds static typing to JavaScript, catching errors at compile time. It improves code quality, IDE support, and makes refactoring safer.',
      'Node.js': 'Node.js lets you run JavaScript on the server. It\'s fast, scalable, and has a huge ecosystem of packages through npm.',
      'Docker': 'Docker packages your application in containers, ensuring it runs the same everywhere. Essential for modern deployment and microservices.',
      'PostgreSQL': 'PostgreSQL is a powerful, open-source relational database. It offers advanced features like JSON support, full-text search, and strong consistency.',
      'MongoDB': 'MongoDB is a NoSQL database that stores data in flexible, JSON-like documents. Great for applications with evolving schemas.',
      'Redis': 'Redis is an in-memory data store used for caching, session storage, and real-time features. It\'s incredibly fast and supports various data structures.',
      'GraphQL': 'GraphQL is a query language for APIs that lets clients request exactly what data they need. It reduces over-fetching and under-fetching.',
      'Socket.io': 'Socket.io enables real-time, bidirectional communication between browsers and servers. Perfect for chat apps, live updates, and collaborative features.',
      'Jest': 'Jest is a testing framework with built-in mocking, code coverage, and snapshot testing. It works great with React and TypeScript.'
    };

    return explanations[tech] || `${tech} is a technology used in modern web development. It's part of your selected tech stack.`;
  }

  /**
   * Update context based on user selections
   */
  updateContext(updates: Partial<AssistantContext>) {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get current context
   */
  getContext(): AssistantContext {
    return this.context;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messageHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): AssistantMessage[] {
    return this.messageHistory;
  }
}
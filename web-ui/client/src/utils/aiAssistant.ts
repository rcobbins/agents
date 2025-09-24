import { SmartSuggestionEngine } from './suggestions';
import { ProjectValidator } from './projectValidation';
import { PROJECT_TEMPLATES } from '../data/projectTemplates';
import { TECH_STACK_PRESETS } from '../data/techStackData';

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
  async processMessage(message: string): Promise<AssistantMessage> {
    const userMessage: AssistantMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.messageHistory.push(userMessage);

    try {
      // Try to use the real Claude backend first
      const response = await this.callAssistantAPI(message);
      
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
      const response = await this.generateResponse(message);
      
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
  private async callAssistantAPI(message: string): Promise<{
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
        context: this.context
      })
    });

    if (!response.ok) {
      throw new Error(`Assistant API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract suggestions from the response if present
    const suggestions = this.extractSuggestionsFromResponse(data.content);
    
    return {
      content: data.content,
      suggestions
    };
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestionsFromResponse(content: string): any[] {
    const suggestions: any[] = [];
    
    // Look for common suggestion patterns in the response
    if (content.toLowerCase().includes('template')) {
      suggestions.push({ label: 'View templates', action: 'show_templates' });
    }
    if (content.toLowerCase().includes('tech') || content.toLowerCase().includes('stack')) {
      suggestions.push({ label: 'Explore tech stack', action: 'tech_stack' });
    }
    if (content.toLowerCase().includes('test')) {
      suggestions.push({ label: 'Configure testing', action: 'testing' });
    }
    
    return suggestions;
  }

  /**
   * Generate response based on user input
   */
  private async generateResponse(message: string): Promise<{
    content: string;
    suggestions?: any[];
  }> {
    const lower = message.toLowerCase();

    // Handle common questions
    if (lower.includes('help') || lower.includes('what')) {
      return this.getHelpResponse();
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
      content: "I can help you set up your project! Tell me what you're trying to build, or ask me about templates, tech stacks, or best practices."
    };
  }

  /**
   * Get help response
   */
  private getHelpResponse(): { content: string; suggestions?: any[] } {
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
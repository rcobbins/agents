const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const execAsync = promisify(exec);

class ClaudeAssistant {
  constructor(logger) {
    this.logger = logger || console;
    this.persistencePath = path.join(process.env.HOME, '.agent-framework', 'persistence', 'ui-assistant');
    this.sessionFile = path.join(this.persistencePath, 'session.state');
    this.initializeSession();
  }

  async initializeSession() {
    try {
      await fs.mkdir(this.persistencePath, { recursive: true });
    } catch (error) {
      this.logger.warn('Could not create persistence directory:', error);
    }
  }

  async getOrCreateSession() {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf8');
      const session = JSON.parse(data);
      
      if (session.session_exists) {
        this.logger.info(`Resuming session: ${session.uuid}`);
        return { type: 'resume', uuid: session.uuid };
      } else {
        this.logger.info(`Using new session: ${session.uuid}`);
        return { type: 'new', uuid: session.uuid };
      }
    } catch (error) {
      // Create new session
      const uuid = uuidv4();
      const session = {
        uuid,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        status: 'active',
        session_exists: false,
        agent: 'ui-assistant'
      };
      
      try {
        await fs.writeFile(this.sessionFile, JSON.stringify(session, null, 2));
        this.logger.info(`Created new session: ${uuid}`);
      } catch (writeError) {
        this.logger.warn('Could not save session file:', writeError);
      }
      
      return { type: 'new', uuid };
    }
  }

  async markSessionCreated(uuid) {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf8');
      const session = JSON.parse(data);
      session.session_exists = true;
      session.last_used = new Date().toISOString();
      await fs.writeFile(this.sessionFile, JSON.stringify(session, null, 2));
    } catch (error) {
      this.logger.warn('Could not update session status:', error);
    }
  }

  async resetSession() {
    const uuid = uuidv4();
    const session = {
      uuid,
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      status: 'active',
      session_exists: false,
      agent: 'ui-assistant'
    };
    
    try {
      await fs.writeFile(this.sessionFile, JSON.stringify(session, null, 2));
      this.logger.info(`Reset session to: ${uuid}`);
    } catch (error) {
      this.logger.warn('Could not reset session:', error);
    }
    
    return { type: 'new', uuid };
  }

  /**
   * Send a message to Claude CLI and get response
   * @param {string} message - User message
   * @param {Object} context - Project context (type, tech stack, etc.)
   * @returns {Promise<string>} Claude's response
   */
  async processMessage(message, context = {}) {
    try {
      // Get or create session
      const session = await this.getOrCreateSession();
      
      // Build system prompt based on context
      const systemPrompt = this.buildSystemPrompt(context);
      const escapedSystemPrompt = this.escapeShellArg(systemPrompt);
      const escapedMessage = this.escapeShellArg(message);
      
      // Get configured model for assistant  
      let modelToUse = null; // Don't specify model by default
      try {
        const configPath = path.join(process.env.HOME, '.agent-framework/config/model-configuration.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        if (config.assistant && config.assistant.model) {
          modelToUse = config.assistant.model;
        }
      } catch (error) {
        // Don't specify model if config not found
        modelToUse = null;
      }
      
      // Build command with session management and model specification
      const claudePath = path.join(process.env.HOME || '/home/rob', 'bin', 'claude');
      let command = `${claudePath} --print`;
      if (modelToUse) {
        command += ` --model ${modelToUse}`;
      }
      
      if (session.type === 'new') {
        command += ` --session-id ${session.uuid}`;
      } else {
        command += ` --resume ${session.uuid}`;
      }
      
      command += ` --append-system-prompt ${escapedSystemPrompt} ${escapedMessage}`;
      
      this.logger.info(`Sending to Claude CLI (${session.type} session ${session.uuid})`);
      this.logger.info(`Command: ${command.substring(0, 200)}...`);
      
      let result;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            timeout: 30000, // 30 second timeout
            env: {
              ...process.env,
              PATH: `${path.join(process.env.HOME || '/home/rob', 'bin')}:${process.env.PATH}`
            }
          });
          
          if (stderr && stderr.includes('session') && stderr.includes('exists')) {
            // Session already exists, retry with --resume
            if (session.type === 'new') {
              await this.markSessionCreated(session.uuid);
              command = `${claudePath} --print${modelToUse ? ` --model ${modelToUse}` : ''} --resume ${session.uuid} --append-system-prompt ${escapedSystemPrompt} ${escapedMessage}`;
              this.logger.info('Session exists, retrying with --resume');
              continue;
            }
          } else if (stderr && stderr.includes('session') && stderr.includes('not found')) {
            // Session not found, reset and try again
            const newSession = await this.resetSession();
            command = `${claudePath} --print${modelToUse ? ` --model ${modelToUse}` : ''} --session-id ${newSession.uuid} --append-system-prompt ${escapedSystemPrompt} ${escapedMessage}`;
            this.logger.info('Session not found, created new session');
            continue;
          }
          
          if (stderr) {
            this.logger.warn('Claude CLI stderr:', stderr);
          }
          
          // Success - mark session as created if it was new
          if (session.type === 'new') {
            await this.markSessionCreated(session.uuid);
          }
          
          result = stdout.trim() || this.getFallbackResponse(message);
          break;
          
        } catch (execError) {
          this.logger.error(`Claude CLI execution error on attempt ${attempts}:`, execError.message);
          if (attempts >= maxAttempts) {
            throw execError;
          }
          // Check if it's a session-related error
          const errorStr = execError.toString();
          if (errorStr.includes('session') || errorStr.includes('UUID')) {
            this.logger.warn(`Session error on attempt ${attempts}, retrying...`);
            continue;
          }
          throw execError;
        }
      }
      
      return result || this.getFallbackResponse(message);
      
    } catch (error) {
      this.logger.error('Claude CLI error:', error);
      return this.getFallbackResponse(message);
    }
  }

  /**
   * Build system prompt based on context
   */
  buildSystemPrompt(context) {
    let prompt = 'You are an AI assistant integrated into the Agent Framework project initialization wizard. ';
    prompt += 'Your role is to help developers set up new projects with appropriate technology stacks, architectures, and best practices. ';
    prompt += 'Be concise (2-3 paragraphs max), practical, and specific. ';
    prompt += 'Focus on modern development practices and production-ready configurations.\n\n';
    
    // Add context information
    if (context.projectType) {
      prompt += `The user is creating a ${context.projectType} project. `;
    }
    
    if (context.techStack && context.techStack.length > 0) {
      prompt += `Selected technologies: ${context.techStack.join(', ')}. `;
    }
    
    if (context.currentStep) {
      prompt += `Current step in wizard: ${context.currentStep}. `;
    }
    
    if (context.experience) {
      prompt += `User experience level: ${context.experience}. `;
      if (context.experience === 'beginner') {
        prompt += 'Provide extra explanations and avoid overly technical jargon. ';
      } else if (context.experience === 'advanced') {
        prompt += 'You can use technical terminology and suggest advanced patterns. ';
      }
    }
    
    prompt += '\nProvide actionable advice that helps them make informed decisions about their project setup.';
    
    return prompt;
  }

  /**
   * Build a context-aware prompt for Claude
   */
  buildPrompt(message, context) {
    let prompt = '';
    
    // Add context if available
    if (context.projectType || context.techStack || context.currentStep) {
      prompt += 'Context:\n';
      if (context.projectType) {
        prompt += `- Project Type: ${context.projectType}\n`;
      }
      if (context.techStack && context.techStack.length > 0) {
        prompt += `- Tech Stack: ${context.techStack.join(', ')}\n`;
      }
      if (context.currentStep) {
        prompt += `- Current Step: ${context.currentStep}\n`;
      }
      if (context.experience) {
        prompt += `- User Experience: ${context.experience}\n`;
      }
      prompt += '\n';
    }
    
    // Add role instruction
    prompt += 'You are an AI assistant helping with project initialization. ';
    prompt += 'Provide helpful, concise advice about project setup, technologies, and best practices. ';
    prompt += 'Keep responses brief (2-3 paragraphs max) and practical.\n\n';
    
    // Add user message
    prompt += `User Question: ${message}\n\n`;
    prompt += 'Assistant Response:';
    
    return prompt;
  }

  /**
   * Escape shell arguments to prevent injection
   */
  escapeShellArg(arg) {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Get fallback response when Claude is unavailable
   */
  getFallbackResponse(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('help')) {
      return 'I can help you set up your project! Tell me about what you\'re building, and I\'ll provide recommendations for technologies, architecture, and best practices.';
    }
    
    if (lower.includes('template')) {
      return 'Templates provide pre-configured project setups with best practices. Choose one that matches your project type to get started quickly with a solid foundation.';
    }
    
    if (lower.includes('tech') || lower.includes('stack')) {
      return 'For technology selection, consider your team\'s experience, project requirements, and long-term maintenance. Popular stacks like React + Node.js or Vue + FastAPI offer great community support.';
    }
    
    if (lower.includes('test')) {
      return 'A good testing strategy includes unit tests (70-80% coverage), integration tests for APIs, and E2E tests for critical user flows. Start with a framework like Jest or Pytest.';
    }
    
    if (lower.includes('architecture')) {
      return 'Choose an architecture that matches your project size. Start simple with a monolithic or layered architecture, then evolve to microservices if needed. Focus on clear separation of concerns.';
    }
    
    return 'I\'m here to help with your project setup. Ask me about templates, technologies, testing strategies, or architecture patterns!';
  }

  /**
   * Check if Claude CLI is available
   */
  async isAvailable() {
    try {
      const claudePath = path.join(process.env.HOME || '/home/rob', 'bin', 'claude');
      const { stdout } = await execAsync(`which ${claudePath}`, {
        env: {
          ...process.env,
          PATH: `${path.join(process.env.HOME || '/home/rob', 'bin')}:${process.env.PATH}`
        }
      });
      return !!stdout.trim();
    } catch {
      return false;
    }
  }
}

module.exports = ClaudeAssistant;
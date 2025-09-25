const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

const execFilePromise = promisify(execFile);

/**
 * ClaudeCliWrapper - Manages Claude CLI interactions with session persistence
 */
class ClaudeCliWrapper {
  constructor(agentName) {
    this.agentName = agentName;
    this.claudePath = '/home/rob/bin/claude';
    this.persistenceBase = path.join(process.env.HOME, '.agent-framework/persistence');
    this.sessionFile = path.join(this.persistenceBase, agentName, 'session.state');
    this.systemPrompts = this.getSystemPrompts();
  }
  
  /**
   * Get system prompts for each agent type
   */
  getSystemPrompts() {
    return {
      coordinator: `You are the Coordinator Agent in a multi-agent development framework. Your role is to:
- Orchestrate work between planner, coder, tester, and reviewer agents
- Analyze project requirements and create actionable task lists
- Track progress and ensure goals are met
- Distribute tasks based on agent capabilities
- Handle failures and reassign work as needed
Focus on practical task breakdown and efficient delegation.`,
      
      planner: `You are the Planner Agent responsible for:
- Breaking down high-level goals into concrete implementation steps
- Creating detailed technical specifications
- Identifying dependencies and prerequisites
- Estimating effort and complexity
- Suggesting optimal implementation approaches
Provide clear, actionable plans that other agents can execute.`,
      
      coder: `You are the Coder Agent focused on:
- Writing clean, maintainable code following best practices
- Implementing features according to specifications
- Fixing bugs and addressing test failures
- Refactoring code for better quality
- Following existing code patterns and conventions
Always write production-ready code with proper error handling.`,
      
      tester: `You are the Tester Agent dedicated to:
- Writing comprehensive test cases for all features
- Creating unit, integration, and end-to-end tests
- Executing test suites and reporting results
- Identifying edge cases and potential bugs
- Ensuring code coverage meets requirements
Focus on thorough testing and clear result reporting.`,
      
      reviewer: `You are the Reviewer Agent responsible for:
- Conducting thorough code reviews
- Ensuring code quality and maintainability
- Checking compliance with coding standards
- Identifying potential improvements
- Validating architecture decisions
Provide constructive feedback that improves code quality.`
    };
  }
  
  /**
   * Get or create session for Claude CLI
   */
  async getOrCreateSession() {
    try {
      // Ensure persistence directory exists
      await fs.mkdir(path.dirname(this.sessionFile), { recursive: true });
      
      // Check for existing session
      if (await this.fileExists(this.sessionFile)) {
        const sessionData = JSON.parse(await fs.readFile(this.sessionFile, 'utf8'));
        const { uuid, session_exists } = sessionData;
        
        // Check if session is still valid (less than 24 hours old)
        const lastUsed = new Date(sessionData.last_used || 0);
        const hoursSinceLastUse = (Date.now() - lastUsed) / (1000 * 60 * 60);
        
        if (session_exists && hoursSinceLastUse < 24) {
          return { type: 'resume', uuid };
        } else {
          // Session expired or doesn't exist
          return { type: 'new', uuid: uuid || this.generateUuid() };
        }
      } else {
        // Create new session
        const uuid = this.generateUuid();
        await this.saveSessionState(uuid, false);
        return { type: 'new', uuid };
      }
    } catch (error) {
      console.error(`Failed to get/create session: ${error.message}`);
      // Return new session on error
      return { type: 'new', uuid: this.generateUuid() };
    }
  }
  
  /**
   * Save session state to file
   */
  async saveSessionState(uuid, exists = false) {
    const sessionData = {
      uuid: uuid,
      session_exists: exists,
      created: new Date().toISOString(),
      last_used: new Date().toISOString(),
      agent: this.agentName
    };
    
    await fs.mkdir(path.dirname(this.sessionFile), { recursive: true });
    await fs.writeFile(this.sessionFile, JSON.stringify(sessionData, null, 2));
  }
  
  /**
   * Update session last used timestamp
   */
  async updateSessionLastUsed() {
    try {
      if (await this.fileExists(this.sessionFile)) {
        const sessionData = JSON.parse(await fs.readFile(this.sessionFile, 'utf8'));
        sessionData.last_used = new Date().toISOString();
        await fs.writeFile(this.sessionFile, JSON.stringify(sessionData, null, 2));
      }
    } catch (error) {
      console.error(`Failed to update session last used: ${error.message}`);
    }
  }
  
  /**
   * Ask Claude with proper session management and system prompts
   */
  async ask(userPrompt, options = {}) {
    try {
      const { 
        outputFormat = 'text',
        projectContext = '',
        timeout = 300000, // 5 minutes for large prompts
        retryOnError = true
      } = options;
      
      // Get session info
      const session = await this.getOrCreateSession();
      
      // Build system prompt with project context
      let systemPrompt = this.getSystemPromptWithContext(projectContext);
      
      const MAX_PROMPT_LENGTH = 10000; // Limit for command-line arguments
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      // Log prompt size for debugging
      if (fullPrompt.length > MAX_PROMPT_LENGTH) {
        await this.log(`Large prompt detected: ${fullPrompt.length} chars, using stdin piping with ${timeout/1000}s timeout`);
      }
      
      // Build command arguments
      const args = ['--print'];
      
      // Add session management
      if (session.type === 'resume') {
        args.push('--resume', session.uuid);
      } else {
        args.push('--session-id', session.uuid);
      }
      
      // Add output format if JSON requested
      if (outputFormat === 'json') {
        args.push('--output-format', 'json');
      }
      
      // Execute Claude CLI
      let result;
      try {
        // Handle large prompts using stdin piping
        if (fullPrompt.length > MAX_PROMPT_LENGTH) {
          // Use spawn for stdin piping
          result = await new Promise((resolve, reject) => {
            const child = spawn(this.claudePath, args, {
              env: {
                ...process.env,
                PATH: `/home/rob/bin:${process.env.PATH}`
              }
            });
            
            let stdout = '';
            let stderr = '';
            
            // Collect output
            child.stdout.on('data', (data) => {
              stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            // Handle completion
            child.on('close', (code) => {
              if (code === 0) {
                resolve({ stdout, stderr });
              } else {
                const error = new Error(`Command failed: ${this.claudePath} ${args.join(' ')}\n${stderr}`);
                error.code = code;
                reject(error);
              }
            });
            
            // Handle errors
            child.on('error', reject);
            
            // Write the full prompt to stdin
            child.stdin.write(fullPrompt);
            child.stdin.end();
            
            // Set timeout
            if (timeout) {
              setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error('Process timeout'));
              }, timeout);
            }
          });
        } else {
          // For smaller prompts, use the regular approach
          if (systemPrompt) {
            args.push('--append-system-prompt', systemPrompt);
          }
          args.push(userPrompt);
          
          result = await execFilePromise(this.claudePath, args, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            timeout: timeout,
            env: {
              ...process.env,
              PATH: `/home/rob/bin:${process.env.PATH}`
            }
          });
        }
        
        // Update session state on successful call
        if (session.type === 'new') {
          await this.saveSessionState(session.uuid, true);
        }
        await this.updateSessionLastUsed();
        
      } catch (error) {
        console.error(`Claude CLI error: ${error.message}`);
        
        // Log more details for debugging
        if (error.code === 'E2BIG') {
          console.error('Command too long. This should not happen with stdin approach.');
        }
        
        // Handle "already in use" error by switching to resume
        if (error.message.includes('already in use') && session.type === 'new' && retryOnError) {
          console.log('Session already exists, switching to resume mode...');
          await this.saveSessionState(session.uuid, true); // Mark session as existing
          // Retry with resume
          return this.ask(userPrompt, { ...options, retryOnError: false });
        }
        
        // Retry with new session if it was a resume attempt that failed
        if (retryOnError && session.type === 'resume' && !error.message.includes('already in use')) {
          console.log('Resume failed, trying with new session...');
          // Generate new UUID for fresh session
          const newUuid = this.generateUuid();
          await this.saveSessionState(newUuid, false);
          return this.ask(userPrompt, { ...options, retryOnError: false });
        }
        
        throw error;
      }
      
      // Parse response if JSON format requested
      if (outputFormat === 'json') {
        try {
          return JSON.parse(result.stdout);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          return { error: 'Failed to parse response', raw: result.stdout };
        }
      }
      
      return result.stdout;
      
    } catch (error) {
      console.error(`Failed to ask Claude: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get system prompt with project context
   */
  getSystemPromptWithContext(projectContext) {
    const basePrompt = this.systemPrompts[this.agentName] || '';
    
    if (projectContext) {
      return `${basePrompt}

Project Context:
${projectContext}`;
    }
    
    return basePrompt;
  }
  
  /**
   * Ask Claude a simple question without session management (for quick queries)
   */
  async askSimple(prompt) {
    try {
      const result = await execFilePromise(this.claudePath, ['--print', prompt], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });
      
      return result.stdout;
    } catch (error) {
      console.error(`Simple Claude query failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a new session explicitly
   */
  async createSession() {
    const uuid = this.generateUuid();
    await this.saveSessionState(uuid, false);
    return uuid;
  }
  
  /**
   * Clear current session
   */
  async clearSession() {
    try {
      if (await this.fileExists(this.sessionFile)) {
        await fs.unlink(this.sessionFile);
        console.log(`Session cleared for ${this.agentName}`);
      }
    } catch (error) {
      console.error(`Failed to clear session: ${error.message}`);
    }
  }
  
  /**
   * Validate if Claude CLI is available
   */
  async validateClaude() {
    try {
      const result = await execFilePromise(this.claudePath, ['--version'], {
        timeout: 5000
      });
      return result.stdout.includes('Claude');
    } catch (error) {
      console.error('Claude CLI not available:', error.message);
      return false;
    }
  }
  
  /**
   * Simple logging function
   */
  async log(message) {
    console.log(`[${this.agentName}] ${message}`);
  }
  
  /**
   * Utility functions
   */
  generateUuid() {
    // Use crypto.randomUUID if available (Node.js 14.17+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = ClaudeCliWrapper;
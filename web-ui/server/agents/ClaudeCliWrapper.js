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
    // Use Python wrapper to work around Node.js bug #771 (Python doesn't have the bug)
    this.claudePath = path.join(__dirname, 'claude-wrapper.py');
    this.claudeDirectPath = path.join(process.env.HOME || '/home/rob', 'bin', 'claude');
    this.persistenceBase = path.join(process.env.HOME || '/home/rob', '.agent-framework/persistence');
    this.sessionFile = path.join(this.persistenceBase, agentName, 'session.state');
    this.systemPrompts = this.getSystemPrompts();
  }
  
  /**
   * Write prompt to temporary file for very large prompts
   * @param {string} prompt - The prompt to write
   * @param {string} type - Type of prompt ('system' or 'user')
   * @returns {string} Path to the temporary file
   */
  async writeTempPrompt(prompt, type = 'prompt') {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `claude-${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`);
    
    try {
      await fs.writeFile(tempFile, prompt, 'utf8');
      await this.log(`Written ${type} prompt to temp file: ${tempFile} (${prompt.length} chars)`);
      return tempFile;
    } catch (error) {
      console.error(`Failed to write temp file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Clean up temporary file
   * @param {string} filePath - Path to the temporary file
   */
  async cleanupTempFile(filePath) {
    try {
      if (filePath && filePath.startsWith(os.tmpdir())) {
        await fs.unlink(filePath);
        await this.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      // Non-critical error, just log it
      console.error(`Failed to cleanup temp file ${filePath}: ${error.message}`);
    }
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
Provide constructive feedback that improves code quality.`,
      
      'task-customizer': `You generate 15-20 specific development tasks for projects. Distribute across planner, coder, tester, reviewer agents. Use exact technology names. Return JSON array only.`
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
   * Get the appropriate model for each agent
   */
  async getModelForAgent() {
    // Try to load saved model configuration first
    try {
      const configPath = path.join(process.env.HOME, '.agent-framework/config/model-configuration.json');
      if (await this.fileExists(configPath)) {
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        if (config[this.agentName] && config[this.agentName].model) {
          const preferredModel = config[this.agentName].model;
          
          // Special handling for coordinator to try sonnet[1m] first
          if (this.agentName === 'coordinator' && preferredModel === 'sonnet') {
            const isAvailable = await this.testModel('sonnet[1m]');
            if (isAvailable) {
              return 'sonnet[1m]';
            }
          }
          
          return preferredModel;
        }
      }
    } catch (error) {
      await this.log(`Could not load model configuration: ${error.message}`);
    }
    
    // Fallback to default models if config not found
    const defaultModels = {
      coordinator: 'sonnet', // Try sonnet[1m] first via detectAvailableModel if needed
      planner: 'sonnet',
      coder: 'sonnet',
      tester: 'sonnet',
      reviewer: 'sonnet'
    };
    
    const agentModel = defaultModels[this.agentName] || 'sonnet';
    
    // Special handling for coordinator to try sonnet[1m] first
    if (this.agentName === 'coordinator') {
      const isAvailable = await this.testModel('sonnet[1m]');
      if (isAvailable) {
        return 'sonnet[1m]';
      }
    }
    
    return agentModel;
  }
  
  /**
   * Test if a specific model is available
   */
  async testModel(model) {
    try {
      // Use shell wrapper with short timeout for testing
      const { stdout } = await execFilePromise(
        this.claudePath,
        ['--print', '--model', model, '--timeout', '5', 'echo test'],
        {
          timeout: 10000,
          env: { ...process.env, PATH: `/home/rob/bin:${process.env.PATH}` }
        }
      );
      return stdout.includes('test');
    } catch (error) {
      await this.log(`Model ${model} not available: ${error.message}`);
      return false;
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
        timeout = 600000, // 10 minutes default for Claude with ultrathink
        retryOnError = true,
        onStreamChunk = null // Callback for streaming stdout chunks
      } = options;
      
      // Get session info
      const session = await this.getOrCreateSession();
      
      // Build system prompt with project context
      let systemPrompt = this.getSystemPromptWithContext(projectContext);
      
      const MAX_PROMPT_LENGTH = 5000; // Lower threshold to avoid command line overflow
      const systemPromptLength = systemPrompt ? systemPrompt.length : 0;
      const userPromptLength = userPrompt ? userPrompt.length : 0;
      const totalPromptLength = systemPromptLength + userPromptLength;
      
      // Always log prompt sizes for debugging
      await this.log(`Prompt sizes: system=${systemPromptLength} user=${userPromptLength} total=${totalPromptLength} chars`);
      
      // Debug log actual prompts (first 100 chars)
      await this.log(`System prompt preview: ${systemPrompt ? systemPrompt.substring(0, 100) + '...' : 'null'}`);
      await this.log(`User prompt preview: ${userPrompt ? userPrompt.substring(0, 100) + '...' : 'null'}`);
      
      // Always use stdin for user prompts to avoid command line parsing issues
      // Only pass system prompt as argument (it's typically shorter and more controlled)
      await this.log(`Using Python wrapper with stdin for user prompt`);
      
      // Get the appropriate model for this agent
      const model = await this.getModelForAgent();
      
      // Build command arguments
      const args = ['--print', '--model', model];
      
      // Add timeout for the shell wrapper
      args.push('--timeout', Math.floor(timeout / 1000).toString());
      
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
      let tempSystemFile = null;
      
      try {
        // Always use stdin for user prompts
        // Handle system prompt - pass as argument
        if (systemPrompt) {
          // For very large system prompts, use temporary file
          if (systemPromptLength > 5000) {
            tempSystemFile = await this.writeTempPrompt(systemPrompt, 'system');
            // Read the file content and pass it as arg
            const tempContent = await fs.readFile(tempSystemFile, 'utf8');
            args.push('--append-system-prompt', tempContent);
            await this.log(`Using temp file for large system prompt (${systemPromptLength} chars)`);
          } else {
            // Pass system prompt directly - no quotes needed with spawn
            args.push('--append-system-prompt', systemPrompt);
            await this.log(`Added system prompt to args (${systemPromptLength} chars)`);
          }
        }
        
        // Use spawn to call Python wrapper - it handles stdin properly
        result = await new Promise((resolve, reject) => {
          const child = spawn(this.claudePath, args, {
            env: {
              ...process.env,
              PATH: `/home/rob/bin:${process.env.PATH}`
            }
          });
            
            let stdout = '';
            let stderr = '';
            
            // Collect output and stream if callback provided
            child.stdout.on('data', (data) => {
              const chunk = data.toString();
              stdout += chunk;
              
              // Stream the chunk in real-time if callback provided
              if (onStreamChunk) {
                onStreamChunk({
                  type: 'stdout',
                  content: chunk,
                  timestamp: new Date().toISOString()
                });
              }
            });
            
            child.stderr.on('data', (data) => {
              const chunk = data.toString();
              stderr += chunk;
              
              // Stream stderr too for complete visibility
              if (onStreamChunk) {
                onStreamChunk({
                  type: 'stderr',
                  content: chunk,
                  timestamp: new Date().toISOString()
                });
              }
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
            
            // Write ONLY the user prompt to stdin
            // The Python wrapper will read this from stdin
            child.stdin.write(userPrompt, 'utf8');
            child.stdin.end();
            
            // Set timeout with proper cleanup
            let timeoutId = null;
            if (timeout) {
              timeoutId = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Process timeout after ${timeout/1000} seconds`));
              }, timeout);
            }
            
            // Clear timeout on completion
            child.on('exit', () => {
              if (timeoutId) clearTimeout(timeoutId);
            });
          });
        // Always using stdin now, no else clause needed
        
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
      } finally {
        // Clean up temp file if it was created
        if (tempSystemFile) {
          await this.cleanupTempFile(tempSystemFile);
        }
      }
      
      // Parse response if JSON format requested
      if (outputFormat === 'json') {
        return this.ensureJsonResponse(result.stdout);
      }
      
      return result.stdout;
      
    } catch (error) {
      console.error(`Failed to ask Claude: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Ensure response is valid JSON
   */
  ensureJsonResponse(output) {
    if (!output) return '[]';
    
    // When using --output-format json, Claude returns a wrapper object
    // with the actual response in the .result field
    try {
      const wrapper = JSON.parse(output);
      if (wrapper.result) {
        // The result is usually a markdown code block containing JSON
        const result = wrapper.result;
        
        // Extract JSON from markdown code block if present
        const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            const parsed = JSON.parse(codeBlockMatch[1]);
            return JSON.stringify(parsed);
          } catch (e) {
            console.log('[ClaudeCliWrapper] Failed to parse JSON from code block');
          }
        }
        
        // Try to parse result directly if no code block
        try {
          const parsed = JSON.parse(result);
          return JSON.stringify(parsed);
        } catch (e) {
          // Result is not JSON, try to extract
          const extracted = this.extractJsonFromText(result);
          if (extracted) {
            return extracted;
          }
        }
      }
    } catch (e) {
      // Not the wrapper format, try direct parsing
      try {
        const parsed = JSON.parse(output);
        return JSON.stringify(parsed);
      } catch (e2) {
        // Not valid JSON, try to extract
      }
    }
    
    // Try to extract JSON from the response
    const extracted = this.extractJsonFromText(output);
    if (extracted) {
      return extracted;
    }
    
    // Log the failed extraction for debugging
    console.log(`[ClaudeCliWrapper] Failed to extract JSON from response, returning empty array`);
    
    // Return empty array as fallback
    return '[]';
  }
  
  /**
   * Extract JSON from text that may contain other content
   */
  extractJsonFromText(text) {
    if (!text) return null;
    
    // Strategy 1: Look for JSON array
    const arrayMatches = text.match(/\[[\s\S]*?\]/g);
    if (arrayMatches) {
      // Sort by length (longer matches are likely more complete)
      arrayMatches.sort((a, b) => b.length - a.length);
      
      for (const match of arrayMatches) {
        try {
          // Clean common issues
          let cleaned = match
            .replace(/^\s*```.*$/gm, '') // Remove markdown
            .replace(/,\s*}/g, '}')      // Remove trailing commas in objects
            .replace(/,\s*\]/g, ']')     // Remove trailing commas in arrays
            .replace(/'/g, '"')          // Replace single quotes with double
            .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
          
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return JSON.stringify(parsed);
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Strategy 2: Look for JSON object
    const objectMatches = text.match(/\{[\s\S]*?\}/g);
    if (objectMatches) {
      const objects = [];
      for (const match of objectMatches) {
        try {
          let cleaned = match
            .replace(/,\s*}/g, '}')
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":');
          
          const parsed = JSON.parse(cleaned);
          if (typeof parsed === 'object' && (parsed.id || parsed.description || parsed.task)) {
            objects.push(parsed);
          }
        } catch (e) {
          continue;
        }
      }
      
      if (objects.length > 0) {
        return JSON.stringify(objects);
      }
    }
    
    // Strategy 3: Extract from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (Array.isArray(parsed)) {
          return JSON.stringify(parsed);
        } else if (typeof parsed === 'object') {
          return JSON.stringify([parsed]);
        }
      } catch (e) {
        // Continue to next strategy
      }
    }
    
    // Strategy 4: Parse text lines as tasks (last resort)
    const lines = text.split('\n').filter(line => line.trim());
    const tasks = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for numbered lists or bullet points
      const match = line.match(/^(?:\d+[\.))]|[-*•])\s+(.+)/);
      if (match) {
        tasks.push({
          id: `extracted_${i + 1}`,
          description: match[1],
          assignedAgent: 'planner',
          priority: 'medium'
        });
      }
    }
    
    if (tasks.length > 0) {
      return JSON.stringify(tasks);
    }
    
    return null;
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
        timeout: 60000 // 1 minute for simple queries
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
      // Use direct path for validation
      const result = await execFilePromise(this.claudeDirectPath, ['--version'], {
        timeout: 5000
      });
      return result.stdout.includes('Claude') || result.stdout.includes('claude');
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
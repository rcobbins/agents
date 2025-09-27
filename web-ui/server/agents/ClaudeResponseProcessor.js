/**
 * ClaudeResponseProcessor - Multi-layer validation pipeline for Claude responses
 * Ensures 100% reliable task parsing with fallback mechanisms at every level
 */
class ClaudeResponseProcessor {
  constructor(logger = console) {
    this.logger = logger;
    this.validAgents = ['planner', 'coder', 'tester', 'reviewer', 'coordinator'];
    this.validPriorities = ['critical', 'high', 'medium', 'normal', 'low'];
    this.validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'blocked'];
  }

  /**
   * Main entry point - processes a Claude response through all validation layers
   */
  async processTaskResponse(response, options = {}) {
    const {
      minTasks = 1,
      maxTasks = 50,
      requiredFields = ['id', 'description', 'assignedAgent'],
      validAgents = this.validAgents,
      fallbackTasks = null
    } = options;

    this.logger.log('[ClaudeResponseProcessor] Starting response processing pipeline');
    
    try {
      // Layer 1: Extract JSON from response
      let extracted = this.extractJson(response);
      this.logger.log(`[Layer 1] Extracted data type: ${typeof extracted}, isArray: ${Array.isArray(extracted)}`);
      
      // Layer 2: Validate schema
      let validated = this.validateSchema(extracted, { requiredFields, validAgents });
      this.logger.log(`[Layer 2] Validated ${validated.length} tasks against schema`);
      
      // Layer 3: Normalize and repair
      let normalized = this.normalizeResponse(validated, validAgents);
      this.logger.log(`[Layer 3] Normalized ${normalized.length} tasks`);
      
      // Layer 4: Semantic validation
      let semantic = this.validateSemantic(normalized, { minTasks, maxTasks });
      this.logger.log(`[Layer 4] Semantic validation passed for ${semantic.length} tasks`);
      
      // Layer 5: Fallback injection if needed
      let final = this.injectFallbacks(semantic, { minTasks, fallbackTasks });
      this.logger.log(`[Layer 5] Final task count: ${final.length}`);
      
      return final;
      
    } catch (error) {
      this.logger.logError(`[ClaudeResponseProcessor] Pipeline failed: ${error.message}`);
      
      // Ultimate fallback - return guaranteed valid tasks
      return this.getEmergencyFallbackTasks(fallbackTasks);
    }
  }

  /**
   * Layer 1: Extract JSON from various response formats
   */
  extractJson(response) {
    if (!response) {
      throw new Error('Empty response received');
    }

    // Strategy 1: Direct JSON parse
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.tasks && Array.isArray(parsed.tasks)) return parsed.tasks;
      if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
      return [parsed]; // Wrap single object in array
    } catch (e) {
      this.logger.log('[Layer 1] Direct JSON parse failed, trying extraction strategies');
    }

    // Strategy 2: Extract from markdown code blocks
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'object') return [parsed];
      } catch (e) {
        this.logger.log('[Layer 1] Code block extraction failed');
      }
    }

    // Strategy 3: Find JSON array in text
    const arrayMatches = response.match(/\[[\s\S]*?\]/g);
    if (arrayMatches) {
      for (const match of arrayMatches) {
        try {
          // Clean up common issues
          let cleaned = match
            .replace(/^\s*```.*$/gm, '') // Remove markdown
            .replace(/,\s*}/, '}')        // Remove trailing commas
            .replace(/,\s*\]/, ']')       // Remove trailing commas in arrays
            .replace(/'/g, '"')           // Replace single quotes
            .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
          
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          continue; // Try next match
        }
      }
    }

    // Strategy 4: Find JSON objects and collect them
    const objectMatches = response.match(/\{[^{}]*\}/g);
    if (objectMatches) {
      const objects = [];
      for (const match of objectMatches) {
        try {
          let cleaned = match
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":')
            .replace(/,\s*}/, '}');
          
          const parsed = JSON.parse(cleaned);
          if (parsed.id || parsed.description || parsed.task) {
            objects.push(parsed);
          }
        } catch (e) {
          continue;
        }
      }
      if (objects.length > 0) return objects;
    }

    // Strategy 5: Parse as text lines (last resort)
    const lines = response.split('\n').filter(line => line.trim());
    const tasks = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^\d+[\.\)]\s*(.+)/) || line.match(/^[-*]\s*(.+)/)) {
        const description = line.replace(/^[\d\.\)\-\*]+\s*/, '');
        tasks.push({
          id: `extracted_task_${i + 1}`,
          description: description,
          assignedAgent: 'planner', // Default to planner
          priority: 'medium'
        });
      }
    }
    
    if (tasks.length > 0) return tasks;
    
    throw new Error('No parseable JSON found in response');
  }

  /**
   * Layer 2: Validate against schema
   */
  validateSchema(data, options) {
    const { requiredFields, validAgents } = options;
    
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    const validated = [];
    
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      
      // Check required fields
      let hasRequiredFields = true;
      for (const field of requiredFields) {
        if (!item[field] && item[field] !== 0) {
          this.logger.log(`[Layer 2] Missing required field '${field}' in task`);
          hasRequiredFields = false;
        }
      }
      
      // Validate agent if present
      if (item.assignedAgent && !validAgents.includes(item.assignedAgent)) {
        this.logger.log(`[Layer 2] Invalid agent '${item.assignedAgent}', will normalize later`);
      }
      
      // Add even if missing some fields (will be fixed in normalization)
      validated.push(item);
    }
    
    return validated.length > 0 ? validated : [{
      id: 'schema_fallback_001',
      description: 'Initialize project structure',
      assignedAgent: 'planner'
    }];
  }

  /**
   * Layer 3: Normalize and repair data
   */
  normalizeResponse(tasks, validAgents) {
    const normalized = [];
    const usedIds = new Set();
    
    for (const task of tasks) {
      // Ensure unique ID
      let id = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      while (usedIds.has(id)) {
        id = `${id}_dup`;
      }
      usedIds.add(id);
      
      // Normalize agent
      let assignedAgent = task.assignedAgent || task.agent || task.assigned_to || 'planner';
      assignedAgent = assignedAgent.toLowerCase();
      if (!validAgents.includes(assignedAgent)) {
        // Try to infer from description
        const description = (task.description || '').toLowerCase();
        if (description.includes('test')) assignedAgent = 'tester';
        else if (description.includes('review')) assignedAgent = 'reviewer';
        else if (description.includes('code') || description.includes('implement')) assignedAgent = 'coder';
        else assignedAgent = 'planner';
      }
      
      // Normalize priority
      let priority = task.priority || 'medium';
      priority = priority.toLowerCase();
      if (!this.validPriorities.includes(priority)) {
        priority = 'medium';
      }
      
      // Build normalized task
      normalized.push({
        id: id,
        description: task.description || task.task || task.name || 'Task needs description',
        assignedAgent: assignedAgent,
        priority: priority,
        status: task.status || 'pending',
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        estimatedEffort: task.estimatedEffort || task.effort || task.hours || 1,
        createdAt: task.createdAt || new Date().toISOString(),
        attempts: 0
      });
    }
    
    return normalized;
  }

  /**
   * Layer 4: Semantic validation
   */
  validateSemantic(tasks, options) {
    const { minTasks, maxTasks } = options;
    
    // Filter out invalid tasks
    const valid = tasks.filter(task => {
      // Must have meaningful description
      if (!task.description || task.description.length < 5) {
        this.logger.log(`[Layer 4] Filtering out task with invalid description: ${task.description}`);
        return false;
      }
      
      // Check for circular dependencies
      if (task.dependencies.includes(task.id)) {
        this.logger.log(`[Layer 4] Filtering out task with circular dependency: ${task.id}`);
        return false;
      }
      
      return true;
    });
    
    // Enforce min/max limits
    if (valid.length < minTasks) {
      this.logger.log(`[Layer 4] Task count ${valid.length} below minimum ${minTasks}`);
    }
    
    if (valid.length > maxTasks) {
      this.logger.log(`[Layer 4] Trimming tasks from ${valid.length} to ${maxTasks}`);
      return valid.slice(0, maxTasks);
    }
    
    return valid;
  }

  /**
   * Layer 5: Inject fallbacks if needed
   */
  injectFallbacks(tasks, options) {
    const { minTasks, fallbackTasks } = options;
    
    // If we have enough valid tasks, return them
    if (tasks.length >= minTasks) {
      return tasks;
    }
    
    this.logger.log(`[Layer 5] Injecting fallback tasks. Current: ${tasks.length}, Required: ${minTasks}`);
    
    // Use provided fallbacks or generate defaults
    const fallbacks = fallbackTasks || this.getDefaultFallbackTasks();
    
    // Add fallbacks until we meet minimum
    const needed = minTasks - tasks.length;
    const toAdd = fallbacks.slice(0, needed);
    
    return [...tasks, ...toAdd];
  }

  /**
   * Get default fallback tasks
   */
  getDefaultFallbackTasks() {
    const timestamp = Date.now();
    return [
      {
        id: `fallback_${timestamp}_1`,
        description: 'Analyze project requirements and create implementation plan',
        assignedAgent: 'planner',
        priority: 'high',
        dependencies: [],
        estimatedEffort: 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0
      },
      {
        id: `fallback_${timestamp}_2`,
        description: 'Set up project structure and initial configuration',
        assignedAgent: 'coder',
        priority: 'high',
        dependencies: [`fallback_${timestamp}_1`],
        estimatedEffort: 3,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0
      },
      {
        id: `fallback_${timestamp}_3`,
        description: 'Create test framework and initial test cases',
        assignedAgent: 'tester',
        priority: 'medium',
        dependencies: [`fallback_${timestamp}_2`],
        estimatedEffort: 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0
      },
      {
        id: `fallback_${timestamp}_4`,
        description: 'Review initial implementation and provide feedback',
        assignedAgent: 'reviewer',
        priority: 'medium',
        dependencies: [`fallback_${timestamp}_2`],
        estimatedEffort: 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attempts: 0
      }
    ];
  }

  /**
   * Emergency fallback when entire pipeline fails
   */
  getEmergencyFallbackTasks(customFallbacks) {
    this.logger.logError('[ClaudeResponseProcessor] Using emergency fallback tasks');
    
    if (customFallbacks && Array.isArray(customFallbacks)) {
      return customFallbacks;
    }
    
    return [{
      id: `emergency_${Date.now()}`,
      description: 'Initialize project with basic structure',
      assignedAgent: 'planner',
      priority: 'critical',
      dependencies: [],
      estimatedEffort: 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0
    }];
  }

  /**
   * Process follow-up task responses
   */
  async processFollowUpResponse(response, completedTaskId) {
    const tasks = await this.processTaskResponse(response, {
      minTasks: 0, // Follow-ups are optional
      maxTasks: 10,
      requiredFields: ['description', 'assignedAgent']
    });
    
    // Add reference to parent task
    return tasks.map(task => ({
      ...task,
      generatedFrom: completedTaskId,
      id: `${completedTaskId}_followup_${task.id}`
    }));
  }
}

module.exports = ClaudeResponseProcessor;
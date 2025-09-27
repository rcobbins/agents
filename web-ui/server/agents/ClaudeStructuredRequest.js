/**
 * ClaudeStructuredRequest - Formats Claude requests with strict JSON requirements
 * Ensures all prompts clearly specify expected response format
 */
class ClaudeStructuredRequest {
  constructor(logger = console) {
    this.logger = logger;
    this.requestTypes = [
      'analyzeProject',
      'generateTasks', 
      'followUpTasks',
      'planImplementation',
      'reviewCode',
      'createTests',
      'debugIssue',
      'customizeTasks'
    ];
  }

  /**
   * Build a structured request for Claude
   */
  buildRequest(type, context = {}) {
    if (!this.requestTypes.includes(type)) {
      this.logger.log(`Warning: Unknown request type: ${type}, using generic template`);
      return this.buildGenericRequest(context);
    }

    const method = `build${type.charAt(0).toUpperCase() + type.slice(1)}Request`;
    if (typeof this[method] === 'function') {
      return this[method](context);
    }

    return this.buildGenericRequest(context);
  }

  /**
   * Build request for initial project analysis
   */
  buildAnalyzeProjectRequest(context) {
    const { vision, spec, goals } = context;
    
    return `CRITICAL INSTRUCTIONS: You MUST respond with ONLY a valid JSON array. No explanations, no markdown, no additional text before or after the JSON.

Your response must start with [ and end with ]

TASK: Analyze this project and create an initial task list.

PROJECT DETAILS:
================
Vision: ${vision || 'Not provided'}

Specification: ${spec || 'Not provided'}

Goals: ${JSON.stringify(goals, null, 2) || 'Not provided'}

REQUIRED RESPONSE FORMAT:
=========================
[
  {
    "id": "task_001",
    "description": "Clear, actionable task description",
    "assignedAgent": "planner",
    "priority": "high",
    "dependencies": [],
    "estimatedEffort": 2
  },
  {
    "id": "task_002",
    "description": "Another clear task description",
    "assignedAgent": "coder",
    "priority": "medium",
    "dependencies": ["task_001"],
    "estimatedEffort": 3
  }
]

RULES:
======
1. Response MUST be valid JSON array only
2. Each task MUST have ALL fields shown above
3. assignedAgent MUST be one of: planner, coder, tester, reviewer
4. priority MUST be one of: critical, high, medium, low
5. dependencies must be an array (can be empty)
6. estimatedEffort must be a number (hours)
7. Create 3-10 practical, actionable tasks
8. Tasks should progress logically from planning to implementation to testing
9. DO NOT include any text outside the JSON array

Begin your response with [ and end with ]`;
  }

  /**
   * Build request for generating follow-up tasks
   */
  buildFollowUpTasksRequest(context) {
    const { completedTask, result, goals } = context;
    
    return `CRITICAL: Respond with ONLY a valid JSON array. No other text.

COMPLETED TASK:
==============
ID: ${completedTask.id}
Description: ${completedTask.description}
Agent: ${completedTask.assignedAgent}
Result: ${JSON.stringify(result, null, 2).substring(0, 1000)}

PROJECT GOALS:
=============
${JSON.stringify(goals?.slice(0, 3), null, 2)}

TASK: Based on the completed task above, identify any immediate follow-up tasks needed.

RESPONSE FORMAT (JSON array only):
==================================
[
  {
    "id": "followup_001",
    "description": "Specific follow-up task",
    "assignedAgent": "coder",
    "priority": "high",
    "dependencies": [],
    "estimatedEffort": 2
  }
]

RULES:
- If no follow-up needed, respond with empty array: []
- Each task must have all required fields
- assignedAgent must be: planner, coder, tester, or reviewer
- Only include tasks directly related to the completed work
- Maximum 5 follow-up tasks

Start with [ and end with ]`;
  }

  /**
   * Build request for implementation planning
   */
  buildPlanImplementationRequest(context) {
    const { feature, existingCode, constraints } = context;
    
    return `CRITICAL: Respond with ONLY a valid JSON array of implementation tasks.

FEATURE TO IMPLEMENT:
====================
${feature}

EXISTING CODE CONTEXT:
=====================
${existingCode ? existingCode.substring(0, 2000) : 'Starting fresh'}

CONSTRAINTS:
===========
${constraints || 'None specified'}

REQUIRED JSON FORMAT:
====================
[
  {
    "id": "impl_001",
    "description": "Specific implementation step",
    "assignedAgent": "coder",
    "priority": "high",
    "dependencies": [],
    "estimatedEffort": 1,
    "technicalDetails": "Brief technical approach"
  }
]

Create 3-8 specific implementation tasks.
Response must be valid JSON array only.`;
  }

  /**
   * Build request for code review
   */
  buildReviewCodeRequest(context) {
    const { code, standards, focus } = context;
    
    return `CRITICAL: Respond with ONLY a valid JSON array of review findings.

CODE TO REVIEW:
==============
${code ? code.substring(0, 5000) : 'No code provided'}

REVIEW FOCUS:
============
${focus || 'General quality, best practices, potential issues'}

STANDARDS:
=========
${standards || 'Industry best practices'}

REQUIRED JSON FORMAT:
====================
[
  {
    "id": "review_001",
    "type": "issue",
    "severity": "high",
    "description": "Description of the issue",
    "location": "file.js:line",
    "suggestion": "How to fix it"
  }
]

Properties:
- type: "issue", "improvement", "security", "performance"
- severity: "critical", "high", "medium", "low"

Return empty array [] if no issues found.`;
  }

  /**
   * Build request for test creation
   */
  buildCreateTestsRequest(context) {
    const { code, testFramework, coverage } = context;
    
    return `CRITICAL: Respond with ONLY a valid JSON array of test specifications.

CODE TO TEST:
============
${code ? code.substring(0, 3000) : 'No code provided'}

TEST FRAMEWORK:
==============
${testFramework || 'Choose appropriate framework'}

COVERAGE TARGET:
===============
${coverage || '80%'}

REQUIRED JSON FORMAT:
====================
[
  {
    "id": "test_001",
    "description": "What this test validates",
    "type": "unit",
    "priority": "high",
    "testCase": "Brief test scenario",
    "expectedResult": "Expected outcome"
  }
]

Properties:
- type: "unit", "integration", "e2e"
- priority: "critical", "high", "medium", "low"

Create 3-10 comprehensive test cases.`;
  }

  /**
   * Build request for debugging
   */
  buildDebugIssueRequest(context) {
    const { error, code, logs } = context;
    
    return `CRITICAL: Respond with ONLY a valid JSON array of debugging steps.

ERROR/ISSUE:
===========
${error}

RELEVANT CODE:
=============
${code ? code.substring(0, 3000) : 'Not provided'}

LOGS/CONTEXT:
============
${logs ? logs.substring(0, 2000) : 'Not provided'}

REQUIRED JSON FORMAT:
====================
[
  {
    "id": "debug_001",
    "description": "Specific debugging action",
    "assignedAgent": "coder",
    "priority": "critical",
    "approach": "How to investigate/fix",
    "estimatedEffort": 1
  }
]

Create 2-5 specific debugging tasks.
Response must be valid JSON array only.`;
  }

  /**
   * Build generic structured request
   */
  buildGenericRequest(context) {
    const { prompt, expectedFormat } = context;
    
    return `CRITICAL: You MUST respond with ONLY valid JSON. No other text.

REQUEST:
========
${prompt || 'Process the following information'}

REQUIRED FORMAT:
===============
${expectedFormat || `[
  {
    "id": "item_001",
    "description": "Description here",
    "type": "task",
    "priority": "medium"
  }
]`}

RULES:
- Response must be valid JSON only
- No explanations or additional text
- Start with [ or { based on expected format
- All fields shown in format are required`;
  }

  /**
   * Create a validation prompt to verify JSON response
   */
  createValidationPrompt(response) {
    return `Extract ONLY the JSON data from this response. Return it without any modifications or explanations:

${response}

If no valid JSON found, return: []`;
  }

  /**
   * Generate examples for better Claude understanding
   */
  generateExamples(type) {
    const examples = {
      analyzeProject: [
        {
          id: "task_001",
          description: "Analyze project structure and create detailed implementation plan",
          assignedAgent: "planner",
          priority: "high",
          dependencies: [],
          estimatedEffort: 2
        },
        {
          id: "task_002", 
          description: "Set up project scaffolding and base configuration",
          assignedAgent: "coder",
          priority: "high",
          dependencies: ["task_001"],
          estimatedEffort: 3
        }
      ],
      followUpTasks: [
        {
          id: "followup_001",
          description: "Implement error handling for API endpoints",
          assignedAgent: "coder",
          priority: "high",
          dependencies: [],
          estimatedEffort: 2
        }
      ]
    };

    return examples[type] || [];
  }

  /**
   * Build a prompt that enforces JSON-only responses
   */
  enforceJsonResponse(prompt) {
    return `${prompt}

FINAL REMINDER: Your ENTIRE response must be valid JSON only. Do not include any text before or after the JSON. Start with [ or { and end with ] or }`;
  }

  /**
   * Create prompt for task prioritization
   */
  buildPrioritizeTasksRequest(tasks) {
    return `CRITICAL: Return ONLY a JSON array of task IDs in priority order.

TASKS TO PRIORITIZE:
===================
${JSON.stringify(tasks, null, 2)}

RESPONSE FORMAT (array of IDs only):
====================================
["task_001", "task_003", "task_002", "task_004"]

Order from highest to lowest priority.
Consider dependencies when ordering.
Return ONLY the JSON array of IDs.`;
  }

  /**
   * Create prompt for status analysis
   */
  buildAnalyzeStatusRequest(context) {
    const { agentStatus, taskQueue, workLog } = context;
    
    return `CRITICAL: Return ONLY a JSON object with analysis results.

CURRENT STATUS:
==============
Agents: ${JSON.stringify(agentStatus, null, 2)}
Queue Length: ${taskQueue?.length || 0}
Completed Tasks: ${workLog?.length || 0}

REQUIRED RESPONSE FORMAT:
========================
{
  "blockers": ["List of current blockers"],
  "recommendations": ["List of recommended actions"],
  "nextSteps": ["Immediate next steps"],
  "healthScore": 85,
  "estimatedCompletion": "2 hours"
}

All fields required. Response must be valid JSON only.`;
  }

  /**
   * Build request for customizing project-specific tasks
   * Generates 15-20 highly specific tasks based on complete project context
   */
  buildCustomizeTasksRequest(context) {
    const { project, taskCount, requireAgentAssignment } = context;
    const minTasks = taskCount?.min || 15;
    const maxTasks = taskCount?.max || 20;
    
    // Build comprehensive project context
    const projectDetails = [];
    
    // Basic information
    projectDetails.push(`PROJECT: ${project.name}`);
    projectDetails.push(`TYPE: ${project.type || 'Web Application'}`);
    projectDetails.push(`DESCRIPTION: ${project.description || 'Not provided'}`);
    
    // Technology stack - CRITICAL for task customization
    if (project.techStack && project.techStack.length > 0) {
      projectDetails.push(`\nTECHNOLOGY STACK (use these specific technologies in tasks):`);
      project.techStack.forEach(tech => projectDetails.push(`- ${tech}`));
    }
    
    // Goals - tasks should directly support these
    if (project.goals && project.goals.length > 0) {
      projectDetails.push(`\nPROJECT GOALS (tasks must align with these):`);
      project.goals.forEach((goal, i) => {
        const desc = goal.description || goal.text || goal;
        const priority = goal.priority || 'medium';
        projectDetails.push(`${i + 1}. [${priority.toUpperCase()}] ${desc}`);
      });
    }
    
    // Architecture details
    if (project.architecture) {
      projectDetails.push(`\nARCHITECTURE:`);
      if (project.architecture.pattern) projectDetails.push(`- Pattern: ${project.architecture.pattern}`);
      if (project.architecture.database) projectDetails.push(`- Database: ${project.architecture.database}`);
      if (project.architecture.apiStyle) projectDetails.push(`- API Style: ${project.architecture.apiStyle}`);
      if (project.architecture.deployment) projectDetails.push(`- Deployment: ${project.architecture.deployment}`);
      if (project.architecture.authentication) projectDetails.push(`- Auth: ${project.architecture.authentication}`);
    }
    
    // Testing requirements
    if (project.testingStrategy) {
      projectDetails.push(`\nTESTING REQUIREMENTS:`);
      projectDetails.push(`- Coverage Target: ${project.testingStrategy.unitTestCoverage || 80}%`);
      if (project.testingStrategy.frameworks) {
        projectDetails.push(`- Test Frameworks: ${project.testingStrategy.frameworks.join(', ')}`);
      }
      projectDetails.push(`- Integration Testing: ${project.testingStrategy.integrationTesting ? 'Required' : 'Optional'}`);
      projectDetails.push(`- E2E Testing: ${project.testingStrategy.e2eTesting ? 'Required' : 'Optional'}`);
    }
    
    // Vision and features
    if (project.vision) {
      projectDetails.push(`\nPRODUCT VISION:`);
      if (project.vision.coreFeatures && project.vision.coreFeatures.length > 0) {
        projectDetails.push(`Core Features to implement:`);
        project.vision.coreFeatures.forEach(feature => projectDetails.push(`  - ${feature}`));
      }
      if (project.vision.targetAudience) {
        projectDetails.push(`Target Audience: ${project.vision.targetAudience}`);
      }
    }
    
    return `CRITICAL INSTRUCTIONS: Generate EXACTLY ${minTasks} to ${maxTasks} project-specific tasks. Response must be ONLY a valid JSON array.

${projectDetails.join('\n')}

TASK GENERATION REQUIREMENTS:
============================
1. Generate EXACTLY ${minTasks}-${maxTasks} tasks (not fewer, not more)
2. Each task MUST reference specific technologies from the tech stack above
3. Tasks must directly support the stated project goals
4. Include tasks for ALL phases: planning, implementation, testing, review
5. Each task must have a clear, actionable description
6. NO generic placeholders - be specific to THIS project

AGENT ASSIGNMENT RULES:
======================
Distribute tasks across agents as follows:
- planner: 3-4 tasks (architecture, design specs, technical planning)
- coder: 7-9 tasks (implementation, features, integrations)
- tester: 3-4 tasks (test creation, execution, coverage)
- reviewer: 2-3 tasks (code review, optimization, security)

Agent capabilities:
- planner: Creates technical specs, designs architecture, plans implementation
- coder: Writes code, implements features, fixes bugs, creates integrations
- tester: Writes tests, runs test suites, analyzes coverage
- reviewer: Reviews code quality, checks security, optimizes performance

REQUIRED JSON FORMAT (array of ${minTasks}-${maxTasks} tasks):
===============================================================
[
  {
    "id": "task_001",
    "description": "Design RESTful API architecture using Express.js with JWT authentication for user management endpoints",
    "assignedAgent": "planner",
    "priority": "critical",
    "dependencies": [],
    "estimatedEffort": 4,
    "category": "architecture",
    "technicalDetails": "Define /api/v1/users endpoints with OpenAPI spec, including auth middleware"
  },
  {
    "id": "task_002",
    "description": "Create PostgreSQL database schema with Prisma ORM for user profiles, posts, and comments tables",
    "assignedAgent": "planner",
    "priority": "critical",
    "dependencies": [],
    "estimatedEffort": 3,
    "category": "database",
    "technicalDetails": "Design normalized schema with foreign keys, indexes, and constraints"
  },
  {
    "id": "task_003",
    "description": "Implement Express.js server with middleware for CORS, body parsing, and request logging using Morgan",
    "assignedAgent": "coder",
    "priority": "critical",
    "dependencies": ["task_001"],
    "estimatedEffort": 3,
    "category": "backend",
    "technicalDetails": "Set up Express with TypeScript, configure middleware stack"
  }
  // ... continue with ${minTasks - 3} to ${maxTasks - 3} more SPECIFIC tasks
]

CRITICAL RULES:
==============
- Use ACTUAL technology names from the stack (not generic terms)
- Reference SPECIFIC features from the project goals
- Include REAL implementation details in descriptions
- Create LOGICAL dependency chains
- Ensure BALANCED distribution across agents
- Generate EXACTLY ${minTasks}-${maxTasks} tasks total

EXAMPLES OF GOOD vs BAD task descriptions:
GOOD: "Implement React component for user dashboard using Material-UI DataGrid to display transaction history"
BAD: "Create frontend component for data display"

GOOD: "Write Jest unit tests for Express.js authentication middleware with 90% coverage target"
BAD: "Create tests for backend"

GOOD: "Set up PostgreSQL database with Prisma migrations for user and product schemas"
BAD: "Configure database"

Response must be a valid JSON array starting with [ and ending with ]
Generate EXACTLY ${minTasks} to ${maxTasks} tasks. No more, no less.`;
  }
}

module.exports = ClaudeStructuredRequest;
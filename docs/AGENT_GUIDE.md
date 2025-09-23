# Agent Framework - Agent Guide

## Overview
This guide provides detailed information about each agent in the framework, their capabilities, interactions, and how to work with them effectively.

## The Five Core Agents

### 1. Coordinator Agent 🎯

#### Role
The orchestrator and task manager of the system.

#### Responsibilities
- **Task Distribution**: Assigns work to appropriate agents
- **Progress Tracking**: Monitors goal completion
- **Load Balancing**: Ensures efficient resource usage
- **Communication Hub**: Routes messages between agents
- **Reporting**: Generates status and progress reports

#### Key Files
- Script: `agents/coordinator.sh`
- Prompt: `agents/prompts/coordinator.md`
- Logs: `logs/coordinator*.log`

#### Configuration
```bash
# Coordinator-specific settings
TASK_PRIORITY_LEVELS=("critical" "high" "normal" "low")
TASK_TIMEOUT_MINUTES=60
PROGRESS_REPORT_INTERVAL=300  # 5 minutes
```

#### Interaction Patterns
```
User Goals → Coordinator → Task Queue
                ↓
         [Assigns to agents]
                ↓
    Planner / Coder / Tester / Reviewer
                ↓
         [Reports back]
                ↓
           Coordinator → Progress Update
```

### 2. Planner Agent 🧠

#### Role
The architect and strategist of the system.

#### Responsibilities
- **Code Analysis**: Understanding existing codebase
- **Planning**: Creating implementation strategies
- **Decomposition**: Breaking down complex tasks
- **Risk Assessment**: Identifying potential issues
- **Pattern Recognition**: Leveraging existing patterns

#### Key Files
- Script: `agents/planner.sh`
- Prompt: `agents/prompts/planner.md`
- Plans: `workspace/planner/plans/`

#### Output Format
```json
{
  "plan_id": "plan-001",
  "task": "Feature implementation",
  "steps": [
    {
      "order": 1,
      "action": "Create model",
      "location": "models/user.js",
      "estimated_minutes": 30
    }
  ],
  "risks": ["Database migration needed"],
  "dependencies": ["Database connection"]
}
```

### 3. Tester Agent 🔍

#### Role
The quality guardian and validator.

#### Responsibilities
- **Test Execution**: Running test suites
- **Test Creation**: Writing new tests
- **Coverage Monitoring**: Tracking test coverage
- **Failure Analysis**: Identifying root causes
- **Quality Metrics**: Reporting on code quality

#### Key Files
- Script: `agents/tester.sh`
- Prompt: `agents/prompts/tester.md`
- Results: `workspace/tester/test_results/`

#### Test Execution Flow
```bash
# 1. Run tests
npm test

# 2. Analyze results
parse_test_output()

# 3. Check coverage
npm test -- --coverage

# 4. Report findings
send_report_to_coordinator()
```

### 4. Coder Agent 💻

#### Role
The implementer and problem solver.

#### Responsibilities
- **Feature Implementation**: Writing new code
- **Bug Fixing**: Resolving issues
- **Refactoring**: Improving code quality
- **Documentation**: Adding code comments
- **Testing**: Writing unit tests

#### Key Files
- Script: `agents/coder.sh`
- Prompt: `agents/prompts/coder.md`
- Implementations: `workspace/coder/implementations/`

#### Code Quality Standards
- Clear naming conventions
- Proper error handling
- Comprehensive testing
- Documentation for complex logic
- Following project patterns

### 5. Reviewer Agent 📋

#### Role
The quality enforcer and knowledge sharer.

#### Responsibilities
- **Code Review**: Checking for issues
- **Standards Enforcement**: Ensuring consistency
- **Security Review**: Identifying vulnerabilities
- **Performance Analysis**: Finding bottlenecks
- **Knowledge Sharing**: Providing feedback

#### Key Files
- Script: `agents/reviewer.sh`
- Prompt: `agents/prompts/reviewer.md`
- Reviews: `workspace/reviewer/reviews/`

#### Review Severity Levels
- 🔴 **Critical**: Security vulnerabilities, data loss risks
- 🟡 **Major**: Bugs, performance issues
- 🟢 **Minor**: Style issues, documentation
- 💡 **Suggestion**: Improvements, alternatives

## Agent Communication

### Message Types

#### Task Assignment
```json
{
  "type": "task_assignment",
  "from": "coordinator",
  "to": "coder",
  "task": {
    "id": "task-001",
    "description": "Implement user authentication",
    "priority": "high",
    "deadline": "2 hours"
  }
}
```

#### Status Update
```json
{
  "type": "status_update",
  "from": "tester",
  "to": "coordinator",
  "status": "completed",
  "results": {
    "tests_passed": 45,
    "tests_failed": 2,
    "coverage": 85.3
  }
}
```

#### Help Request
```json
{
  "type": "help_request",
  "from": "coder",
  "to": "planner",
  "issue": "Unclear architecture for feature X",
  "context": "Need guidance on design pattern"
}
```

### Communication Flow

```
1. Coordinator broadcasts task
2. Agent acknowledges receipt
3. Agent works on task
4. Agent reports progress/completion
5. Coordinator updates tracking
6. Next task assigned
```

## Working with Agents

### Starting Agents

#### Individual Agent
```bash
# Start specific agent
.agents/agents/planner.sh &

# Check status
cat .agents/status/planner.status
```

#### All Agents
```bash
# Use launcher
/home/rob/agent-framework/launcher/cli/launch.sh

# Or use start script
.agents/start.sh
```

### Monitoring Agents

#### Status Files
```bash
# Check agent status
cat .agents/status/*.status | jq .

# Check health
cat .agents/status/*_health.json | jq .
```

#### Log Files
```bash
# Tail specific agent log
tail -f .agents/logs/coordinator*.log

# Search across logs
grep ERROR .agents/logs/*.log
```

#### Message Queue
```bash
# Check pending messages
ls .agents/inboxes/*/

# View message content
cat .agents/inboxes/coordinator/*.msg | jq .
```

### Controlling Agents

#### Stop Agent
```bash
# Graceful stop
echo "STOP" > .agents/inboxes/planner/STOP

# Force stop
kill $(cat .agents/status/planner.pid)
```

#### Health Check
```bash
# Request health check
echo "HEALTH_CHECK" > .agents/inboxes/planner/HEALTH_CHECK

# Check response
cat .agents/outboxes/planner/health_*
```

## Agent Customization

### Modifying Agent Behavior

#### Update Instructions
Edit `.agents/docs/AGENT_INSTRUCTIONS.md`:
```markdown
## Coder
- Use async/await instead of callbacks
- Prefer functional programming
- Add JSDoc comments to all functions
```

#### Modify Agent Script
Edit `.agents/agents/coder.sh`:
```bash
# Add custom logic
implement_feature() {
    local task="$1"
    
    # Custom implementation logic
    if [[ "$LANGUAGE" == "TypeScript" ]]; then
        enforce_strict_types
    fi
    
    # Continue with standard flow
    standard_implementation "$task"
}
```

### Adding Custom Agents

#### Step 1: Create Agent Script
```bash
cp .agents/agents/base-agent.sh .agents/agents/security-agent.sh
```

#### Step 2: Define Role
```bash
AGENT_NAME="security"
AGENT_ROLE="Security Analysis and Vulnerability Detection"
```

#### Step 3: Implement Logic
```bash
handle_task() {
    local task="$1"
    
    case "$task" in
        *security*)
            perform_security_scan
            ;;
        *vulnerability*)
            check_vulnerabilities
            ;;
    esac
}
```

#### Step 4: Register with Coordinator
Add to coordinator's agent list:
```bash
AGENTS=("planner" "tester" "coder" "reviewer" "security")
```

## Agent Workflows

### Sequential Workflow
Best for: Dependent tasks
```
Planner → Coder → Tester → Reviewer
```

### Parallel Workflow
Best for: Independent tasks
```
        ┌→ Coder 1 ─┐
Planner ┼→ Coder 2 ─┼→ Tester → Reviewer
        └→ Coder 3 ─┘
```

### Iterative Workflow
Best for: Test-driven development
```
Coder ↔ Tester (until tests pass) → Reviewer
```

## Performance Tuning

### Agent Performance Settings

#### Message Processing
```bash
# Reduce check interval for faster response
AGENT_CHECK_INTERVAL=1  # Check every second

# Increase for lower CPU usage
AGENT_CHECK_INTERVAL=5  # Check every 5 seconds
```

#### Resource Limits
```bash
# Limit memory usage
ulimit -v 512000  # 512MB limit

# Limit CPU usage
nice -n 10 ./agent.sh  # Lower priority
```

#### Batch Processing
```bash
# Process multiple messages at once
BATCH_SIZE=5
for msg in $(ls "$INBOX"/*.msg | head -$BATCH_SIZE); do
    process_message "$msg"
done
```

## Troubleshooting

### Common Issues

#### Agent Not Responding
```bash
# Check if running
ps aux | grep agent-name

# Check last activity
tail .agents/logs/agent-name*.log

# Force health check
echo "HEALTH_CHECK" > .agents/inboxes/agent-name/HEALTH_CHECK
```

#### Message Backlog
```bash
# Count pending messages
ls .agents/inboxes/agent-name/*.msg | wc -l

# Clear old messages
find .agents/inboxes -name "*.msg" -mtime +7 -delete
```

#### High Resource Usage
```bash
# Check memory usage
ps aux | grep agent-name | awk '{print $6}'

# Check CPU usage
top -p $(cat .agents/status/agent-name.pid)

# Restart agent
echo "STOP" > .agents/inboxes/agent-name/STOP
sleep 5
.agents/agents/agent-name.sh &
```

## Best Practices

### 1. Clear Goals
- Define specific, measurable goals
- Prioritize based on value
- Update status regularly

### 2. Good Documentation
- Keep PROJECT_SPEC.md current
- Document decisions in ARCHITECTURE.md
- Update AGENT_INSTRUCTIONS.md based on learnings

### 3. Regular Monitoring
- Check logs daily
- Review completed work
- Track progress metrics
- Address issues promptly

### 4. Iterative Improvement
- Refine agent instructions
- Optimize workflows
- Update patterns
- Share learnings

### 5. Resource Management
- Clean logs regularly
- Archive old messages
- Monitor resource usage
- Scale appropriately

## Advanced Topics

### AI Integration

When Claude CLI is available:
```bash
# Agents use AI for complex tasks
ask_claude() {
    local prompt="$1"
    echo "$prompt" | claude
}

# Enhanced analysis
result=$(ask_claude "Analyze this code for issues: $code")
```

### Distributed Agents

Run agents on different machines:
```bash
# Central message queue
INBOX_DIR="/shared/inboxes"
OUTBOX_DIR="/shared/outboxes"

# Remote agent
ssh remote-host ".agents/agents/coder.sh"
```

### Event-Driven Architecture

React to external events:
```bash
# Watch for file changes
inotifywait -m "$SRC_DIR" -e modify |
while read path action file; do
    send_message "tester" "run_tests"
done
```

---
*For initialization help, see [Initialization Guide](INITIALIZATION.md)*
*For API details, see [API Documentation](API.md)*
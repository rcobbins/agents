# Agent Framework Initialization Guide

## Overview
This guide walks you through initializing a new project with the Agent Framework, from initial setup to launching your first agents.

## Prerequisites

### Required Software
- **Bash** 4.0 or higher
- **jq** for JSON processing
- **Git** for version control (recommended)
- **Node.js** 14+ (for web UI, optional)

### Optional Software
- **Claude CLI** for enhanced AI capabilities
- **Docker** for containerized deployment

## Quick Start

```bash
# Navigate to your project
cd /path/to/your/project

# Run the initialization wizard
/home/rob/agent-framework/init/wizard.sh

# Validate setup
/home/rob/agent-framework/init/validators/check-readiness.sh

# Launch agents
/home/rob/agent-framework/launcher/cli/launch.sh
```

## Detailed Initialization Process

### Step 1: Running the Wizard

The initialization wizard will guide you through configuring your project:

```bash
/home/rob/agent-framework/init/wizard.sh [project-directory]
```

You'll be prompted for:

1. **Project Information**
   - Project name
   - Brief description
   - Version number

2. **Technology Stack**
   - Primary programming language
   - Frameworks and libraries
   - Database technology
   - Testing framework

3. **Project Structure**
   - Source code directory
   - Test directory
   - Build output directory

4. **Development Goals**
   - Define what agents should work toward
   - Prioritize objectives
   - Set success criteria

5. **Testing Strategy**
   - Coverage targets
   - Test command
   - Testing priorities

6. **Architecture Overview**
   - System design approach
   - Key components
   - Integration points

### Step 2: Understanding Generated Files

After initialization, your project will have a `.agents/` directory:

```
.agents/
├── docs/                 # Agent documentation
│   ├── PROJECT_SPEC.md     # Project overview
│   ├── GOALS.json          # Development goals
│   ├── TESTING_STRATEGY.md # Testing approach
│   └── AGENT_INSTRUCTIONS.md # Agent-specific guides
├── config/              # Configuration
│   └── project.conf       # Project settings
├── agents/              # Agent scripts
│   ├── base-agent.sh
│   ├── coordinator.sh
│   ├── planner.sh
│   ├── tester.sh
│   ├── coder.sh
│   └── reviewer.sh
├── logs/                # Agent logs
├── status/              # Status tracking
├── inboxes/            # Inter-agent messages
├── outboxes/           # Outgoing messages
├── workspace/          # Agent work areas
└── start.sh            # Quick start script
```

### Step 3: Customizing Documentation

#### PROJECT_SPEC.md
Edit to provide more detail about:
- System architecture
- Business requirements
- Technical constraints
- Integration points

#### GOALS.json
Modify goals to be:
- Specific and measurable
- Prioritized correctly
- Achievable
- Time-bound (if applicable)

Example:
```json
{
  "goals": [
    {
      "id": "goal-1",
      "description": "Implement RESTful API with full CRUD operations",
      "priority": "high",
      "status": "pending",
      "acceptance_criteria": [
        "All endpoints return correct status codes",
        "Data validation on all inputs",
        "Error responses follow standard format"
      ]
    }
  ]
}
```

#### AGENT_INSTRUCTIONS.md
Customize for your project:
- Coding standards
- Naming conventions
- Testing requirements
- Review criteria

### Step 4: Validation

Run the validation script to ensure everything is configured correctly:

```bash
/home/rob/agent-framework/init/validators/check-readiness.sh
```

The validator checks:
- ✅ Required documentation exists
- ✅ Goals are defined
- ✅ Project structure is valid
- ✅ Test command is configured
- ✅ Agent scripts are present

### Step 5: Launching Agents

#### Using the CLI Launcher

```bash
/home/rob/agent-framework/launcher/cli/launch.sh /path/to/project
```

Menu options:
1. Start all agents
2. Stop all agents
3. Show agent status
4. Show project goals
5. Tail agent logs
6. Start specific agent
7. Stop specific agent
8. Run validation
9. Show configuration

#### Using the Quick Start Script

```bash
cd /path/to/project
.agents/start.sh
```

#### Auto-start Mode

```bash
/home/rob/agent-framework/launcher/cli/launch.sh /path/to/project --auto-start
```

## Configuration Options

### project.conf

Key variables you can modify:

```bash
# Test configuration
TEST_COMMAND="npm test"          # Command to run tests
TEST_COVERAGE="80"               # Minimum coverage target

# Directory structure
SRC_DIR="src"                    # Source code location
TEST_DIR="tests"                 # Test files location
BUILD_DIR="dist"                 # Build output location

# Agent behavior
AGENT_CHECK_INTERVAL=2           # Seconds between inbox checks
HEARTBEAT_INTERVAL=30            # Health check frequency
```

### Framework Configuration

Global settings in `/home/rob/agent-framework/config/default.conf`:

```bash
# Resource limits
MAX_MEMORY_MB=512               # Per agent memory limit
MAX_CPU_PERCENT=25              # Per agent CPU limit

# Feature flags
FEATURE_AUTO_PLANNING=true      # Auto-create plans
FEATURE_AUTO_TESTING=true       # Auto-run tests
FEATURE_AUTO_REVIEW=true        # Auto-review code
```

## Working with Multiple Projects

### Switching Projects

```bash
# Launch for different project
/home/rob/agent-framework/launcher/cli/launch.sh /path/to/other/project
```

### Project Templates

Create reusable configurations:

```bash
# Save current project as template
cp -r .agents/docs /home/rob/my-templates/nodejs-api/

# Use template for new project
cp -r /home/rob/my-templates/nodejs-api/* new-project/.agents/docs/
```

## Troubleshooting

### Agents Not Starting

1. Check logs: `tail -f .agents/logs/*.log`
2. Verify scripts are executable: `chmod +x .agents/agents/*.sh`
3. Ensure dependencies installed: `jq --version`
4. Run validation: `check-readiness.sh`

### No Progress on Goals

1. Verify goals in GOALS.json are clear
2. Check if test command works: `$TEST_COMMAND`
3. Ensure source directory exists
4. Review agent instructions are specific

### High Resource Usage

1. Reduce check intervals in config
2. Limit number of active agents
3. Clear old logs: `rm .agents/logs/*.log.old`
4. Archive completed work

## Best Practices

### Goal Definition
- Start with 3-5 clear goals
- Make them measurable
- Prioritize based on value
- Update status as completed

### Documentation
- Keep PROJECT_SPEC.md current
- Document architectural decisions
- Update test strategy as needed
- Refine agent instructions based on results

### Monitoring
- Check logs regularly
- Review completed work
- Track goal progress
- Adjust strategies based on outcomes

### Maintenance
- Clean logs weekly
- Archive completed messages
- Update dependencies
- Refine instructions based on agent performance

## Advanced Usage

### Custom Agents

Add a new specialized agent:

```bash
# Copy base template
cp .agents/agents/base-agent.sh .agents/agents/custom-agent.sh

# Edit to add custom logic
vim .agents/agents/custom-agent.sh

# Add to coordinator's agent list
vim .agents/agents/coordinator.sh
```

### Integration with CI/CD

```yaml
# .github/workflows/agents.yml
name: Run Agents
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
jobs:
  agents:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run agents
        run: |
          ./agent-framework/launcher/cli/launch.sh . --auto-start
          sleep 3600  # Run for 1 hour
```

### Remote Monitoring

Use the web UI (when available) or SSH forwarding:

```bash
# SSH with port forwarding
ssh -L 3000:localhost:3000 user@server

# Access web UI at http://localhost:3000
```

## Next Steps

1. **Refine Goals**: Make them specific to your project
2. **Customize Instructions**: Tailor to your coding standards
3. **Monitor Progress**: Check logs and status regularly
4. **Iterate**: Improve based on agent performance
5. **Scale**: Add more sophisticated goals as agents prove capability

---
*For more information, see the [Agent Guide](AGENT_GUIDE.md) and [API Documentation](API.md)*
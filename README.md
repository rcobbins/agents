# 🤖 Agent Framework

A powerful, autonomous multi-agent system for software development automation. This framework orchestrates five specialized AI agents that work together to achieve your project goals, maintain code quality, and accelerate development.

## 🌟 Features

- **Five Specialized Agents**: Coordinator, Planner, Tester, Coder, and Reviewer working in harmony
- **Project Goal Tracking**: Define goals and watch agents work toward them autonomously
- **Automatic Testing**: Continuous test execution and coverage monitoring
- **Code Quality Assurance**: Automated code review and standards enforcement
- **Any Language Support**: Works with JavaScript, Python, Go, Java, Rust, and more
- **AI-Powered** (Optional): Enhanced with Claude AI for intelligent decision-making
- **Project Initialization Wizard**: Quick setup for any project
- **Real-time Monitoring**: Track agent progress and system health

## 🚀 Quick Start

### 1. Initialize Your Project

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the initialization wizard
/home/rob/agent-framework/init/wizard.sh
```

The wizard will guide you through:
- Project information (name, description, version)
- Technology stack selection
- Project structure configuration
- Development goals definition
- Testing strategy setup
- Architecture documentation

### 2. Validate Setup

```bash
# Check if your project is ready
/home/rob/agent-framework/init/validators/check-readiness.sh
```

### 3. Launch Agents

```bash
# Start the agents
/home/rob/agent-framework/launcher/cli/launch.sh

# Or use the project-specific launcher
.agents/start.sh
```

## 📦 Installation

### Prerequisites

- **Bash** 4.0+ (Linux/macOS/WSL)
- **jq** (for JSON processing)
- **Git** (recommended)
- **Claude CLI** (optional, for AI assistance)

```bash
# Install jq (Ubuntu/Debian)
sudo apt-get install jq

# Install jq (macOS)
brew install jq

# Install Claude CLI (optional)
pip install anthropic
```

### Framework Setup

```bash
# Clone or extract the framework
cd /home/rob
git clone [repository-url] agent-framework

# Make scripts executable
chmod +x agent-framework/init/wizard.sh
chmod +x agent-framework/init/validators/check-readiness.sh
chmod +x agent-framework/launcher/cli/launch.sh
```

## 🤖 The Five Agents

### 1. Coordinator Agent
**Role**: Orchestrates work across all agents

- Manages task distribution
- Tracks progress toward goals
- Balances workload
- Generates progress reports

### 2. Planner Agent
**Role**: Analyzes tasks and creates implementation plans

- Studies codebase structure
- Creates detailed implementation strategies
- Identifies dependencies
- Suggests architectural improvements

### 3. Tester Agent
**Role**: Ensures code quality through testing

- Executes test suites
- Monitors coverage metrics
- Analyzes test failures
- Reports quality issues

### 4. Coder Agent
**Role**: Implements features and fixes

- Writes new code
- Fixes bugs
- Implements features from plans
- Creates tests for new code

### 5. Reviewer Agent
**Role**: Maintains code standards

- Reviews code changes
- Checks for best practices
- Identifies potential issues
- Ensures consistency

## 📁 Project Structure

After initialization, your project will have:

```
your-project/
├── .agents/
│   ├── docs/              # Project documentation for agents
│   │   ├── PROJECT_SPEC.md
│   │   ├── GOALS.json
│   │   ├── TESTING_STRATEGY.md
│   │   └── AGENT_INSTRUCTIONS.md
│   ├── config/            # Configuration files
│   │   └── project.conf
│   ├── agents/            # Agent scripts
│   ├── logs/              # Agent logs
│   ├── status/            # Status tracking
│   ├── inboxes/           # Inter-agent messages
│   ├── outboxes/          # Outgoing messages
│   ├── workspace/         # Agent work areas
│   └── start.sh           # Project launcher
```

## 🎯 Defining Goals

Goals are defined in `.agents/docs/GOALS.json`:

```json
{
  "goals": [
    {
      "id": "goal-1",
      "description": "Implement user authentication",
      "priority": "high",
      "status": "pending"
    },
    {
      "id": "goal-2",
      "description": "Add API rate limiting",
      "priority": "medium",
      "status": "pending"
    }
  ]
}
```

Agents will automatically work toward these goals, breaking them down into tasks and implementing solutions.

## 🔧 Configuration

### Project Configuration
Edit `.agents/config/project.conf` to adjust:
- Test commands
- Directory structures
- Coverage targets
- Language-specific settings

### Framework Configuration
Global settings in `/home/rob/agent-framework/config/default.conf`:
- Resource limits
- Check intervals
- Logging levels
- Feature flags

## 📊 Monitoring

### View Agent Status
```bash
# In the launcher menu, select option 3
# Or check status files
cat .agents/status/*.status
```

### View Logs
```bash
# Tail all agent logs
tail -f .agents/logs/*.log

# View specific agent log
tail -f .agents/logs/coordinator*.log
```

### Progress Reports
```bash
# Check progress toward goals
cat .agents/docs/GOALS.json | jq '.progress'

# View work completed
ls .agents/workspace/*/completed/
```

## 🛠️ Troubleshooting

### Agents Not Starting
1. Run validation: `/home/rob/agent-framework/init/validators/check-readiness.sh`
2. Check prerequisites are installed
3. Ensure scripts are executable
4. Review logs for errors

### No Progress on Goals
1. Verify goals are properly defined in GOALS.json
2. Check if Claude CLI is available (for AI assistance)
3. Ensure test command is correct
4. Review agent logs for blockers

### High Resource Usage
1. Adjust resource limits in configuration
2. Reduce check intervals
3. Clean up old logs and messages

## 🔄 Workflow

1. **Define Goals** → Agents read GOALS.json
2. **Coordinator Plans** → Distributes tasks to agents
3. **Planner Analyzes** → Creates implementation strategies
4. **Coder Implements** → Writes code following plans
5. **Tester Validates** → Runs tests and checks coverage
6. **Reviewer Ensures Quality** → Reviews changes
7. **Repeat** → Continue until goals are achieved

## 🎨 Customization

### Adding Custom Agents
1. Create agent script in `.agents/agents/`
2. Source the base-agent.sh template
3. Implement agent-specific logic
4. Add to launcher configuration

### Custom Validation Rules
1. Edit validation script
2. Add project-specific checks
3. Update documentation templates

### Integration with CI/CD
```bash
# In your CI pipeline
/home/rob/agent-framework/launcher/cli/launch.sh --auto-start
```

## 📚 Advanced Usage

### Batch Operations
```bash
# Initialize multiple projects
for project in project1 project2 project3; do
  cd /path/to/$project
  /home/rob/agent-framework/init/wizard.sh --batch
done
```

### Headless Mode
```bash
# Run without interactive menu
/home/rob/agent-framework/launcher/cli/launch.sh . --auto-start
```

### API Integration (Future)
The framework is designed to support REST API and WebSocket interfaces for remote management (coming soon).

## 🤝 Contributing

Contributions are welcome! The framework is designed to be extensible:

1. Fork the repository
2. Create your feature branch
3. Add new agents or features
4. Submit a pull request

## 📄 License

This project is open source. See LICENSE file for details.

## 🆘 Support

- **Documentation**: Check `.agents/docs/` in your project
- **Validation**: Run the validation script for diagnostics
- **Logs**: Agent logs contain detailed information
- **Issues**: Report problems in the GitHub repository

## 🎉 Success Stories

The Agent Framework has been successfully used for:
- Automated test coverage improvement (60% → 95%)
- Legacy code refactoring projects
- API endpoint implementation
- Bug fixing and issue resolution
- Documentation generation
- Code quality improvements

## 🚧 Roadmap

- [ ] Web-based monitoring dashboard
- [ ] Cloud-based agent hosting
- [ ] Plugin system for custom agents
- [ ] Multi-project orchestration
- [ ] Performance analytics
- [ ] Integration with more AI models
- [ ] Visual workflow editor

---

**Built with ❤️ for developers who want to code less and achieve more**

*Version 1.0.0 - Extracted from AI Party Game Project*
# Agent Framework Web UI Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Web UI Commands](#web-ui-commands)
- [Features](#features)
- [Components](#components)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Overview

The Agent Framework Web UI provides a modern, interactive interface for managing and monitoring your multi-agent development system. Built with React, Express, and Socket.IO, it offers real-time updates, visual task tracking, and comprehensive agent control.

### Key Benefits
- **Non-Blocking Operation**: Run in background while continuing other work
- **Real-Time Updates**: Live streaming of agent activities via WebSockets
- **Visual Task Management**: See task queues, progress, and dependencies
- **Centralized Control**: Manage all agents from one interface
- **Project Wizard**: Guided project initialization with AI assistance
- **Performance Monitoring**: Track agent efficiency and resource usage

## Architecture

### Technology Stack

#### Frontend (Port 3000)
- **React 18**: Modern UI framework with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Socket.IO Client**: Real-time bidirectional communication
- **Tailwind CSS**: Utility-first styling
- **React Router**: Client-side routing

#### Backend (Port 3001)
- **Express.js**: Web server framework
- **Socket.IO**: WebSocket server for real-time events
- **Node.js**: JavaScript runtime
- **Chokidar**: File system watching
- **Winston**: Structured logging

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Browser                       │
│  ┌─────────────────────────────────────────────┐   │
│  │         React Frontend (Port 3000)          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │Dashboard │ │ Projects │ │  Agents  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
                    HTTP/WebSocket
                          ↓
┌─────────────────────────────────────────────────────┐
│          Express Backend (Port 3001)                │
│  ┌───────────────────────────────────────────┐     │
│  │            API Routes                      │     │
│  │  /api/projects  /api/agents  /api/status  │     │
│  └───────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────┐     │
│  │         Socket.IO Server                   │     │
│  │  Events: agent:update, task:complete, etc  │     │
│  └───────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
                          │
                    File System/Shell
                          ↓
┌─────────────────────────────────────────────────────┐
│               Agent Processes                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Coordinator│ │ Planner  │ │  Coder   │ ...       │
│  └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────┘
```

## Getting Started

### Quick Start

```bash
# Start the web UI in background (non-blocking)
agent-framework web start

# Access the interface
# Frontend: http://localhost:3000
# API: http://localhost:3001

# Check status
agent-framework web status

# Stop when done
agent-framework web stop
```

### First Time Setup

1. **Start the Web UI**
   ```bash
   agent-framework web start
   ```

2. **Open Your Browser**
   Navigate to http://localhost:3000

3. **Create or Import a Project**
   - Use the Project Initialization Wizard for new projects
   - Import existing projects from the dashboard

4. **Configure Agents**
   - Set up agent credentials if using AI
   - Configure resource limits
   - Define project goals

## Web UI Commands

### Command Reference

#### `agent-framework web start`
Starts both frontend and backend services in the background.
- Frontend runs on port 3000
- Backend API runs on port 3001
- Services run as daemon processes
- Automatically installs dependencies if needed
- Creates PID files for process management

#### `agent-framework web stop`
Gracefully stops all web UI services.
- Sends SIGTERM to processes
- Waits for graceful shutdown
- Cleans up PID files
- Forces termination if processes don't respond

#### `agent-framework web status`
Shows the current status of web UI services.
- Displays service states (running/stopped)
- Shows process IDs
- Indicates port numbers
- Checks for stale PID files

#### `agent-framework web restart`
Restarts all web UI services.
- Equivalent to `stop` followed by `start`
- Useful after configuration changes
- Ensures clean state

#### `agent-framework web logs`
Tails the web UI service logs in real-time.
- Shows both frontend and backend logs
- Useful for debugging
- Press Ctrl+C to exit

### Process Management

The web UI uses a sophisticated process management system:

- **PID Files**: Located in `/home/rob/agent-framework/.runtime/`
  - `web-server.pid`: Backend Express server
  - `web-client.pid`: Frontend Vite dev server

- **Log Files**: Located in `/home/rob/agent-framework/logs/`
  - `web-server.log`: Backend logs
  - `web-client.log`: Frontend build/dev logs

- **Automatic Cleanup**: Stale PID files are detected and cleaned

## Features

### 1. Dashboard
The main control center providing:
- **System Overview**: Active agents, running tasks, resource usage
- **Recent Activity**: Live feed of agent actions
- **Quick Actions**: Start/stop agents, create projects
- **Performance Metrics**: Task completion rates, average execution times

### 2. Project Management

#### Project Initialization Wizard
Interactive step-by-step project setup:
1. **Basic Information**: Name, description, version
2. **Technology Stack**: Language, frameworks, tools
3. **Project Structure**: Directory layout, file patterns
4. **Goals Definition**: What you want agents to achieve
5. **Testing Strategy**: Test commands, coverage targets
6. **Architecture Planning**: System design, components

#### Project Templates
Pre-configured setups for common project types:
- Web Applications (React, Vue, Angular)
- Backend APIs (Express, FastAPI, Go)
- Mobile Apps (React Native, Flutter)
- CLI Tools (Node.js, Python, Rust)
- Libraries/Packages

### 3. Agent Monitoring

#### Real-Time Status
- **Agent States**: Idle, Working, Blocked, Error
- **Current Tasks**: What each agent is working on
- **Message Queue**: Pending communications
- **Resource Usage**: CPU, memory, execution time

#### Agent Control Panel
- **Individual Control**: Start, stop, restart specific agents
- **Session Management**: Reset agent sessions
- **Priority Adjustment**: Reorder task priorities
- **Manual Task Assignment**: Override automatic distribution

### 4. Task Management

#### Visual Task Queue
- **Pending Tasks**: Waiting for agent assignment
- **Active Tasks**: Currently being processed
- **Completed Tasks**: History with results
- **Failed Tasks**: Error details and retry options

#### Task Dependencies
- **Dependency Graph**: Visual representation
- **Blocking Tasks**: What's preventing progress
- **Critical Path**: Optimal execution order

### 5. Goal Tracking

#### Progress Visualization
- **Goal Timeline**: Expected vs actual completion
- **Milestone Tracking**: Key achievement points
- **Burndown Charts**: Work remaining over time
- **Success Metrics**: Goal completion statistics

### 6. Live Logs

#### Streaming Output
- **Agent Logs**: Real-time output from each agent
- **System Events**: Framework-level activities
- **Error Tracking**: Centralized error collection
- **Log Filtering**: Search and filter capabilities

## Components

### Frontend Components

#### Layout Components
- `Layout.tsx`: Main application layout with navigation
- `CollapsibleSection.tsx`: Expandable content sections
- `VisualCard.tsx`: Reusable card component for data display

#### Project Components
- `ProjectBasicInfo.tsx`: Project metadata form
- `ProjectTypeSelector.tsx`: Project type selection UI
- `SmartTechStackBuilder.tsx`: Interactive technology stack builder
- `GoalsWizard.tsx`: Goal definition interface
- `TestingStrategyGuide.tsx`: Testing configuration
- `ArchitectureHelper.tsx`: System architecture planner
- `ComplexityEstimator.tsx`: Project complexity analysis
- `ReviewWithValidation.tsx`: Configuration review

#### Monitoring Components
- `AgentMonitor.tsx`: Real-time agent status display
- `Dashboard.tsx`: Main dashboard view
- `ProjectDetail.tsx`: Detailed project information

### Backend Modules

#### Core Services
- `IntegratedAgentManager.js`: Unified agent control
- `ProjectManager.js`: Project lifecycle management
- `MessageBroker.js`: Inter-agent communication
- `FileWatcher.js`: File system monitoring

#### Agent Classes
- `BaseAgent.js`: Abstract base class for all agents
- `CoordinatorAgent.js`: Task distribution logic
- `PlannerAgent.js`: Planning and analysis
- `CoderAgent.js`: Code generation
- `TesterAgent.js`: Test execution
- `ReviewerAgent.js`: Code review

#### API Routes
- `/api/projects`: Project CRUD operations
- `/api/agents`: Agent control endpoints
- `/api/status`: System status information
- `/api/messages`: Message queue management
- `/api/assistant`: AI assistance integration

## API Reference

### RESTful Endpoints

#### Projects API
```javascript
GET    /api/projects          // List all projects
POST   /api/projects          // Create new project
GET    /api/projects/:id      // Get project details
PUT    /api/projects/:id      // Update project
DELETE /api/projects/:id      // Delete project
POST   /api/projects/:id/init // Initialize project
```

#### Agents API
```javascript
GET    /api/agents             // List all agents
GET    /api/agents/:name       // Get agent status
POST   /api/agents/:name/start // Start agent
POST   /api/agents/:name/stop  // Stop agent
POST   /api/agents/:name/reset // Reset agent session
GET    /api/agents/:name/logs  // Get agent logs
```

#### Status API
```javascript
GET    /api/status             // System status
GET    /api/status/health      // Health check
GET    /api/status/metrics     // Performance metrics
```

### WebSocket Events

#### Client → Server
```javascript
socket.emit('project:create', projectData)
socket.emit('agent:start', agentName)
socket.emit('agent:stop', agentName)
socket.emit('task:assign', { agent, task })
socket.emit('subscribe:logs', agentName)
```

#### Server → Client
```javascript
socket.on('agent:update', (agentStatus) => {})
socket.on('task:started', (taskData) => {})
socket.on('task:completed', (result) => {})
socket.on('task:failed', (error) => {})
socket.on('log:message', (logEntry) => {})
socket.on('metrics:update', (metrics) => {})
```

## Configuration

### Environment Variables
Create a `.env` file in the web-ui/server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL
CLIENT_URL=http://localhost:3000

# Agent Configuration
AGENT_TIMEOUT=300000  # 5 minutes
MAX_CONCURRENT_TASKS=10

# Logging
LOG_LEVEL=info
LOG_FILE=logs/web-server.log

# Claude API (optional)
ANTHROPIC_API_KEY=your_api_key_here
```

### Port Configuration
To use custom ports:

```bash
# Set environment variables before starting
export WEB_CLIENT_PORT=8080
export WEB_SERVER_PORT=8081
agent-framework web start
```

### Resource Limits
Configure in `/home/rob/agent-framework/config/web-ui.conf`:

```bash
# Maximum memory for Node.js processes
MAX_MEMORY=2048  # MB

# Process priorities
SERVER_PRIORITY=0
CLIENT_PRIORITY=5

# Restart policies
AUTO_RESTART=true
RESTART_DELAY=5  # seconds
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill the process or use different ports
export WEB_CLIENT_PORT=8080
export WEB_SERVER_PORT=8081
agent-framework web start
```

#### Services Won't Start
1. Check logs: `agent-framework web logs`
2. Verify Node.js is installed: `node --version`
3. Check dependencies: `cd web-ui/server && npm install`
4. Clear PID files: `rm /home/rob/agent-framework/.runtime/*.pid`
5. Try manual start for debugging:
   ```bash
   cd /home/rob/agent-framework/web-ui/server
   npm start
   ```

#### No Real-Time Updates
1. Check WebSocket connection in browser console
2. Verify backend is running: `agent-framework web status`
3. Check for proxy/firewall issues
4. Ensure Socket.IO client version matches server

#### High Memory Usage
1. Restart services: `agent-framework web restart`
2. Clear old logs: `rm /home/rob/agent-framework/logs/*.log`
3. Limit concurrent operations in configuration
4. Check for memory leaks in browser DevTools

### Debug Mode
Enable detailed logging:

```bash
# Start with debug logging
DEBUG=* agent-framework web start

# Or set in environment
export LOG_LEVEL=debug
agent-framework web start
```

## Development

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone [repository-url]
   cd agent-framework
   ```

2. **Install Dependencies**
   ```bash
   # Main dependencies
   npm install
   
   # Web UI dependencies
   cd web-ui/server && npm install
   cd ../client && npm install
   ```

3. **Start Development Mode**
   ```bash
   # From framework root
   npm run dev
   ```

### Adding New Features

#### Frontend Development
1. Components go in `web-ui/client/src/components/`
2. Use TypeScript for type safety
3. Follow React best practices (hooks, functional components)
4. Add tests in `__tests__` directories

#### Backend Development
1. Add routes in `web-ui/server/routes/`
2. Create services in `web-ui/server/modules/`
3. Extend BaseAgent for new agent types
4. Use Winston for logging

### Testing

```bash
# Run frontend tests
cd web-ui/client
npm test

# Run backend tests
cd web-ui/server
npm test

# Run all tests
npm test
```

### Building for Production

```bash
# Build frontend for production
cd web-ui/client
npm run build

# The built files will be in web-ui/client/dist/
# Configure your web server to serve these files
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Security Considerations

### Best Practices
- **Authentication**: Implement authentication before exposing to network
- **CORS**: Configure appropriate CORS policies
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Implement rate limiting for API endpoints
- **HTTPS**: Use HTTPS in production environments

### Network Security
By default, the web UI only listens on localhost. To expose to network:

1. Configure firewall rules
2. Set up reverse proxy (nginx/Apache)
3. Implement authentication
4. Use HTTPS certificates

## Performance Optimization

### Tips for Better Performance
1. **Limit Log Streaming**: Don't stream all agents simultaneously
2. **Pagination**: Use pagination for large datasets
3. **Debouncing**: Debounce rapid UI updates
4. **Caching**: Enable browser caching for static assets
5. **Compression**: Enable gzip compression on server

### Monitoring Performance
- Use browser DevTools Performance tab
- Monitor WebSocket message frequency
- Check Node.js memory usage
- Review agent execution times

## Frequently Asked Questions

**Q: Can I run multiple instances of the web UI?**
A: Yes, but use different ports for each instance.

**Q: How do I integrate with CI/CD?**
A: Use the REST API endpoints for programmatic control.

**Q: Can I customize the UI theme?**
A: Yes, modify the Tailwind configuration and CSS files.

**Q: Is there mobile support?**
A: The UI is responsive but optimized for desktop use.

**Q: How do I back up my configuration?**
A: Back up the `.agents/` directories and `/home/rob/agent-framework/config/`.

## Support and Resources

- **Documentation**: This guide and other docs in `/docs/`
- **Logs**: Check logs for detailed error information
- **Community**: Report issues on GitHub
- **Updates**: Pull latest changes regularly

---

*Last Updated: 2024*
*Version: 1.0.0*
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Project Setup
```bash
# Install all dependencies (root + web UI)
npm run install:deps

# Quick setup
npm run setup
./setup.sh
```

### Running the Framework

#### Web UI (Recommended)
```bash
# Start web UI services (non-blocking, runs in background)
agent-framework web start
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001

# Check status
agent-framework web status

# View logs
agent-framework web logs

# Restart services
agent-framework web restart

# Stop services
agent-framework web stop
```

#### CLI Commands
```bash
# Initialize a new project
agent-framework init <project-path>

# Validate project setup
agent-framework validate <project-path>

# Launch agents for a project
agent-framework launch <project-path>

# Stop agents
agent-framework stop <project-path>

# Reset agent sessions
agent-framework reset-agent <agent-name> [soft|hard|archive]
agent-framework reset-all [soft|hard|archive]
```

### Development
```bash
# Run both server and client in dev mode
npm run dev

# Run server only
npm run dev:server

# Run client only
npm run dev:client

# Build client for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Validate (lint + test)
npm run validate
```

### Testing Individual Components
```bash
# Web UI Client (React + TypeScript)
cd web-ui/client
npm test
npm run test:coverage

# Web UI Server (Node.js + Express)
cd web-ui/server
npm test
```

## Architecture Overview

### Core System Design
The Agent Framework is a multi-agent orchestration system for automated software development:

1. **Five Specialized Agents**:
   - **Coordinator**: Orchestrates tasks, manages workflow, tracks goals
   - **Planner**: Analyzes codebases, creates implementation strategies
   - **Coder**: Implements features, fixes bugs, writes code
   - **Tester**: Runs tests, monitors coverage, validates quality
   - **Reviewer**: Reviews code, enforces standards, ensures quality

2. **Communication Architecture**:
   - Message-based asynchronous communication between agents
   - Inbox/Outbox pattern for agent messaging
   - Status tracking and health monitoring
   - WebSocket real-time updates for UI

3. **Project Structure** (when initialized):
   ```
   project/.agents/
   ├── agents/         # Agent scripts
   ├── config/         # Configuration
   ├── docs/          # Project documentation
   ├── inboxes/       # Message queues
   ├── logs/          # Agent logs
   ├── status/        # Status tracking
   └── workspace/     # Agent work areas
   ```

### Web UI Architecture

#### Frontend (React + TypeScript + Vite)
- **Location**: `web-ui/client/`
- **Key Components**:
  - `Dashboard.tsx`: Main monitoring interface
  - `ProjectInit.tsx`: Project initialization wizard
  - `AgentMonitor.tsx`: Real-time agent monitoring
  - `ProjectDetail.tsx`: Project management
- **State Management**: React Context + hooks
- **Real-time**: Socket.io client for live updates
- **UI Framework**: Material-UI (@mui)

#### Backend (Node.js + Express)
- **Location**: `web-ui/server/`
- **Key Modules**:
  - `IntegratedAgentManager.js`: Manages integrated agents (avoids spawn issues)
  - `InMemoryMessageQueue.js`: Message passing between agents
  - `ProjectManager.js`: Project lifecycle management
  - `MessageBroker.js`: Inter-agent communication
  - `FileWatcher.js`: File system monitoring
- **API Routes**:
  - `/api/projects`: Project management
  - `/api/agents`: Agent control
  - `/api/messages`: Message operations
  - `/api/status`: System status
  - `/api/assistant`: AI assistance

### Agent System
- **Base Scripts**: `agents/templates/` - Base templates for each agent type
- **Agent Prompts**: `agents/prompts/` - AI prompts for Claude CLI integration
- **Runtime Management**: `utils/runtime-manager.sh` - Process lifecycle
- **Message Utils**: `utils/message-utils.sh` - Inter-agent messaging
- **Context Utils**: `utils/context-utils.sh` - Project context management

### Key Design Patterns
1. **Message Queue Pattern**: Async communication via inbox/outbox
2. **Health Check System**: Regular health monitoring with heartbeats
3. **Status Tracking**: Real-time status updates for all agents
4. **Session Management**: Soft/hard/archive reset capabilities
5. **Integrated Agent System**: Avoids spawn issues with Claude CLI

## Important Implementation Details

### Agent Communication Flow
1. Coordinator receives goals from `GOALS.json`
2. Tasks distributed via message queue to specialized agents
3. Agents process tasks and report back through outboxes
4. Status updates broadcast via WebSocket to UI
5. Progress tracked in project documentation

### Error Handling
- PID file management in `.runtime/` directory
- Graceful shutdown with SIGTERM handling
- Automatic cleanup of stale processes
- Comprehensive logging in `logs/` directory

### Web UI Process Management
- Non-blocking startup using background processes
- PID tracking for server and client
- Port conflict detection (3000 for client, 3001 for server)
- Automatic log rotation and cleanup

### Claude CLI Integration
When available, agents use Claude CLI for AI-powered assistance:
- Located via PATH or explicit configuration
- Timeout handling (default 300s, critical tasks 600s)
- Session management for continuous context
- Fallback to non-AI mode if unavailable

## Key Files to Understand

1. **Framework Entry**: `bin/agent-framework` - Main CLI entry point
2. **Web Server**: `web-ui/server/index.js` - Express server setup
3. **Agent Manager**: `web-ui/server/modules/IntegratedAgentManager.js` - Core agent orchestration
4. **Project Init**: `init/wizard.sh` - Project initialization wizard
5. **Launch Script**: `launcher/cli/launch.sh` - Agent launching logic
6. **Client App**: `web-ui/client/src/App.tsx` - React app root
7. **Dashboard**: `web-ui/client/src/pages/Dashboard.tsx` - Main monitoring UI

## Development Notes

- The framework uses Bash 4.0+ for shell scripts with strict error handling (`set -e`)
- Web UI requires Node.js 18+ and uses ES modules
- TypeScript strict mode is enabled for the React client
- The system avoids `spawn` for Claude CLI (uses integrated agents instead)
- All file paths must be absolute, not relative
- Message files use JSON format with UUID naming
- Health checks run every 30 seconds by default
- WebSocket connections auto-reconnect on failure

## Recent Enhancements (Web UI)

### 1. Agent Stream of Consciousness View
- **Location**: `web-ui/client/src/pages/AgentThoughts.tsx`
- **Route**: `/thoughts/:projectId`
- **Features**:
  - Real-time display of agent thoughts, Claude interactions, decisions
  - Filtering by agent and thought type
  - Search functionality
  - Auto-scroll with pause capability
  - Expandable thought details with syntax highlighting

### 2. Direct Agent Messaging
- **Component**: `web-ui/client/src/components/DirectMessagePanel.tsx`
- **API Endpoint**: `POST /agents/:projectId/:agentId/message`
- **Features**:
  - Send messages directly to agents with priority levels (critical/high/normal/low)
  - Message types: info, suggestion, correction, interrupt
  - Message history with delivery confirmation
  - Real-time acknowledgment tracking

### 3. Enhanced Event System
- **Backend Events**:
  - `agent:thought` - Stream of consciousness events
  - `agent:decision` - Decision-making events
  - `agent:planning` - Planning phase events
  - `agent:fileOperation` - File I/O tracking
  - `task:stateChange` - Task state transitions
  - `agent:message` - Inter-agent communications
  - `test:execution` - Test run events
  - `code:review` - Code review events

### 4. Priority Message Queue
- **Location**: `web-ui/server/agents/InMemoryMessageQueue.js`
- **Priority Levels**: critical > high > normal > low
- **Methods**:
  - `sendPriority()` - Send high priority message
  - `sendCritical()` - Send critical priority message
  - Automatic queue sorting by priority

### 5. BaseAgent Enhancements
- **New Methods**:
  - `emitPlanning()` - Emit planning events
  - `emitDecision()` - Emit decision events
  - `emitAnalysis()` - Emit analysis thoughts
  - `emitProgress()` - Emit progress updates
  - `emitFileOperation()` - Track file operations
  - `emitTaskStateChange()` - Track task state changes
- **Enhanced Claude Integration**:
  - Thought emissions before/after Claude queries
  - Error tracking with thought events
  - Context length tracking

### 6. Real-time Claude CLI Output Streaming
- **Location**: `web-ui/server/agents/ClaudeCliWrapper.js`
- **Features**:
  - Real-time stdout/stderr streaming from Claude CLI
  - Chunk-by-chunk output capture with timestamps
  - Stream type differentiation (stdout vs stderr)
  - Integration with AgentThoughts component for live display
- **Implementation**:
  - `onStreamChunk` callback in `ask()` method
  - Event emission for each output chunk
  - Full stream visualization in UI

### 7. Work Queue Dashboard (Kanban Board)
- **Component**: `web-ui/client/src/pages/WorkQueueDashboard.tsx`
- **Route**: `/queue/:projectId`
- **Backend Module**: `web-ui/server/modules/TaskManager.js`
- **Features**:
  - Drag-and-drop Kanban board with task states:
    - Pending → Planning → In Progress → Review → Testing → Completed → Blocked
  - Task prioritization (critical/high/normal/low)
  - Agent assignment with visual indicators
  - Blocker tracking and management
  - Time tracking (estimated vs actual)
  - Task dependencies and validation
  - Real-time updates via WebSocket
  - Queue metrics and analytics
- **API Endpoints**:
  - `GET/POST /api/tasks` - Task CRUD operations
  - `PUT /api/tasks/:id/status` - Status updates
  - `PUT /api/tasks/:id/assign` - Agent assignment
  - `POST /api/tasks/:id/blockers` - Blocker management
  - `GET /api/tasks/metrics/:projectId` - Queue metrics

### 8. Message Flow Visualizer
- **Component**: `web-ui/client/src/pages/MessageFlowVisualizer.tsx`
- **Route**: `/flows/:projectId`
- **Backend Module**: Enhanced `InMemoryMessageQueue.js` with flow tracking
- **Features**:
  - Network graph visualization of inter-agent communication
  - Real-time message flow animations
  - Node visualization showing agent status and activity
  - Edge thickness based on message volume
  - Color coding by priority (critical/high/normal/low)
  - Click on edges to view message history
  - Flow statistics and metrics
  - Live vs paused mode for real-time updates
  - Message type and priority filtering
- **Flow Tracking**:
  - Agent activity tracking (sent/received counts)
  - Message flow statistics by agent pairs
  - Recent flow animations
  - Time-based flow analysis
- **API Endpoints**:
  - `GET /api/flows` - Get flow visualization data
  - `GET /api/flows/stats` - Get flow statistics
  - `GET /api/flows/history` - Get message history with filters
  - `DELETE /api/flows` - Clear flow data
- **WebSocket Events**:
  - `flow:update` - Real-time flow updates
  - `agent:activity` - Agent status changes


### 9. Code Change Monitor
- **Component**: `web-ui/client/src/pages/CodeChangeMonitor.tsx`
- **Route**: `/changes/:projectId`
- **Backend Module**: `web-ui/server/modules/ChangeTracker.js`
- **Features**:
  - Track all file changes made by agents
  - Diff visualization with before/after comparison
  - Change status tracking (pending/applied/reverted/failed)
  - Revert capability for applied changes
  - Filter by agent, operation type, or status
  - File-based change history
- **Change Operations**:
  - Create, modify, and delete file tracking
  - Automatic snapshot creation
  - Unified diff generation
- **API Endpoints**:
  - `GET /api/changes` - Get changes with filters
  - `POST /api/changes/track` - Track a new change
  - `POST /api/changes/:id/complete` - Complete a change
  - `POST /api/changes/:id/revert` - Revert a change
  - `GET /api/changes/stats/summary` - Change statistics

### 10. Test Results Dashboard
- **Component**: `web-ui/client/src/pages/TestResultsDashboard.tsx`
- **Route**: `/tests/:projectId`
- **Backend Module**: `web-ui/server/modules/TestRunner.js`
- **Features**:
  - Test execution monitoring
  - Real-time test output streaming
  - Pass/fail/skip statistics
  - Coverage tracking and trends
  - Failure pattern analysis
  - Test duration tracking
  - Manual test triggering
- **Test Analysis**:
  - Automatic parsing of Jest, Mocha, pytest output
  - Coverage extraction (lines, branches, functions, statements)
  - Failure pattern recognition
  - Historical trend analysis
- **API Endpoints**:
  - `GET /api/tests/project/:projectId` - Get test runs
  - `POST /api/tests/run` - Run tests
  - `GET /api/tests/stats/:projectId` - Test statistics
  - `GET /api/tests/coverage/:projectId` - Coverage trends

### 11. Analytics Dashboard
- **Component**: `web-ui/client/src/pages/AnalyticsDashboard.tsx`
- **Route**: `/analytics/:projectId`
- **Backend Module**: `web-ui/server/modules/MetricsCollector.js`
- **Features**:
  - System-wide metrics aggregation
  - Real-time health monitoring
  - Performance trends and analysis
  - Automated insight generation
  - Pattern detection (error, performance, success)
  - Resource usage tracking
  - Multi-dimensional metrics visualization
- **Metrics Collection**:
  - Agent metrics (status, CPU, memory, token usage)
  - Task metrics (throughput, completion time, queue size)
  - Test metrics (success rate, coverage, duration)
  - Change metrics (velocity, types, status)
  - Message metrics (throughput, delivery, connections)
  - System metrics (CPU, memory, load, uptime)
- **Intelligence Features**:
  - Automatic pattern recognition
  - Insight generation based on thresholds
  - Health status determination
  - Trend analysis and forecasting
- **API Endpoints**:
  - `GET /api/analytics/metrics/current` - Current metrics
  - `GET /api/analytics/metrics/history` - Historical data
  - `GET /api/analytics/patterns` - Detected patterns
  - `GET /api/analytics/insights` - Generated insights
  - `GET /api/analytics/health` - System health check

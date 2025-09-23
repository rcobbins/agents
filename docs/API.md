# Agent Framework API Documentation

## Overview

The Agent Framework provides both CLI and programmatic APIs for managing multi-agent systems. This document covers the complete API surface including message passing, status tracking, and web UI integration.

## Core APIs

### Message Passing API

#### send_message
Sends a message from one agent to another.

```bash
send_message "recipient" "type" "content"
```

Parameters:
- `recipient`: Target agent ID (coordinator|planner|tester|coder|reviewer)
- `type`: Message type (task|response|status|error)
- `content`: JSON-encoded message content

Returns: Message ID (UUID)

#### read_messages
Reads pending messages for an agent.

```bash
read_messages "agent_id" ["message_type"]
```

Parameters:
- `agent_id`: Agent identifier
- `message_type`: Optional filter by type

Returns: Array of message objects

### Status Tracking API

#### update_status
Updates agent or task status.

```bash
update_status "agent_id" "status" ["details"]
```

Parameters:
- `agent_id`: Agent identifier
- `status`: Status value (idle|busy|error|complete)
- `details`: Optional JSON details

#### get_status
Retrieves current status of agent or task.

```bash
get_status "agent_id"
```

Returns: Status object with timestamp and details

### Context Management API

#### load_project_context
Loads project configuration and documentation.

```bash
load_project_context "project_path"
```

Returns: Context object containing:
- Project specification
- Goals
- Tech stack
- Testing strategy
- Architecture

#### update_project_goals
Updates project goals and metrics.

```bash
update_project_goals "project_path" "goals_json"
```

### Agent Control API

#### launch_agent
Starts an agent process.

```bash
launch_agent "agent_type" "project_path" ["config_overrides"]
```

Parameters:
- `agent_type`: Type of agent to launch
- `project_path`: Path to project
- `config_overrides`: Optional configuration

Returns: Agent process ID

#### stop_agent
Gracefully stops an agent.

```bash
stop_agent "agent_id"
```

#### restart_agent
Restarts an agent with optional new configuration.

```bash
restart_agent "agent_id" ["new_config"]
```

## Web UI API

### REST Endpoints

#### GET /api/projects
Lists all configured projects.

Response:
```json
{
  "projects": [
    {
      "id": "project-uuid",
      "name": "Project Name",
      "path": "/path/to/project",
      "status": "active|inactive",
      "agents": ["coordinator", "planner"]
    }
  ]
}
```

#### POST /api/projects
Creates new project configuration.

Request:
```json
{
  "name": "Project Name",
  "path": "/path/to/project",
  "description": "Project description"
}
```

#### GET /api/projects/:id/agents
Gets status of all agents for a project.

Response:
```json
{
  "agents": [
    {
      "id": "coordinator",
      "status": "running",
      "lastActivity": "2024-01-01T00:00:00Z",
      "messagesQueued": 5
    }
  ]
}
```

#### POST /api/projects/:id/agents/:agentId/launch
Launches a specific agent.

Request:
```json
{
  "config": {
    "debug": true,
    "timeout": 300
  }
}
```

#### GET /api/projects/:id/messages
Retrieves message history.

Query Parameters:
- `agent`: Filter by agent
- `type`: Filter by message type
- `since`: Timestamp for messages after
- `limit`: Maximum messages to return

#### POST /api/projects/:id/goals
Updates project goals.

Request:
```json
{
  "goals": [
    {
      "id": "goal-1",
      "description": "Implement feature X",
      "status": "in-progress",
      "metrics": {}
    }
  ]
}
```

### WebSocket Events

#### Connection
```javascript
socket.connect({
  projectId: 'project-uuid',
  auth: 'token'
});
```

#### Agent Status Updates
```javascript
socket.on('agent:status', (data) => {
  // data.agentId
  // data.status
  // data.timestamp
});
```

#### Message Flow
```javascript
socket.on('message:sent', (data) => {
  // data.from
  // data.to
  // data.type
  // data.content
});

socket.on('message:received', (data) => {
  // data.agentId
  // data.message
});
```

#### Goal Progress
```javascript
socket.on('goal:progress', (data) => {
  // data.goalId
  // data.progress
  // data.details
});
```

#### Error Events
```javascript
socket.on('error', (data) => {
  // data.agentId
  // data.error
  // data.stack
});
```

## CLI Commands

### Project Management
```bash
# Initialize new project
agent-framework init <project-path>

# Validate project setup
agent-framework validate <project-path>

# List projects
agent-framework list
```

### Agent Control
```bash
# Launch all agents
agent-framework launch <project-path>

# Launch specific agent
agent-framework launch <project-path> --agent <agent-type>

# Stop agents
agent-framework stop <project-path>

# Monitor agents
agent-framework monitor <project-path>
```

### Message Operations
```bash
# Send message to agent
agent-framework message <agent-id> <type> <content>

# View message queue
agent-framework queue <agent-id>

# Clear message queue
agent-framework clear-queue <agent-id>
```

### Status Operations
```bash
# Get project status
agent-framework status <project-path>

# Get agent status
agent-framework status <project-path> --agent <agent-id>

# Get detailed logs
agent-framework logs <project-path> [--agent <agent-id>]
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| E001 | Project not initialized | Run `agent-framework init` |
| E002 | Agent not found | Check agent type is valid |
| E003 | Message queue full | Process pending messages |
| E004 | Invalid configuration | Check config syntax |
| E005 | Agent crash | Check logs for details |
| E006 | Permission denied | Check file permissions |
| E007 | Port already in use | Change port in config |
| E008 | Database connection failed | Check database settings |

## Rate Limits

- Message sending: 100/minute per agent
- Status updates: 10/second per agent
- API requests: 1000/minute per project
- WebSocket connections: 100 concurrent per project

## Authentication

### API Key Authentication
```bash
curl -H "X-API-Key: your-key" http://localhost:3001/api/projects
```

### WebSocket Authentication
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-auth-token'
  }
});
```

## Versioning

The API follows semantic versioning. Current version: 1.0.0

- Major version: Breaking changes
- Minor version: New features, backwards compatible
- Patch version: Bug fixes

## Support

For API support and bug reports:
- GitHub Issues: https://github.com/your-org/agent-framework
- Documentation: https://docs.agent-framework.io
- Community: https://discord.gg/agent-framework
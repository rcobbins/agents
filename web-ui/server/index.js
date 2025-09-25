const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import modules
const ProjectManager = require('./modules/ProjectManager');
const IntegratedAgentManager = require('./modules/IntegratedAgentManager'); // Using integrated agents to avoid spawn issues
const InMemoryMessageQueue = require('./agents/InMemoryMessageQueue');
const MessageBroker = require('./modules/MessageBroker');
const FileWatcher = require('./modules/FileWatcher');
const Logger = require('./modules/Logger');
const TaskManager = require('./modules/TaskManager');
const ChangeTracker = require('./modules/ChangeTracker');
const TestRunner = require('./modules/TestRunner');
const MetricsCollector = require('./modules/MetricsCollector');
const GoalProcessor = require('./modules/GoalProcessor');

// Import routes
const projectRoutes = require('./routes/projects');
const agentRoutes = require('./routes/agents');
const messageRoutes = require('./routes/messages');
const statusRoutes = require('./routes/status');
const assistantRoutes = require('./routes/assistant');
const taskRoutes = require('./routes/tasks');
const flowsRoutes = require('./routes/flows');
const changesRoutes = require('./routes/changes');
const testsRoutes = require('./routes/tests');
const analyticsRoutes = require('./routes/analytics');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Initialize managers
const logger = new Logger();
const projectManager = new ProjectManager(logger);

// Initialize integrated agent system
const messageQueue = new InMemoryMessageQueue();
const agentLauncher = new IntegratedAgentManager(logger);
agentLauncher.setMessageQueue(messageQueue);

// Link managers together
projectManager.setAgentManager(agentLauncher);

// Forward agent events to WebSocket clients
agentLauncher.on('agentLog', (data) => {
  // Broadcast to all clients in the project room
  io.to(`project:${data.projectId}`).emit('agent:log', {
    agentId: data.agentId,
    message: data.message,
    timestamp: data.log?.timestamp || new Date().toISOString()
  });
});

agentLauncher.on('agentStatus', (data) => {
  const [projectId, agentId] = data.agentKey.split(':');
  // Extract string status if it's an object
  const status = typeof data.status === 'object' && data.status.status ? data.status.status : data.status;
  io.to(`project:${projectId}`).emit('agent:status', {
    agentId: agentId,
    status: status
  });
});

// Process goals when coordinator starts
agentLauncher.on('agentStarted', async ({ agentKey, agentType, projectId }) => {
  if (agentType === 'coordinator') {
    logger.info(`Coordinator started for project ${projectId}, processing goals...`);
    
    // Get project from projectManager
    const project = projectManager.projects.get(projectId);
    if (project) {
      const goalsPath = path.join(
        project.path.replace('~', process.env.HOME),
        '.agents/docs/GOALS.json'
      );
      
      try {
        // Check if goals file exists
        await fs.promises.access(goalsPath);
        
        // Process goals into tasks
        const tasks = await goalProcessor.processProjectGoals(projectId, goalsPath);
        logger.info(`Created ${tasks.length} tasks from goals for project ${projectId}`);
        
        // Notify coordinator about new tasks
        if (tasks.length > 0) {
          const agentInfo = agentLauncher.agents.get(agentKey);
          if (agentInfo && agentInfo.agent) {
            // Trigger task distribution
            setTimeout(() => {
              if (typeof agentInfo.agent.distributeTasks === 'function') {
                agentInfo.agent.distributeTasks();
              }
            }, 1000);
          }
        }
      } catch (error) {
        logger.error(`Failed to process goals for project ${projectId}: ${error.message}`);
      }
    }
  }
});

// Forward enhanced agent events to WebSocket clients
agentLauncher.on('agentThought', (data) => {
  io.to(`project:${data.projectId}`).emit('agent:thought', data);
});

agentLauncher.on('agentDecision', (data) => {
  io.to(`project:${data.projectId}`).emit('agent:decision', data);
});

agentLauncher.on('agentPlanning', (data) => {
  io.to(`project:${data.projectId}`).emit('agent:planning', data);
});

agentLauncher.on('agentFileOperation', (data) => {
  io.to(`project:${data.projectId}`).emit('agent:fileOperation', data);
});

agentLauncher.on('taskStateChange', (data) => {
  io.to(`project:${data.projectId}`).emit('task:stateChange', data);
});

agentLauncher.on('interAgentMessage', (data) => {
  io.to(`project:${data.projectId}`).emit('agent:message', data);
});

agentLauncher.on('testExecution', (data) => {
  io.to(`project:${data.projectId}`).emit('test:execution', data);
});

agentLauncher.on('codeReview', (data) => {
  io.to(`project:${data.projectId}`).emit('code:review', data);
});

const messageBroker = new MessageBroker(logger);
const fileWatcher = new FileWatcher(logger);
const taskManager = new TaskManager(logger);
const changeTracker = new ChangeTracker(logger);
const testRunner = new TestRunner(logger);
const metricsCollector = new MetricsCollector(logger, {
  agentManager: agentLauncher,
  taskManager,
  testRunner,
  changeTracker,
  messageQueue,
  autoStart: true
});

// Create goal processor
const goalProcessor = new GoalProcessor(taskManager, logger);

// Connect TaskManager to agents and message queue (must be after taskManager is created)
agentLauncher.setTaskManager(taskManager);
messageQueue.setTaskManager(taskManager);

// Forward task events to WebSocket clients
taskManager.on('task:created', (task) => {
  io.to(`project:${task.projectId}`).emit('task:created', task);
});

taskManager.on('task:statusChanged', (data) => {
  io.to(`project:${data.task.projectId}`).emit('task:statusChanged', data);
});

taskManager.on('task:assigned', (data) => {
  io.to(`project:${data.task.projectId}`).emit('task:assigned', data);
});

taskManager.on('task:blocked', (data) => {
  io.to(`project:${data.task.projectId}`).emit('task:blocked', data);
});

taskManager.on('task:unblocked', (data) => {
  io.to(`project:${data.task.projectId}`).emit('task:unblocked', data);
});

// Forward message flow events to WebSocket clients
messageQueue.on('flow:update', (data) => {
  // Broadcast to all clients (flows are global, not project-specific)
  io.emit('flow:update', data);
});

messageQueue.on('agent:idle', (data) => {
  io.emit('agent:activity', { ...data, status: 'idle' });
});

// Forward change tracker events to WebSocket clients
changeTracker.on('change:tracked', (change) => {
  io.emit('change:tracked', change);
});

changeTracker.on('change:completed', (change) => {
  io.emit('change:completed', change);
});

changeTracker.on('change:reverted', (change) => {
  io.emit('change:reverted', change);
});

changeTracker.on('change:failed', (change) => {
  io.emit('change:failed', change);
});

// Forward test runner events to WebSocket clients
testRunner.on('test:started', (testRun) => {
  io.emit('test:started', testRun);
});

testRunner.on('test:completed', (testRun) => {
  io.emit('test:completed', testRun);
});

testRunner.on('test:error', (data) => {
  io.emit('test:error', data);
});

testRunner.on('test:output', (data) => {
  io.emit('test:output', data);
});

// Forward metrics collector events to WebSocket clients
metricsCollector.on('metrics:snapshot', (snapshot) => {
  io.emit('metrics:snapshot', snapshot);
});

metricsCollector.on('insight:generated', (insight) => {
  io.emit('insight:generated', insight);
});

// Make managers available to routes
app.locals.projectManager = projectManager;
app.locals.agentManager = agentLauncher; // Keep the same name for compatibility
app.locals.agentLauncher = agentLauncher;
app.locals.messageBroker = messageBroker;
app.locals.messageQueue = messageQueue; // Expose the in-memory queue
app.locals.taskManager = taskManager;
app.locals.changeTracker = changeTracker;
app.locals.testRunner = testRunner;
app.locals.metricsCollector = metricsCollector;
app.locals.io = io;

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Agent Framework Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      projects: '/api/projects',
      agents: '/api/agents',
      messages: '/api/messages',
      status: '/api/status',
      assistant: '/api/assistant'
    },
    websocket: 'Connect via Socket.IO for real-time updates',
    documentation: 'https://github.com/rcobbins/agents'
  });
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/changes', changesRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);
  
  // Join project room
  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
    logger.info(`Client ${socket.id} joined project: ${projectId}`);
    
    // Send initial state
    const projectState = projectManager.getProjectState(projectId);
    socket.emit('project:state', projectState);
  });
  
  // Leave project room
  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
    logger.info(`Client ${socket.id} left project: ${projectId}`);
  });
  
  // Agent control
  socket.on('agent:launch', async (data) => {
    try {
      const result = await agentLauncher.launchAgent(data.projectId, data.agentType, data.config);
      socket.emit('agent:launched', result);
      io.to(`project:${data.projectId}`).emit('agent:status', {
        agentId: data.agentType,
        status: 'running'
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  socket.on('agent:stop', async (data) => {
    try {
      await agentLauncher.stopAgent(data.projectId, data.agentId);
      io.to(`project:${data.projectId}`).emit('agent:status', {
        agentId: data.agentId,
        status: 'stopped'
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Message handling
  socket.on('message:send', async (data) => {
    try {
      const messageId = await messageBroker.sendMessage(
        data.projectId,
        data.from,
        data.to,
        data.type,
        data.content
      );
      
      io.to(`project:${data.projectId}`).emit('message:sent', {
        id: messageId,
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Goal updates
  socket.on('goal:update', async (data) => {
    try {
      await projectManager.updateGoal(data.projectId, data.goalId, data.update);
      io.to(`project:${data.projectId}`).emit('goal:updated', data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // File watching
  socket.on('watch:start', (data) => {
    fileWatcher.watchProject(data.projectId, data.path, (event, file) => {
      io.to(`project:${data.projectId}`).emit('file:changed', {
        event,
        file,
        timestamp: new Date().toISOString()
      });
    });
  });
  
  socket.on('watch:stop', (data) => {
    fileWatcher.unwatchProject(data.projectId);
  });
  
  // Disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
server.listen(PORT, HOST, () => {
  logger.info(`Agent Framework server running at http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize default watchers
  fileWatcher.initializeDefaultWatchers();
  
  // Start agent health checks
  // Start health checks if available
  if (typeof agentLauncher.startHealthChecks === 'function') {
    agentLauncher.startHealthChecks();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    agentLauncher.stopAllAgents();
    fileWatcher.stopAllWatchers();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    agentLauncher.stopAllAgents();
    fileWatcher.stopAllWatchers();
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
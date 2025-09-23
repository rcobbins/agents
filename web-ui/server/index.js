const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import modules
const ProjectManager = require('./modules/ProjectManager');
const AgentManager = require('./modules/AgentManager');
const MessageBroker = require('./modules/MessageBroker');
const FileWatcher = require('./modules/FileWatcher');
const Logger = require('./modules/Logger');

// Import routes
const projectRoutes = require('./routes/projects');
const agentRoutes = require('./routes/agents');
const messageRoutes = require('./routes/messages');
const statusRoutes = require('./routes/status');

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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Initialize managers
const logger = new Logger();
const projectManager = new ProjectManager(logger);
const agentManager = new AgentManager(logger);
const messageBroker = new MessageBroker(logger);
const fileWatcher = new FileWatcher(logger);

// Make managers available to routes
app.locals.projectManager = projectManager;
app.locals.agentManager = agentManager;
app.locals.messageBroker = messageBroker;
app.locals.io = io;

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/status', statusRoutes);

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
      const result = await agentManager.launchAgent(data.projectId, data.agentType, data.config);
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
      await agentManager.stopAgent(data.projectId, data.agentId);
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
  agentManager.startHealthChecks();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    agentManager.stopAllAgents();
    fileWatcher.stopAllWatchers();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    agentManager.stopAllAgents();
    fileWatcher.stopAllWatchers();
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
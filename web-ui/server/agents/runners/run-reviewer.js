#!/usr/bin/env node

/**
 * Runner script for Reviewer Agent
 * This script is forked by AgentLauncher
 */

const ReviewerAgent = require('../ReviewerAgent');

// Get configuration from environment variables
const projectPath = process.env.PROJECT_PATH || process.cwd();
const projectId = process.env.PROJECT_ID;
const debug = process.env.DEBUG === 'true';

// Create and initialize agent
const agent = new ReviewerAgent(projectPath);

// Set up IPC communication with parent process
if (process.send) {
  // Forward logs to parent via IPC
  agent.on('log', (data) => {
    process.send({ type: 'log', ...data });
  });
  
  // Forward status updates
  agent.on('statusUpdated', (status) => {
    process.send({ type: 'status', status });
  });
  
  // Send heartbeat every 30 seconds
  setInterval(() => {
    process.send({ type: 'heartbeat', timestamp: new Date().toISOString() });
  }, 30000);
}

// Handle messages from parent process
process.on('message', (message) => {
  console.log('Received IPC message:', message);
  
  if (message.type === 'shutdown') {
    agent.shutdown();
  }
});

// Set up signal handlers
agent.setupSignalHandlers();

// Start the agent
async function start() {
  try {
    console.log(`Starting Reviewer Agent for project ${projectId}`);
    console.log(`Project path: ${projectPath}`);
    console.log(`Debug mode: ${debug}`);
    
    await agent.initialize();
    await agent.runEventLoop();
    
    console.log('Reviewer Agent started successfully');
    
    if (process.send) {
      process.send({
        type: 'status',
        status: {
          state: 'running',
          message: 'Agent initialized and running'
        }
      });
    }
  } catch (error) {
    console.error('Failed to start Reviewer Agent:', error);
    
    if (process.send) {
      process.send({
        type: 'error',
        error: error.message
      });
    }
    
    process.exit(1);
  }
}

// Start the agent
start();
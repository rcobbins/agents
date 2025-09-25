const express = require('express');
const router = express.Router();

// GET agent logs
router.get('/:projectId/:agentId/logs', async (req, res) => {
  try {
    const logs = await req.app.locals.agentManager.getAgentLogs(
      req.params.projectId,
      req.params.agentId,
      req.query.lines || 50
    );
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST restart agent
router.post('/:projectId/:agentId/restart', async (req, res) => {
  try {
    const result = await req.app.locals.agentManager.restartAgent(
      req.params.projectId,
      req.params.agentId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST send direct message to agent
router.post('/:projectId/:agentId/message', async (req, res) => {
  try {
    const { projectId, agentId } = req.params;
    const { content, type, priority } = req.body;
    
    const messageQueue = req.app.locals.messageQueue;
    if (!messageQueue) {
      return res.status(500).json({ error: 'Message queue not available' });
    }
    
    // Create the message
    const message = {
      from: 'user',
      type: type || 'user_intervention',
      content: content,
      metadata: {
        source: 'web_ui',
        timestamp: new Date().toISOString()
      }
    };
    
    // Send with specified priority
    let messageId;
    if (priority === 'critical') {
      messageId = messageQueue.sendCritical(agentId, message);
    } else if (priority === 'high') {
      messageId = messageQueue.sendPriority(agentId, message, 'high');
    } else {
      messageId = messageQueue.send(agentId, message, { priority: priority || 'normal' });
    }
    
    // Emit WebSocket event for real-time feedback
    const io = req.app.locals.io;
    if (io) {
      io.to(`project:${projectId}`).emit('user:message', {
        agentId,
        messageId,
        content,
        priority,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true,
      messageId,
      delivered: true 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
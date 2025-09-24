const express = require('express');
const router = express.Router();
const ClaudeAssistant = require('../modules/ClaudeAssistant');

// Initialize Claude Assistant
let assistantInstance = null;

// POST - Process message with Claude
router.post('/message', async (req, res) => {
  try {
    // Initialize assistant if not already done
    if (!assistantInstance) {
      const logger = req.app.locals.logger;
      assistantInstance = new ClaudeAssistant(logger);
      
      // Check if Claude CLI is available
      const isAvailable = await assistantInstance.isAvailable();
      if (!isAvailable) {
        logger.warn('Claude CLI not available, using fallback responses');
      }
    }
    
    const { message, context } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }
    
    // Process message with Claude
    const response = await assistantInstance.processMessage(message, context);
    
    // Return response
    res.json({
      content: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      fallback: 'I apologize, but I\'m having trouble processing your request. Please try again or continue with your project setup.'
    });
  }
});

// GET - Check assistant availability
router.get('/status', async (req, res) => {
  try {
    if (!assistantInstance) {
      const logger = req.app.locals.logger;
      assistantInstance = new ClaudeAssistant(logger);
    }
    
    const isAvailable = await assistantInstance.isAvailable();
    
    res.json({
      available: isAvailable,
      backend: isAvailable ? 'claude-cli' : 'fallback',
      message: isAvailable 
        ? 'Claude CLI is available and ready'
        : 'Using fallback responses (Claude CLI not found)'
    });
    
  } catch (error) {
    res.status(500).json({
      available: false,
      backend: 'error',
      error: error.message
    });
  }
});

module.exports = router;
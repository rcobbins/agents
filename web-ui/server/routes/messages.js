const express = require('express');
const router = express.Router();

// POST send message
router.post('/send', async (req, res) => {
  try {
    const messageId = await req.app.locals.messageBroker.sendMessage(
      req.body.projectId,
      req.body.from,
      req.body.to,
      req.body.type,
      req.body.content
    );
    res.json({ messageId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET messages for agent
router.get('/:projectId/:agentId', async (req, res) => {
  try {
    const messages = await req.app.locals.messageBroker.readMessages(
      req.params.projectId,
      req.params.agentId,
      req.query.type
    );
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE consume message
router.delete('/:projectId/:agentId/:messageId', async (req, res) => {
  try {
    const message = await req.app.locals.messageBroker.consumeMessage(
      req.params.projectId,
      req.params.agentId,
      req.params.messageId
    );
    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET queue status
router.get('/:projectId/status', async (req, res) => {
  try {
    const status = req.app.locals.messageBroker.getQueueStatus(req.params.projectId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE clear queue
router.delete('/:projectId/clear', async (req, res) => {
  try {
    req.app.locals.messageBroker.clearQueue(
      req.params.projectId,
      req.query.agentId
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
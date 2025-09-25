const express = require('express');
const router = express.Router();

// GET message flow data for visualization
router.get('/', async (req, res) => {
  try {
    const messageQueue = req.app.locals.messageQueue;
    const flowData = messageQueue.getFlowData();
    res.json(flowData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET flow statistics for a time range
router.get('/stats', async (req, res) => {
  try {
    const { since = new Date(Date.now() - 3600000).toISOString() } = req.query;
    const messageQueue = req.app.locals.messageQueue;
    const stats = messageQueue.getFlowStatsByTime(since);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET message history with filters
router.get('/history', async (req, res) => {
  try {
    const { from, to, type, since, limit = 100 } = req.query;
    const messageQueue = req.app.locals.messageQueue;
    const history = messageQueue.getHistory({
      from,
      to,
      type,
      since,
      limit: parseInt(limit)
    });
    res.json({ messages: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE clear flow data
router.delete('/', async (req, res) => {
  try {
    const messageQueue = req.app.locals.messageQueue;
    messageQueue.clearFlowData();
    res.json({ success: true, message: 'Flow data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
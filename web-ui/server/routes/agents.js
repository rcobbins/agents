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

module.exports = router;
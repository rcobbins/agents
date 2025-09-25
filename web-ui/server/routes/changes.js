const express = require('express');
const router = express.Router();

// GET all changes with filters
router.get('/', async (req, res) => {
  try {
    const { status, operation, agentId, limit = 100 } = req.query;
    const changeTracker = req.app.locals.changeTracker;
    
    let changes;
    if (agentId) {
      changes = changeTracker.getAgentChanges(agentId, { status, operation, limit: parseInt(limit) });
    } else if (status) {
      changes = changeTracker.getChangesByStatus(status);
    } else {
      changes = changeTracker.getRecentChanges(parseInt(limit));
    }
    
    res.json({ changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET changes for a specific file
router.get('/file', async (req, res) => {
  try {
    const { path: filePath, limit = 50 } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const changeTracker = req.app.locals.changeTracker;
    const changes = changeTracker.getFileChanges(filePath, { limit: parseInt(limit) });
    
    res.json({ changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET changes by agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { status, operation, since, limit = 50 } = req.query;
    const changeTracker = req.app.locals.changeTracker;
    
    const changes = changeTracker.getAgentChanges(req.params.agentId, {
      status,
      operation,
      since,
      limit: parseInt(limit)
    });
    
    res.json({ changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET specific change
router.get('/:changeId', async (req, res) => {
  try {
    const changeTracker = req.app.locals.changeTracker;
    const change = changeTracker.getChange(req.params.changeId);
    
    if (!change) {
      return res.status(404).json({ error: 'Change not found' });
    }
    
    res.json(change);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST track a new change
router.post('/track', async (req, res) => {
  try {
    const { agentId, filePath, operation, taskId } = req.body;
    
    if (!agentId || !filePath || !operation) {
      return res.status(400).json({ 
        error: 'agentId, filePath, and operation are required' 
      });
    }
    
    const changeTracker = req.app.locals.changeTracker;
    const change = await changeTracker.trackChange(agentId, filePath, operation, taskId);
    
    res.status(201).json(change);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST complete a tracked change
router.post('/:changeId/complete', async (req, res) => {
  try {
    const { afterContent } = req.body;
    const changeTracker = req.app.locals.changeTracker;
    
    const change = await changeTracker.completeChange(req.params.changeId, afterContent);
    
    res.json(change);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST revert a change
router.post('/:changeId/revert', async (req, res) => {
  try {
    const changeTracker = req.app.locals.changeTracker;
    const change = await changeTracker.revertChange(req.params.changeId);
    
    res.json(change);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET change statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const changeTracker = req.app.locals.changeTracker;
    const stats = changeTracker.getStats();
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE clear old changes
router.delete('/cleanup', async (req, res) => {
  try {
    const { hoursOld = 24 } = req.body;
    const changeTracker = req.app.locals.changeTracker;
    
    const removed = changeTracker.clearOldChanges(hoursOld);
    
    res.json({ 
      removed, 
      message: `Removed ${removed} changes older than ${hoursOld} hours` 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();

// GET all tasks for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = req.app.locals.taskManager.getProjectTasks(req.params.projectId);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tasks by status
router.get('/status/:status', async (req, res) => {
  try {
    const tasks = req.app.locals.taskManager.getTasksByStatus(req.params.status);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET tasks by agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const tasks = req.app.locals.taskManager.getTasksByAgent(req.params.agentId);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET specific task
router.get('/:taskId', async (req, res) => {
  try {
    const task = req.app.locals.taskManager.tasks.get(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new task
router.post('/', async (req, res) => {
  try {
    const task = req.app.locals.taskManager.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update task status
router.put('/:taskId/status', async (req, res) => {
  try {
    const { status, details } = req.body;
    const task = req.app.locals.taskManager.updateTaskStatus(
      req.params.taskId,
      status,
      details
    );
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT assign task to agent
router.put('/:taskId/assign', async (req, res) => {
  try {
    const { agentId } = req.body;
    const task = req.app.locals.taskManager.assignTask(
      req.params.taskId,
      agentId
    );
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST add blocker
router.post('/:taskId/blockers', async (req, res) => {
  try {
    const task = req.app.locals.taskManager.addBlocker(
      req.params.taskId,
      req.body
    );
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE remove blocker
router.delete('/:taskId/blockers/:blockerId', async (req, res) => {
  try {
    const task = req.app.locals.taskManager.removeBlocker(
      req.params.taskId,
      req.params.blockerId
    );
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET task dependencies
router.get('/:taskId/dependencies', async (req, res) => {
  try {
    const dependencies = req.app.locals.taskManager.getTaskDependencies(req.params.taskId);
    res.json({ dependencies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET queue metrics
router.get('/metrics/:projectId?', async (req, res) => {
  try {
    const metrics = req.app.locals.taskManager.getMetrics(req.params.projectId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST clear old completed tasks
router.post('/cleanup', async (req, res) => {
  try {
    const { hoursOld = 24 } = req.body;
    const removed = req.app.locals.taskManager.clearOldCompletedTasks(hoursOld);
    res.json({ removed, message: `Removed ${removed} completed tasks older than ${hoursOld} hours` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE remove specific task
router.delete('/:taskId', async (req, res) => {
  try {
    req.app.locals.taskManager.removeTask(req.params.taskId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();

// GET test runs for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { limit = 50, status, suite } = req.query;
    const testRunner = req.app.locals.testRunner;
    
    const runs = testRunner.getProjectTestRuns(req.params.projectId, {
      limit: parseInt(limit),
      status,
      suite
    });
    
    res.json({ runs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET specific test run
router.get('/run/:testRunId', async (req, res) => {
  try {
    const testRunner = req.app.locals.testRunner;
    const run = testRunner.getTestRun(req.params.testRunId);
    
    if (!run) {
      return res.status(404).json({ error: 'Test run not found' });
    }
    
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST run tests
router.post('/run', async (req, res) => {
  try {
    const { projectId, testCommand, suite, agentId, workingDir } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    
    const testRunner = req.app.locals.testRunner;
    const testRun = await testRunner.runTests(projectId, {
      testCommand,
      suite,
      agentId,
      workingDir
    });
    
    res.status(201).json(testRun);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET test statistics
router.get('/stats/:projectId?', async (req, res) => {
  try {
    const testRunner = req.app.locals.testRunner;
    const stats = testRunner.getStatistics(req.params.projectId);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET coverage trends
router.get('/coverage/:projectId', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const testRunner = req.app.locals.testRunner;
    
    const trends = testRunner.getCoverageTrends(
      req.params.projectId, 
      parseInt(limit)
    );
    
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE clear old test runs
router.delete('/cleanup', async (req, res) => {
  try {
    const { hoursOld = 24 } = req.body;
    const testRunner = req.app.locals.testRunner;
    
    const removed = testRunner.clearOldTestRuns(hoursOld);
    
    res.json({ 
      removed, 
      message: `Removed ${removed} test runs older than ${hoursOld} hours` 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
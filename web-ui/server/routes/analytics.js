const express = require('express');
const router = express.Router();

// GET current metrics snapshot
router.get('/metrics/current', async (req, res) => {
  try {
    const metricsCollector = req.app.locals.metricsCollector;
    const metrics = metricsCollector.getCurrentMetrics();
    
    if (!metrics) {
      // Collect fresh metrics if none available
      const freshMetrics = await metricsCollector.collect();
      return res.json(freshMetrics);
    }
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET metrics history
router.get('/metrics/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const metricsCollector = req.app.locals.metricsCollector;
    
    const history = metricsCollector.getHistory(parseInt(limit));
    
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET aggregated metrics
router.get('/metrics/aggregated', async (req, res) => {
  try {
    const metricsCollector = req.app.locals.metricsCollector;
    const aggregated = metricsCollector.getAggregatedMetrics();
    
    res.json(aggregated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET metric trends
router.get('/metrics/trend/:metricPath', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const metricsCollector = req.app.locals.metricsCollector;
    
    const trend = metricsCollector.getTrend(
      req.params.metricPath,
      parseInt(limit)
    );
    
    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET patterns
router.get('/patterns', async (req, res) => {
  try {
    const metricsCollector = req.app.locals.metricsCollector;
    const patterns = metricsCollector.getPatterns();
    
    res.json(patterns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET insights
router.get('/insights', async (req, res) => {
  try {
    const { category } = req.query;
    const metricsCollector = req.app.locals.metricsCollector;
    
    const insights = metricsCollector.getInsights(category);
    
    res.json({ insights });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST trigger metrics collection
router.post('/metrics/collect', async (req, res) => {
  try {
    const metricsCollector = req.app.locals.metricsCollector;
    const metrics = await metricsCollector.collect();
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET system health
router.get('/health', async (req, res) => {
  try {
    const metricsCollector = req.app.locals.metricsCollector;
    const current = metricsCollector.getCurrentMetrics();
    
    if (!current) {
      return res.json({
        status: 'unknown',
        message: 'No metrics available'
      });
    }
    
    // Determine health based on metrics
    let status = 'healthy';
    const issues = [];
    
    // Check agent health
    if (current.agents && current.agents.errorAgents > 0) {
      if (current.agents.errorAgents > current.agents.totalAgents * 0.5) {
        status = 'critical';
        issues.push('More than 50% of agents in error state');
      } else {
        status = 'degraded';
        issues.push(`${current.agents.errorAgents} agents in error state`);
      }
    }
    
    // Check task queue
    if (current.tasks && current.tasks.blockedTasks > 10) {
      status = status === 'critical' ? 'critical' : 'degraded';
      issues.push(`${current.tasks.blockedTasks} tasks blocked`);
    }
    
    // Check test success rate
    if (current.tests && current.tests.successRate < 50) {
      status = status === 'critical' ? 'critical' : 'degraded';
      issues.push(`Test success rate only ${current.tests.successRate.toFixed(1)}%`);
    }
    
    // Check system resources
    if (current.system) {
      const memUsagePercent = (current.system.memoryUsage.heapUsed / 
                              current.system.memoryUsage.heapTotal) * 100;
      if (memUsagePercent > 90) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push(`Memory usage at ${memUsagePercent.toFixed(1)}%`);
      }
    }
    
    res.json({
      status,
      issues,
      timestamp: current.timestamp,
      metrics: {
        agents: {
          running: current.agents?.runningAgents || 0,
          total: current.agents?.totalAgents || 0
        },
        tasks: {
          pending: current.tasks?.pendingTasks || 0,
          inProgress: current.tasks?.inProgressTasks || 0
        },
        tests: {
          successRate: current.tests?.successRate || 0
        },
        system: {
          uptime: current.system?.uptime || 0,
          memoryUsage: current.system?.memoryUsage || {}
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
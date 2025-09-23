const express = require('express');
const router = express.Router();
const os = require('os');

// GET system status
router.get('/system', (req, res) => {
  res.json({
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    nodeVersion: process.version,
    processUptime: process.uptime()
  });
});

// GET framework status
router.get('/framework', (req, res) => {
  const watchers = req.app.locals.fileWatcher.getWatcherStatus();
  
  res.json({
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    watchers: watchers.length,
    activeProjects: req.app.locals.projectManager.getAllProjects().length
  });
});

module.exports = router;
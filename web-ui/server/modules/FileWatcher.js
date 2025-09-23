const chokidar = require('chokidar');
const path = require('path');

class FileWatcher {
  constructor(logger) {
    this.logger = logger;
    this.watchers = new Map();
  }

  watchProject(projectId, projectPath, callback) {
    // Stop existing watcher if any
    if (this.watchers.has(projectId)) {
      this.unwatchProject(projectId);
    }

    const watcher = chokidar.watch(projectPath, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        /node_modules/,
        /\.git/,
        /__pycache__/,
        /\.pyc$/,
        /\.log$/
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    watcher
      .on('add', (filePath) => {
        this.logger.info(`File added: ${filePath}`);
        callback('add', this.getFileInfo(filePath, projectPath));
      })
      .on('change', (filePath) => {
        this.logger.info(`File changed: ${filePath}`);
        callback('change', this.getFileInfo(filePath, projectPath));
      })
      .on('unlink', (filePath) => {
        this.logger.info(`File removed: ${filePath}`);
        callback('unlink', this.getFileInfo(filePath, projectPath));
      })
      .on('error', (error) => {
        this.logger.error(`Watcher error for project ${projectId}:`, error);
      });

    this.watchers.set(projectId, watcher);
    this.logger.info(`Started watching project: ${projectId} at ${projectPath}`);
  }

  unwatchProject(projectId) {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(projectId);
      this.logger.info(`Stopped watching project: ${projectId}`);
    }
  }

  getFileInfo(filePath, projectPath) {
    return {
      path: filePath,
      relativePath: path.relative(projectPath, filePath),
      name: path.basename(filePath),
      ext: path.extname(filePath),
      dir: path.dirname(filePath)
    };
  }

  initializeDefaultWatchers() {
    // Watch agent logs
    const frameworkDir = path.join(__dirname, '../../..');
    const logsDir = path.join(frameworkDir, '.agents', 'logs');
    
    const logWatcher = chokidar.watch(logsDir, {
      persistent: true,
      ignoreInitial: true
    });

    logWatcher
      .on('add', (filePath) => {
        this.logger.info(`New log file: ${path.basename(filePath)}`);
      })
      .on('change', (filePath) => {
        // Could emit to WebSocket for real-time log streaming
      });

    this.watchers.set('__logs__', logWatcher);
  }

  stopAllWatchers() {
    for (const [id, watcher] of this.watchers) {
      watcher.close();
      this.logger.info(`Stopped watcher: ${id}`);
    }
    this.watchers.clear();
  }

  getWatcherStatus() {
    const status = [];
    for (const [id, watcher] of this.watchers) {
      status.push({
        id,
        watching: watcher.getWatched()
      });
    }
    return status;
  }
}

module.exports = FileWatcher;
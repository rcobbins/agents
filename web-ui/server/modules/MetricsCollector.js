const EventEmitter = require('events');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * MetricsCollector - Collects and analyzes system-wide metrics
 */
class MetricsCollector extends EventEmitter {
  constructor(logger, options = {}) {
    super();
    this.logger = logger;
    
    // Dependencies
    this.agentManager = options.agentManager;
    this.taskManager = options.taskManager;
    this.testRunner = options.testRunner;
    this.changeTracker = options.changeTracker;
    this.messageQueue = options.messageQueue;
    
    // Time series data
    this.timeSeries = [];
    this.maxTimeSeriesSize = 1000;
    
    // Aggregated metrics
    this.aggregatedMetrics = {
      agents: {},
      tasks: {},
      tests: {},
      changes: {},
      messages: {},
      system: {}
    };
    
    // Pattern analysis
    this.patterns = {
      errorPatterns: new Map(),
      performancePatterns: new Map(),
      successPatterns: new Map()
    };
    
    // Insights
    this.insights = [];
    
    // Collection interval
    this.collectionInterval = null;
    this.collectionPeriod = options.collectionPeriod || 30000; // 30 seconds
    
    // Start collection
    if (options.autoStart !== false) {
      this.startCollection();
    }
  }
  
  /**
   * Start metrics collection
   */
  startCollection() {
    if (this.collectionInterval) {
      return;
    }
    
    this.collectionInterval = setInterval(() => {
      this.collect();
    }, this.collectionPeriod);
    
    // Collect immediately
    this.collect();
    
    this.logger.info('Metrics collection started');
  }
  
  /**
   * Stop metrics collection
   */
  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      this.logger.info('Metrics collection stopped');
    }
  }
  
  /**
   * Collect all metrics
   */
  async collect() {
    try {
      const snapshot = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        agents: await this.collectAgentMetrics(),
        tasks: this.collectTaskMetrics(),
        tests: this.collectTestMetrics(),
        changes: this.collectChangeMetrics(),
        messages: this.collectMessageMetrics(),
        system: this.collectSystemMetrics()
      };
      
      // Add to time series
      this.timeSeries.push(snapshot);
      if (this.timeSeries.length > this.maxTimeSeriesSize) {
        this.timeSeries.shift();
      }
      
      // Update aggregated metrics
      this.updateAggregatedMetrics(snapshot);
      
      // Analyze patterns
      this.analyzePatterns(snapshot);
      
      // Generate insights
      this.generateInsights(snapshot);
      
      // Emit snapshot
      this.emit('metrics:snapshot', snapshot);
      
      return snapshot;
    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
      return null;
    }
  }
  
  /**
   * Collect agent metrics
   */
  async collectAgentMetrics() {
    if (!this.agentManager) return {};
    
    const metrics = {
      totalAgents: 0,
      runningAgents: 0,
      stoppedAgents: 0,
      errorAgents: 0,
      agentDetails: {},
      totalMemoryUsage: 0,
      totalCpuUsage: 0,
      claudeTokensUsed: 0
    };
    
    // Get all agents
    const agents = this.agentManager.getAllAgents();
    
    for (const [agentKey, agentInfo] of agents) {
      metrics.totalAgents++;
      
      if (agentInfo.status === 'running') {
        metrics.runningAgents++;
      } else if (agentInfo.status === 'stopped') {
        metrics.stoppedAgents++;
      } else if (agentInfo.status === 'error') {
        metrics.errorAgents++;
      }
      
      // Get detailed metrics for each agent
      const agentMetrics = {
        status: agentInfo.status,
        uptime: agentInfo.uptime || 0,
        tasksCompleted: agentInfo.tasksCompleted || 0,
        messagesProcessed: agentInfo.messagesProcessed || 0,
        errorCount: agentInfo.errorCount || 0,
        lastActive: agentInfo.lastActive || null
      };
      
      // Estimate resource usage (would need actual process monitoring in production)
      if (agentInfo.status === 'running') {
        agentMetrics.memoryUsage = Math.random() * 100; // MB
        agentMetrics.cpuUsage = Math.random() * 25; // %
        metrics.totalMemoryUsage += agentMetrics.memoryUsage;
        metrics.totalCpuUsage += agentMetrics.cpuUsage;
      }
      
      // Track Claude token usage
      if (agentInfo.claudeTokensUsed) {
        metrics.claudeTokensUsed += agentInfo.claudeTokensUsed;
      }
      
      metrics.agentDetails[agentInfo.id] = agentMetrics;
    }
    
    return metrics;
  }
  
  /**
   * Collect task metrics
   */
  collectTaskMetrics() {
    if (!this.taskManager) return {};
    
    const metrics = this.taskManager.getMetrics();
    
    return {
      totalTasks: metrics.total || 0,
      pendingTasks: metrics.byStatus?.pending || 0,
      inProgressTasks: metrics.byStatus?.in_progress || 0,
      completedTasks: metrics.byStatus?.completed || 0,
      blockedTasks: metrics.byStatus?.blocked || 0,
      tasksByPriority: metrics.byPriority || {},
      averageCompletionTime: metrics.averageCompletionTime || 0,
      throughput: this.calculateThroughput('tasks')
    };
  }
  
  /**
   * Collect test metrics
   */
  collectTestMetrics() {
    if (!this.testRunner) return {};
    
    const stats = this.testRunner.getStatistics();
    
    return {
      totalRuns: stats.global.totalRuns,
      totalPassed: stats.global.totalPassed,
      totalFailed: stats.global.totalFailed,
      totalSkipped: stats.global.totalSkipped,
      averageDuration: stats.global.averageDuration,
      averageCoverage: stats.global.averageCoverage,
      failurePatterns: stats.failurePatterns || [],
      successRate: stats.global.totalRuns > 0 
        ? (stats.global.totalPassed / stats.global.totalRuns) * 100 
        : 0
    };
  }
  
  /**
   * Collect change metrics
   */
  collectChangeMetrics() {
    if (!this.changeTracker) return {};
    
    const stats = this.changeTracker.getStats();
    
    return {
      totalChanges: stats.totalChanges,
      appliedChanges: stats.appliedChanges,
      revertedChanges: stats.revertedChanges,
      pendingChanges: stats.pendingChanges,
      changesByType: stats.byType || {},
      recentChanges: stats.recentChanges || [],
      changeVelocity: this.calculateVelocity('changes')
    };
  }
  
  /**
   * Collect message metrics
   */
  collectMessageMetrics() {
    if (!this.messageQueue) return {};
    
    const stats = this.messageQueue.getStats();
    const flowData = this.messageQueue.getFlowData();
    
    return {
      totalMessagesSent: stats.global.totalMessagesSent,
      totalMessagesDelivered: stats.global.totalMessagesDelivered,
      totalMessagesDropped: stats.global.totalMessagesDropped,
      activeConnections: flowData.nodes.filter(n => n.status === 'active').length,
      messageFlows: flowData.edges.length,
      averageMessageSize: this.calculateAverageMessageSize(flowData),
      throughput: this.calculateThroughput('messages')
    };
  }
  
  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    return {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      platform: os.platform(),
      nodeVersion: process.version
    };
  }
  
  /**
   * Update aggregated metrics
   */
  updateAggregatedMetrics(snapshot) {
    // Update agent aggregates
    if (snapshot.agents) {
      this.aggregatedMetrics.agents = {
        ...this.aggregatedMetrics.agents,
        totalRunTime: (this.aggregatedMetrics.agents.totalRunTime || 0) + 
          snapshot.agents.runningAgents * (this.collectionPeriod / 1000),
        totalErrors: (this.aggregatedMetrics.agents.totalErrors || 0) + 
          snapshot.agents.errorAgents,
        peakConcurrentAgents: Math.max(
          this.aggregatedMetrics.agents.peakConcurrentAgents || 0,
          snapshot.agents.runningAgents
        )
      };
    }
    
    // Update task aggregates
    if (snapshot.tasks) {
      this.aggregatedMetrics.tasks = {
        ...this.aggregatedMetrics.tasks,
        totalCompleted: snapshot.tasks.completedTasks,
        totalBlocked: snapshot.tasks.blockedTasks,
        peakQueueSize: Math.max(
          this.aggregatedMetrics.tasks.peakQueueSize || 0,
          snapshot.tasks.pendingTasks
        )
      };
    }
    
    // Update test aggregates
    if (snapshot.tests) {
      this.aggregatedMetrics.tests = {
        ...this.aggregatedMetrics.tests,
        totalTestRuns: snapshot.tests.totalRuns,
        overallSuccessRate: snapshot.tests.successRate,
        totalCoverageRuns: snapshot.tests.averageCoverage ? 
          (this.aggregatedMetrics.tests.totalCoverageRuns || 0) + 1 : 
          this.aggregatedMetrics.tests.totalCoverageRuns || 0
      };
    }
  }
  
  /**
   * Analyze patterns in metrics
   */
  analyzePatterns(snapshot) {
    // Analyze error patterns
    if (snapshot.agents && snapshot.agents.errorAgents > 0) {
      this.trackPattern('errorPatterns', 'agent_errors', {
        count: snapshot.agents.errorAgents,
        timestamp: snapshot.timestamp
      });
    }
    
    if (snapshot.tests && snapshot.tests.totalFailed > 0) {
      this.trackPattern('errorPatterns', 'test_failures', {
        count: snapshot.tests.totalFailed,
        timestamp: snapshot.timestamp
      });
    }
    
    // Analyze performance patterns
    if (snapshot.tasks && snapshot.tasks.averageCompletionTime) {
      const avgTime = snapshot.tasks.averageCompletionTime;
      const baseline = this.aggregatedMetrics.tasks.baselineCompletionTime || avgTime;
      
      if (avgTime > baseline * 1.5) {
        this.trackPattern('performancePatterns', 'slow_tasks', {
          avgTime,
          timestamp: snapshot.timestamp
        });
      } else if (avgTime < baseline * 0.5) {
        this.trackPattern('performancePatterns', 'fast_tasks', {
          avgTime,
          timestamp: snapshot.timestamp
        });
      }
    }
    
    // Analyze success patterns
    if (snapshot.tests && snapshot.tests.successRate > 90) {
      this.trackPattern('successPatterns', 'high_test_success', {
        rate: snapshot.tests.successRate,
        timestamp: snapshot.timestamp
      });
    }
    
    if (snapshot.agents && snapshot.agents.runningAgents === snapshot.agents.totalAgents) {
      this.trackPattern('successPatterns', 'all_agents_healthy', {
        count: snapshot.agents.totalAgents,
        timestamp: snapshot.timestamp
      });
    }
  }
  
  /**
   * Track a pattern
   */
  trackPattern(category, type, data) {
    const patterns = this.patterns[category];
    if (!patterns) return;
    
    if (!patterns.has(type)) {
      patterns.set(type, {
        type,
        occurrences: [],
        count: 0,
        firstSeen: data.timestamp,
        lastSeen: data.timestamp
      });
    }
    
    const pattern = patterns.get(type);
    pattern.occurrences.push(data);
    pattern.count++;
    pattern.lastSeen = data.timestamp;
    
    // Keep only last 100 occurrences
    if (pattern.occurrences.length > 100) {
      pattern.occurrences.shift();
    }
  }
  
  /**
   * Generate insights from metrics
   */
  generateInsights(snapshot) {
    const newInsights = [];
    
    // Agent insights
    if (snapshot.agents) {
      if (snapshot.agents.errorAgents > snapshot.agents.totalAgents * 0.5) {
        newInsights.push({
          type: 'critical',
          category: 'agents',
          message: 'More than 50% of agents are in error state',
          timestamp: snapshot.timestamp,
          data: { errorCount: snapshot.agents.errorAgents }
        });
      }
      
      if (snapshot.agents.claudeTokensUsed > 100000) {
        newInsights.push({
          type: 'warning',
          category: 'agents',
          message: 'High Claude token usage detected',
          timestamp: snapshot.timestamp,
          data: { tokensUsed: snapshot.agents.claudeTokensUsed }
        });
      }
    }
    
    // Task insights
    if (snapshot.tasks) {
      if (snapshot.tasks.blockedTasks > snapshot.tasks.inProgressTasks) {
        newInsights.push({
          type: 'warning',
          category: 'tasks',
          message: 'More blocked tasks than in-progress tasks',
          timestamp: snapshot.timestamp,
          data: { 
            blocked: snapshot.tasks.blockedTasks,
            inProgress: snapshot.tasks.inProgressTasks
          }
        });
      }
    }
    
    // Test insights
    if (snapshot.tests) {
      if (snapshot.tests.successRate < 50) {
        newInsights.push({
          type: 'critical',
          category: 'tests',
          message: 'Test success rate below 50%',
          timestamp: snapshot.timestamp,
          data: { successRate: snapshot.tests.successRate }
        });
      }
      
      if (snapshot.tests.averageCoverage && snapshot.tests.averageCoverage.lines < 60) {
        newInsights.push({
          type: 'info',
          category: 'tests',
          message: 'Code coverage below recommended threshold',
          timestamp: snapshot.timestamp,
          data: { coverage: snapshot.tests.averageCoverage.lines }
        });
      }
    }
    
    // System insights
    if (snapshot.system) {
      const memUsagePercent = (snapshot.system.memoryUsage.heapUsed / snapshot.system.memoryUsage.heapTotal) * 100;
      if (memUsagePercent > 90) {
        newInsights.push({
          type: 'warning',
          category: 'system',
          message: 'High memory usage detected',
          timestamp: snapshot.timestamp,
          data: { usagePercent: memUsagePercent }
        });
      }
    }
    
    // Add new insights
    newInsights.forEach(insight => {
      this.insights.push(insight);
      this.emit('insight:generated', insight);
    });
    
    // Keep only last 100 insights
    if (this.insights.length > 100) {
      this.insights = this.insights.slice(-100);
    }
  }
  
  /**
   * Calculate throughput for a metric type
   */
  calculateThroughput(type) {
    if (this.timeSeries.length < 2) return 0;
    
    const recent = this.timeSeries.slice(-10);
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiff = (new Date(last.timestamp) - new Date(first.timestamp)) / 1000; // seconds
    
    if (timeDiff === 0) return 0;
    
    let countDiff = 0;
    switch (type) {
      case 'tasks':
        countDiff = (last.tasks?.completedTasks || 0) - (first.tasks?.completedTasks || 0);
        break;
      case 'messages':
        countDiff = (last.messages?.totalMessagesDelivered || 0) - 
                   (first.messages?.totalMessagesDelivered || 0);
        break;
      default:
        return 0;
    }
    
    return countDiff / timeDiff; // per second
  }
  
  /**
   * Calculate velocity for a metric type
   */
  calculateVelocity(type) {
    if (this.timeSeries.length < 2) return 0;
    
    const hourAgo = new Date(Date.now() - 3600000);
    const recentData = this.timeSeries.filter(s => 
      new Date(s.timestamp) >= hourAgo
    );
    
    if (recentData.length === 0) return 0;
    
    let count = 0;
    switch (type) {
      case 'changes':
        count = recentData.reduce((sum, s) => 
          sum + (s.changes?.totalChanges || 0), 0
        );
        break;
      default:
        return 0;
    }
    
    return count; // per hour
  }
  
  /**
   * Calculate average message size
   */
  calculateAverageMessageSize(flowData) {
    if (!flowData.edges || flowData.edges.length === 0) return 0;
    
    let totalSize = 0;
    let totalCount = 0;
    
    flowData.edges.forEach(edge => {
      if (edge.totalSize && edge.count) {
        totalSize += edge.totalSize;
        totalCount += edge.count;
      }
    });
    
    return totalCount > 0 ? totalSize / totalCount : 0;
  }
  
  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics() {
    if (this.timeSeries.length === 0) {
      return null;
    }
    
    return this.timeSeries[this.timeSeries.length - 1];
  }
  
  /**
   * Get metrics history
   */
  getHistory(limit = 100) {
    return this.timeSeries.slice(-limit);
  }
  
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics() {
    return this.aggregatedMetrics;
  }
  
  /**
   * Get patterns
   */
  getPatterns() {
    return {
      errorPatterns: Array.from(this.patterns.errorPatterns.values()),
      performancePatterns: Array.from(this.patterns.performancePatterns.values()),
      successPatterns: Array.from(this.patterns.successPatterns.values())
    };
  }
  
  /**
   * Get insights
   */
  getInsights(category = null) {
    if (category) {
      return this.insights.filter(i => i.category === category);
    }
    return this.insights;
  }
  
  /**
   * Get trend for a specific metric
   */
  getTrend(metricPath, limit = 20) {
    const data = this.timeSeries.slice(-limit);
    const trend = {
      timestamps: [],
      values: []
    };
    
    data.forEach(snapshot => {
      trend.timestamps.push(snapshot.timestamp);
      
      // Navigate to the metric value using the path
      const pathParts = metricPath.split('.');
      let value = snapshot;
      for (const part of pathParts) {
        value = value?.[part];
      }
      
      trend.values.push(value !== undefined ? value : null);
    });
    
    return trend;
  }
  
  /**
   * Reset metrics
   */
  reset() {
    this.timeSeries = [];
    this.aggregatedMetrics = {
      agents: {},
      tasks: {},
      tests: {},
      changes: {},
      messages: {},
      system: {}
    };
    this.patterns = {
      errorPatterns: new Map(),
      performancePatterns: new Map(),
      successPatterns: new Map()
    };
    this.insights = [];
    
    this.emit('reset');
  }
  
  /**
   * Set dependencies
   */
  setDependencies(deps) {
    if (deps.agentManager) this.agentManager = deps.agentManager;
    if (deps.taskManager) this.taskManager = deps.taskManager;
    if (deps.testRunner) this.testRunner = deps.testRunner;
    if (deps.changeTracker) this.changeTracker = deps.changeTracker;
    if (deps.messageQueue) this.messageQueue = deps.messageQueue;
  }
}

module.exports = MetricsCollector;
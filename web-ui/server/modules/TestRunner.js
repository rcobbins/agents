const EventEmitter = require('events');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

/**
 * TestRunner - Manages test execution and results
 */
class TestRunner extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    
    // Store test runs by ID
    this.testRuns = new Map();
    
    // Store test history (last 500 runs)
    this.testHistory = [];
    this.maxHistorySize = 500;
    
    // Test statistics by project
    this.projectStats = new Map();
    
    // Test failure patterns
    this.failurePatterns = new Map();
    
    // Coverage tracking
    this.coverageHistory = new Map();
    
    // Global statistics
    this.globalStats = {
      totalRuns: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      averageDuration: 0,
      averageCoverage: {
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0
      }
    };
  }
  
  /**
   * Run tests for a project
   */
  async runTests(projectId, options = {}) {
    const {
      testCommand = 'npm test',
      suite = 'default',
      agentId = 'tester',
      workingDir = process.cwd(),
      timeout = 300000 // 5 minutes
    } = options;
    
    const testRun = {
      id: uuidv4(),
      projectId,
      agentId,
      suite,
      command: testCommand,
      workingDir,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      results: {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
      },
      coverage: null,
      failures: [],
      output: '',
      error: null
    };
    
    this.testRuns.set(testRun.id, testRun);
    
    // Emit test start event
    this.emit('test:started', testRun);
    
    try {
      // Execute test command
      const result = await this.executeTests(testRun, timeout);
      
      // Parse test results
      testRun.results = this.parseTestOutput(result.stdout);
      testRun.output = result.stdout;
      
      // Parse coverage if available
      testRun.coverage = this.parseCoverageOutput(result.stdout);
      
      // Extract failures
      testRun.failures = this.extractFailures(result.stdout);
      
      // Calculate duration
      testRun.endTime = new Date().toISOString();
      testRun.duration = new Date(testRun.endTime) - new Date(testRun.startTime);
      
      // Update status based on results
      if (testRun.results.failed > 0) {
        testRun.status = 'failed';
      } else if (testRun.results.passed > 0) {
        testRun.status = 'passed';
      } else {
        testRun.status = 'skipped';
      }
      
      // Update statistics
      this.updateStatistics(testRun);
      
      // Analyze failure patterns
      if (testRun.failures.length > 0) {
        this.analyzeFailurePatterns(testRun.failures);
      }
      
      // Store in history
      this.addToHistory(testRun);
      
      // Update test run
      this.testRuns.set(testRun.id, testRun);
      
      // Emit completion event
      this.emit('test:completed', testRun);
      
      this.logger.info(`Test run ${testRun.id} completed: ${testRun.status}`);
      
      return testRun;
    } catch (error) {
      testRun.status = 'error';
      testRun.error = error.message;
      testRun.endTime = new Date().toISOString();
      testRun.duration = new Date(testRun.endTime) - new Date(testRun.startTime);
      
      this.testRuns.set(testRun.id, testRun);
      
      // Emit error event
      this.emit('test:error', { testRun, error: error.message });
      
      this.logger.error(`Test run ${testRun.id} failed: ${error.message}`);
      
      throw error;
    }
  }
  
  /**
   * Execute test command
   */
  executeTests(testRun, timeout) {
    return new Promise((resolve, reject) => {
      const child = spawn(testRun.command, {
        shell: true,
        cwd: testRun.workingDir,
        env: { ...process.env, CI: 'true', NODE_ENV: 'test' }
      });
      
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      // Set timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
        reject(new Error(`Test execution timed out after ${timeout}ms`));
      }, timeout);
      
      // Capture stdout
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Emit real-time output
        this.emit('test:output', {
          testRunId: testRun.id,
          type: 'stdout',
          data: chunk,
          timestamp: new Date().toISOString()
        });
      });
      
      // Capture stderr
      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        
        // Emit real-time output
        this.emit('test:output', {
          testRunId: testRun.id,
          type: 'stderr',
          data: chunk,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timer);
        
        if (timedOut) {
          return;
        }
        
        if (code !== 0 && code !== 1) {
          reject(new Error(`Test command exited with code ${code}`));
        } else {
          resolve({ stdout, stderr, exitCode: code });
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
  
  /**
   * Parse test output to extract results
   */
  parseTestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    
    // Try to parse Jest output
    const jestMatch = output.match(/Tests:\s+(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/);
    if (jestMatch) {
      results.failed = parseInt(jestMatch[1]);
      results.passed = parseInt(jestMatch[2]);
      results.total = parseInt(jestMatch[3]);
      results.skipped = results.total - results.passed - results.failed;
      return results;
    }
    
    // Try to parse Mocha output
    const mochaPassMatch = output.match(/(\d+)\s+passing/);
    const mochaFailMatch = output.match(/(\d+)\s+failing/);
    const mochaPendingMatch = output.match(/(\d+)\s+pending/);
    
    if (mochaPassMatch || mochaFailMatch) {
      results.passed = mochaPassMatch ? parseInt(mochaPassMatch[1]) : 0;
      results.failed = mochaFailMatch ? parseInt(mochaFailMatch[1]) : 0;
      results.skipped = mochaPendingMatch ? parseInt(mochaPendingMatch[1]) : 0;
      results.total = results.passed + results.failed + results.skipped;
      return results;
    }
    
    // Try to parse pytest output
    const pytestMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/);
    if (pytestMatch) {
      results.passed = parseInt(pytestMatch[1]);
      results.failed = parseInt(pytestMatch[2]);
      results.skipped = parseInt(pytestMatch[3]);
      results.total = results.passed + results.failed + results.skipped;
      return results;
    }
    
    // Generic pattern matching
    const passedMatch = output.match(/(\d+)\s+(?:test[s]?|spec[s]?|case[s]?)\s+(?:passed|passing|succeeded)/i);
    const failedMatch = output.match(/(\d+)\s+(?:test[s]?|spec[s]?|case[s]?)\s+(?:failed|failing)/i);
    
    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    
    results.total = results.passed + results.failed + results.skipped;
    
    return results;
  }
  
  /**
   * Parse coverage output
   */
  parseCoverageOutput(output) {
    const coverage = {
      lines: 0,
      branches: 0,
      functions: 0,
      statements: 0
    };
    
    // Try to parse Jest coverage
    const coverageMatch = output.match(/Lines\s+:\s+([\d.]+)%.*?Branches\s+:\s+([\d.]+)%.*?Functions\s+:\s+([\d.]+)%.*?Statements\s+:\s+([\d.]+)%/s);
    if (coverageMatch) {
      coverage.lines = parseFloat(coverageMatch[1]);
      coverage.branches = parseFloat(coverageMatch[2]);
      coverage.functions = parseFloat(coverageMatch[3]);
      coverage.statements = parseFloat(coverageMatch[4]);
      return coverage;
    }
    
    // Try to parse Istanbul/nyc coverage
    const istanbulMatch = output.match(/Statements\s+:\s+([\d.]+)%.*?Branches\s+:\s+([\d.]+)%.*?Functions\s+:\s+([\d.]+)%.*?Lines\s+:\s+([\d.]+)%/s);
    if (istanbulMatch) {
      coverage.statements = parseFloat(istanbulMatch[1]);
      coverage.branches = parseFloat(istanbulMatch[2]);
      coverage.functions = parseFloat(istanbulMatch[3]);
      coverage.lines = parseFloat(istanbulMatch[4]);
      return coverage;
    }
    
    // Try generic coverage pattern
    const genericMatch = output.match(/coverage:\s+([\d.]+)%/i);
    if (genericMatch) {
      const value = parseFloat(genericMatch[1]);
      coverage.lines = value;
      coverage.statements = value;
    }
    
    return coverage.lines > 0 ? coverage : null;
  }
  
  /**
   * Extract test failures from output
   */
  extractFailures(output) {
    const failures = [];
    
    // Extract Jest failures
    const jestFailures = output.match(/●[^●]*(?:✕|FAIL)[^●]*/g);
    if (jestFailures) {
      jestFailures.forEach(failure => {
        const lines = failure.split('\n');
        const testName = lines[0].replace(/[●✕]/g, '').trim();
        const errorMessage = lines.slice(1).join('\n').trim();
        
        failures.push({
          testName,
          errorMessage,
          stack: errorMessage,
          file: this.extractFileFromError(errorMessage)
        });
      });
    }
    
    // Extract Mocha failures
    const mochaFailures = output.match(/\d+\)\s+[^\n]+\n[^\n]*Error:[^\n]*/g);
    if (mochaFailures) {
      mochaFailures.forEach(failure => {
        const lines = failure.split('\n');
        const testName = lines[0].replace(/^\d+\)\s+/, '').trim();
        const errorMessage = lines.slice(1).join('\n').trim();
        
        failures.push({
          testName,
          errorMessage,
          stack: errorMessage,
          file: this.extractFileFromError(errorMessage)
        });
      });
    }
    
    // Extract pytest failures
    const pytestFailures = output.match(/FAILED[^\n]+::[^\n]+/g);
    if (pytestFailures) {
      pytestFailures.forEach(failure => {
        const testName = failure.replace('FAILED', '').trim();
        
        failures.push({
          testName,
          errorMessage: failure,
          stack: failure,
          file: this.extractFileFromError(failure)
        });
      });
    }
    
    return failures;
  }
  
  /**
   * Extract file path from error message
   */
  extractFileFromError(error) {
    // Match file paths in various formats
    const fileMatch = error.match(/(?:at\s+)?([^\s]+\.(js|ts|jsx|tsx|py|java|cpp|c)):(\d+)/);
    if (fileMatch) {
      return {
        path: fileMatch[1],
        line: parseInt(fileMatch[3])
      };
    }
    
    return null;
  }
  
  /**
   * Update statistics after test run
   */
  updateStatistics(testRun) {
    // Update global stats
    this.globalStats.totalRuns++;
    this.globalStats.totalPassed += testRun.results.passed;
    this.globalStats.totalFailed += testRun.results.failed;
    this.globalStats.totalSkipped += testRun.results.skipped;
    
    // Update average duration
    const allRuns = Array.from(this.testRuns.values());
    const totalDuration = allRuns.reduce((sum, run) => sum + (run.duration || 0), 0);
    this.globalStats.averageDuration = totalDuration / allRuns.length;
    
    // Update average coverage
    if (testRun.coverage) {
      const runsWithCoverage = allRuns.filter(r => r.coverage);
      if (runsWithCoverage.length > 0) {
        ['lines', 'branches', 'functions', 'statements'].forEach(metric => {
          const total = runsWithCoverage.reduce((sum, run) => sum + (run.coverage[metric] || 0), 0);
          this.globalStats.averageCoverage[metric] = total / runsWithCoverage.length;
        });
      }
    }
    
    // Update project stats
    if (!this.projectStats.has(testRun.projectId)) {
      this.projectStats.set(testRun.projectId, {
        totalRuns: 0,
        passedRuns: 0,
        failedRuns: 0,
        successRate: 0,
        averageDuration: 0,
        lastRun: null
      });
    }
    
    const projectStats = this.projectStats.get(testRun.projectId);
    projectStats.totalRuns++;
    if (testRun.status === 'passed') projectStats.passedRuns++;
    if (testRun.status === 'failed') projectStats.failedRuns++;
    projectStats.successRate = (projectStats.passedRuns / projectStats.totalRuns) * 100;
    projectStats.lastRun = testRun.endTime;
    
    this.projectStats.set(testRun.projectId, projectStats);
  }
  
  /**
   * Analyze failure patterns
   */
  analyzeFailurePatterns(failures) {
    failures.forEach(failure => {
      // Extract error type
      const errorType = this.extractErrorType(failure.errorMessage);
      
      // Track pattern
      if (!this.failurePatterns.has(errorType)) {
        this.failurePatterns.set(errorType, {
          type: errorType,
          count: 0,
          tests: new Set(),
          files: new Set(),
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
      }
      
      const pattern = this.failurePatterns.get(errorType);
      pattern.count++;
      pattern.tests.add(failure.testName);
      if (failure.file) {
        pattern.files.add(failure.file.path);
      }
      pattern.lastSeen = new Date().toISOString();
      
      this.failurePatterns.set(errorType, pattern);
    });
  }
  
  /**
   * Extract error type from message
   */
  extractErrorType(errorMessage) {
    // Common error patterns
    if (errorMessage.includes('TypeError')) return 'TypeError';
    if (errorMessage.includes('ReferenceError')) return 'ReferenceError';
    if (errorMessage.includes('SyntaxError')) return 'SyntaxError';
    if (errorMessage.includes('AssertionError')) return 'AssertionError';
    if (errorMessage.includes('expect')) return 'ExpectationError';
    if (errorMessage.includes('timeout')) return 'TimeoutError';
    if (errorMessage.includes('connection')) return 'ConnectionError';
    
    // Extract first error word
    const match = errorMessage.match(/(\w+Error)/);
    if (match) return match[1];
    
    return 'UnknownError';
  }
  
  /**
   * Get test runs for a project
   */
  getProjectTestRuns(projectId, options = {}) {
    const { limit = 50, status, suite } = options;
    
    let runs = this.testHistory.filter(run => run.projectId === projectId);
    
    if (status) {
      runs = runs.filter(run => run.status === status);
    }
    
    if (suite) {
      runs = runs.filter(run => run.suite === suite);
    }
    
    // Sort by timestamp (newest first)
    runs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    return runs.slice(0, limit);
  }
  
  /**
   * Get test statistics
   */
  getStatistics(projectId = null) {
    if (projectId) {
      return {
        global: this.globalStats,
        project: this.projectStats.get(projectId) || null,
        failurePatterns: Array.from(this.failurePatterns.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
    }
    
    return {
      global: this.globalStats,
      projects: Object.fromEntries(this.projectStats),
      failurePatterns: Array.from(this.failurePatterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }
  
  /**
   * Get coverage trends
   */
  getCoverageTrends(projectId, limit = 20) {
    const runs = this.getProjectTestRuns(projectId, { limit })
      .filter(run => run.coverage)
      .reverse(); // Oldest to newest for trend chart
    
    return {
      timestamps: runs.map(r => r.startTime),
      lines: runs.map(r => r.coverage.lines),
      branches: runs.map(r => r.coverage.branches),
      functions: runs.map(r => r.coverage.functions),
      statements: runs.map(r => r.coverage.statements)
    };
  }
  
  /**
   * Get specific test run
   */
  getTestRun(testRunId) {
    return this.testRuns.get(testRunId);
  }
  
  /**
   * Add to history
   */
  addToHistory(testRun) {
    this.testHistory.push(testRun);
    
    // Trim history if too large
    if (this.testHistory.length > this.maxHistorySize) {
      this.testHistory.shift();
    }
    
    // Update coverage history for the project
    if (testRun.coverage) {
      if (!this.coverageHistory.has(testRun.projectId)) {
        this.coverageHistory.set(testRun.projectId, []);
      }
      
      const history = this.coverageHistory.get(testRun.projectId);
      history.push({
        timestamp: testRun.startTime,
        coverage: testRun.coverage
      });
      
      // Keep only last 100 coverage points
      if (history.length > 100) {
        history.shift();
      }
    }
  }
  
  /**
   * Clear old test runs
   */
  clearOldTestRuns(hoursOld = 24) {
    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [testRunId, testRun] of this.testRuns.entries()) {
      if (new Date(testRun.startTime).getTime() < cutoffTime) {
        this.testRuns.delete(testRunId);
        removedCount++;
      }
    }
    
    // Also clean history
    this.testHistory = this.testHistory.filter(
      run => new Date(run.startTime).getTime() >= cutoffTime
    );
    
    this.logger.info(`Cleared ${removedCount} old test runs`);
    return removedCount;
  }
  
  /**
   * Reset test runner
   */
  reset() {
    this.testRuns.clear();
    this.testHistory = [];
    this.projectStats.clear();
    this.failurePatterns.clear();
    this.coverageHistory.clear();
    
    this.globalStats = {
      totalRuns: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      averageDuration: 0,
      averageCoverage: {
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0
      }
    };
    
    this.emit('reset');
  }
}

module.exports = TestRunner;
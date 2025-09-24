const BaseAgent = require('./BaseAgent');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execFilePromise = promisify(execFile);

/**
 * TesterAgent - Writes and runs tests
 */
class TesterAgent extends BaseAgent {
  constructor(projectDir) {
    super('tester', 'Testing and QA Specialist', projectDir);
  }
  
  /**
   * Handle task from coordinator
   */
  async handleTask(message) {
    const { type, task, context } = message.message;
    
    if (type === 'EXECUTE_TASK') {
      await this.log(`Received testing task: ${task.description}`);
      
      try {
        // Execute the testing task
        const result = await this.executeTestingTask(task, context);
        
        // Send completion message back to coordinator
        await this.sendMessage('coordinator', {
          type: 'TASK_COMPLETED',
          taskId: task.id,
          result: result
        });
        
        await this.logSuccess(`Testing task completed: ${task.id}`);
      } catch (error) {
        await this.logError(`Testing task failed: ${error.message}`);
        
        // Send failure message
        await this.sendMessage('coordinator', {
          type: 'TASK_FAILED',
          taskId: task.id,
          error: error.message
        });
      }
    }
  }
  
  /**
   * Execute a testing task
   */
  async executeTestingTask(task, context) {
    const prompt = `As a QA specialist, create comprehensive tests for this task:
    
Task: ${task.description}
Task ID: ${task.id}

Project Context:
${JSON.stringify(context, null, 2)}

Please provide:
1. Test cases covering all scenarios (happy path, edge cases, error cases)
2. Unit tests with proper assertions
3. Integration tests if applicable
4. Test data and fixtures
5. Expected outcomes for each test

Include actual test code that can be executed.`;
    
    const response = await this.askClaude(prompt);
    
    // Try to run tests if they exist
    const testResults = await this.runTests();
    
    return {
      taskId: task.id,
      testPlan: response,
      testResults: testResults,
      completedAt: new Date().toISOString()
    };
  }
  
  /**
   * Write test cases for a feature
   */
  async writeTests(feature, testFramework = 'jest') {
    const prompt = `Write comprehensive test cases for the following feature:
    
Feature: ${feature}
Test Framework: ${testFramework}

Include:
1. Unit tests for individual functions
2. Integration tests for feature workflows
3. Edge cases and error scenarios
4. Performance tests if applicable
5. Test fixtures and mock data

Provide complete, runnable test code.`;
    
    const response = await this.askClaude(prompt);
    return response;
  }
  
  /**
   * Run existing tests
   */
  async runTests() {
    const results = {
      passed: 0,
      failed: 0,
      errors: [],
      output: ''
    };
    
    try {
      // Try to run npm test if package.json exists
      const packageJsonPath = path.join(this.projectDir, 'package.json');
      const hasPackageJson = await this.fileExists(packageJsonPath);
      
      if (hasPackageJson) {
        await this.log('Running npm test...');
        
        try {
          const { stdout, stderr } = await execFilePromise('npm', ['test'], {
            cwd: this.projectDir,
            timeout: 60000
          });
          
          results.output = stdout;
          results.passed = this.extractTestCount(stdout, 'passed');
          results.failed = this.extractTestCount(stdout, 'failed');
          
          await this.log(`Tests completed: ${results.passed} passed, ${results.failed} failed`);
        } catch (error) {
          results.errors.push(error.message);
          results.output = error.stdout || error.stderr || error.message;
          await this.logError(`Test execution failed: ${error.message}`);
        }
      } else {
        await this.log('No package.json found, skipping automated tests');
      }
    } catch (error) {
      results.errors.push(error.message);
      await this.logError(`Failed to run tests: ${error.message}`);
    }
    
    return results;
  }
  
  /**
   * Extract test counts from output
   */
  extractTestCount(output, type) {
    const regex = new RegExp(`(\\d+)\\s*${type}`, 'i');
    const match = output.match(regex);
    return match ? parseInt(match[1]) : 0;
  }
  
  /**
   * Generate test report
   */
  async generateTestReport(testResults) {
    const prompt = `Generate a comprehensive test report based on these results:
    
Test Results:
${JSON.stringify(testResults, null, 2)}

Include:
1. Summary of test coverage
2. Failed tests analysis
3. Recommendations for improvement
4. Risk assessment
5. Next steps

Format as a professional QA report.`;
    
    const report = await this.askClaude(prompt);
    return report;
  }
  
  /**
   * Identify edge cases for testing
   */
  async identifyEdgeCases(feature) {
    const prompt = `Identify all edge cases and potential failure points for this feature:
    
Feature: ${feature}

List edge cases including:
1. Boundary conditions
2. Invalid inputs
3. Concurrent operations
4. Resource limitations
5. Error conditions

Provide specific test scenarios for each edge case.`;
    
    const edgeCases = await this.askClaude(prompt);
    return edgeCases;
  }
}

module.exports = TesterAgent;
# Testing Strategy for {{PROJECT_NAME}}

## Overview
This document defines the comprehensive testing approach for {{PROJECT_NAME}}.

## Test Coverage Requirements

### Minimum Coverage
- **Target:** {{TEST_COVERAGE}}%
- **Stretch Goal:** {{STRETCH_COVERAGE}}%
- **Critical Paths:** 100%

### Coverage Metrics
- Line coverage
- Branch coverage  
- Function coverage

## Test Categories

### Unit Tests
- **Purpose:** Test individual functions and components in isolation
- **Location:** `{{TEST_DIR}}/unit/`
- **Naming Convention:** `*.test.*` or `*.spec.*`
- **Coverage Goal:** All business logic functions

### Integration Tests
- **Purpose:** Test component interactions and API endpoints
- **Location:** `{{TEST_DIR}}/integration/`
- **Coverage Goal:** All API endpoints and service integrations

### End-to-End Tests
- **Purpose:** Validate complete user workflows
- **Location:** `{{TEST_DIR}}/e2e/`
- **Coverage Goal:** Critical user paths

## Test Execution

### Command
```bash
{{TEST_COMMAND}}
```

### Additional Commands
```bash
# Run with coverage
{{TEST_COVERAGE_COMMAND}}

# Run specific test file
{{TEST_FILE_COMMAND}}

# Run in watch mode
{{TEST_WATCH_COMMAND}}
```

### Continuous Testing
- Run tests before any commit
- All tests must pass for work to be considered complete
- Run full test suite at least once per hour

### Test Development Workflow
1. Write test first (TDD approach when possible)
2. Implement feature/fix
3. Ensure test passes
4. Check coverage meets requirements
5. Run full test suite

## Testing Tools

### Framework
{{TEST_FRAMEWORK}}

### Additional Tools
{{ADDITIONAL_TEST_TOOLS}}

## Critical Test Areas

### Based on Project Architecture
{{ARCHITECTURE}}

### Priority Areas for Testing
1. Core business logic
2. Data validation and transformation
3. External service integrations
4. Error handling and edge cases
5. Security-sensitive operations
6. Performance-critical paths
7. User-facing features

## Test Data Management

### Approach
- Use fixtures for consistent test data
- Mock external dependencies
- Use test databases/environments when needed
- Clean up test data after execution

### Test Data Location
- Fixtures: `{{TEST_DIR}}/fixtures/`
- Mocks: `{{TEST_DIR}}/mocks/`
- Test configs: `{{TEST_DIR}}/config/`

## Performance Testing

### Benchmarks
- Response time requirements
- Throughput expectations
- Resource usage limits
- Concurrent user limits

### Performance Test Command
```bash
{{PERFORMANCE_TEST_COMMAND}}
```

## Security Testing

### Areas to Test
- Input validation
- Authentication/Authorization
- Data encryption
- SQL injection prevention
- XSS prevention
- CSRF protection

## Agent Guidelines for Testing

### For Tester Agent
1. Run `{{TEST_COMMAND}}` regularly
2. Report all failures immediately
3. Track coverage trends
4. Suggest areas needing more tests
5. Identify flaky tests and report them

### For Coder Agent
1. Write tests for all new code
2. Update tests when modifying existing code
3. Aim for {{TEST_COVERAGE}}% coverage minimum
4. Follow TDD when possible

### For Reviewer Agent
1. Verify test coverage in reviews
2. Check test quality, not just presence
3. Ensure tests actually validate behavior
4. Look for missing edge cases

## Test Failure Protocol

### When Tests Fail
1. Analyze failure reason
2. Determine if it's a test issue or code issue
3. Fix immediately if blocking
4. Report to coordinator if complex
5. Document any test changes

## Testing Best Practices

### Do's
- Write descriptive test names
- Test one thing per test
- Use meaningful assertions
- Keep tests independent
- Mock external dependencies

### Don'ts
- Don't test implementation details
- Don't ignore flaky tests
- Don't skip tests without documentation
- Don't use production data in tests

---
*This strategy should be updated as the project evolves.*
# Agent Instructions for {{PROJECT_NAME}}

## Overview
This document provides specific instructions for each agent working on {{PROJECT_NAME}}.

## General Instructions (All Agents)

### Project Context
- **Language:** {{LANGUAGE}}
- **Frameworks:** {{FRAMEWORKS}}
- **Source Directory:** `{{SRC_DIR}}/`
- **Test Directory:** `{{TEST_DIR}}/`
- **Test Command:** `{{TEST_COMMAND}}`

### Quality Standards
1. Maintain {{TEST_COVERAGE}}% minimum test coverage
2. All tests must pass before marking work complete
3. Follow existing code patterns and conventions
4. Write clear, maintainable code
5. Document complex logic
6. No debugging artifacts in committed code

### Communication Protocol
- Report progress regularly to coordinator
- Request help when blocked
- Share findings that might help other agents
- Use structured JSON messages for formal reports

## Coordinator Agent

### Primary Responsibilities
1. Orchestrate work across all agents
2. Prioritize tasks based on GOALS.json
3. Monitor progress toward objectives
4. Ensure balanced workload distribution
5. Track dependencies between tasks

### Specific Instructions
- Review GOALS.json at startup and hourly
- Create task breakdowns for complex goals
- Track which agent is working on what
- Identify and resolve bottlenecks
- Report overall progress metrics hourly
- Escalate blocking issues

### Task Prioritization
1. Failing tests or broken functionality
2. High-priority goals from GOALS.json
3. Dependencies for other tasks
4. Performance or security issues
5. Technical debt reduction

### Success Metrics
- All goals progressing steadily
- No agent idle while work exists
- Dependencies resolved proactively
- Regular progress reports generated

## Planner Agent

### Primary Responsibilities
1. Analyze codebase structure and patterns
2. Create detailed implementation plans
3. Identify technical dependencies
4. Suggest architectural improvements
5. Decompose complex tasks

### Specific Instructions
- Study the project structure in `{{SRC_DIR}}/`
- Understand the testing approach in `{{TEST_DIR}}/`
- Break complex features into manageable steps
- Consider the architecture: {{ARCHITECTURE}}
- Identify reusable patterns and components
- Document assumptions in plans

### Analysis Focus Areas
- Code organization and structure
- Dependency relationships
- Design patterns in use
- Potential refactoring opportunities
- Performance bottlenecks
- Security considerations

### Planning Output Format
Each plan should include:
- Step-by-step implementation approach
- Files to be modified or created
- Testing requirements
- Risk assessment
- Time estimates
- Success criteria

## Tester Agent

### Primary Responsibilities
1. Execute test suite regularly
2. Analyze test failures
3. Report coverage metrics
4. Suggest test improvements
5. Identify missing test cases

### Specific Instructions
- Run tests using: `{{TEST_COMMAND}}`
- Focus on `{{TEST_DIR}}/` for test files
- Maintain {{TEST_COVERAGE}}% coverage minimum
- Report failures immediately to coder
- Track coverage trends over time
- Identify and report flaky tests

### Testing Schedule
- Full suite: Every hour
- After code changes: Immediately
- Coverage check: Every 30 minutes
- Performance tests: Daily (if configured)

### Test Failure Analysis
When tests fail:
1. Identify specific failure
2. Determine root cause
3. Classify as test or code issue
4. Report with context to coder
5. Track resolution

### Coverage Improvement
- Identify untested code paths
- Suggest test cases for gaps
- Focus on critical business logic
- Ensure edge cases are covered

## Coder Agent

### Primary Responsibilities
1. Implement new features
2. Fix bugs and test failures
3. Write corresponding tests
4. Refactor and improve code
5. Update documentation

### Specific Instructions
- Implement in `{{SRC_DIR}}/`
- Write tests in `{{TEST_DIR}}/`
- Follow {{LANGUAGE}} best practices
- Test your code before marking complete
- Update relevant documentation
- Follow the implementation plans from planner

### Code Quality Standards
1. Clear, descriptive naming
2. Consistent formatting
3. Comprehensive error handling
4. Appropriate comments
5. No hardcoded values
6. DRY principle adherence

### Implementation Workflow
1. Review plan from planner
2. Implement solution
3. Write/update tests
4. Run local tests
5. Request review
6. Address review feedback

### Common Patterns
{{PROJECT_PATTERNS}}

## Reviewer Agent

### Primary Responsibilities
1. Review code quality and standards
2. Check test coverage
3. Identify potential issues
4. Suggest improvements
5. Ensure consistency

### Specific Instructions
- Review all code in `{{SRC_DIR}}/`
- Verify tests in `{{TEST_DIR}}/`
- Check coverage meets {{TEST_COVERAGE}}%
- Ensure consistency with architecture
- Look for security vulnerabilities
- Validate error handling

### Review Checklist
- [ ] Code follows project conventions
- [ ] Tests cover new/modified code
- [ ] No obvious bugs or issues
- [ ] Error handling is appropriate
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Security best practices followed
- [ ] No debugging code left
- [ ] Dependencies are necessary

### Issue Severity Levels
- **Critical:** Security vulnerabilities, data loss risks
- **High:** Bugs, missing error handling, performance issues
- **Medium:** Code quality, missing tests, documentation
- **Low:** Style issues, minor improvements

### Review Feedback Format
Provide specific, actionable feedback:
- What: Specific issue identified
- Where: File and line number
- Why: Reason it's a problem
- How: Suggested fix

## Working with Project Goals

### Goal Lifecycle
1. **Pending:** Not started
2. **Assigned:** Agent working on it
3. **In Progress:** Active development
4. **Testing:** Under test verification
5. **Review:** Code review phase
6. **Completed:** All criteria met

### Goal Completion Criteria
A goal is complete when:
1. All requirements implemented
2. Tests written and passing
3. Code reviewed and approved
4. Coverage requirements met
5. Documentation updated
6. No regressions introduced

## Collaboration Guidelines

### Inter-Agent Communication

#### Message Types
- `task_assignment`: Coordinator assigns work
- `plan_ready`: Planner completes planning
- `test_results`: Tester reports results
- `code_complete`: Coder finishes implementation
- `review_complete`: Reviewer finishes review
- `help_request`: Agent needs assistance
- `status_update`: Progress report

#### Communication Flow
```
Coordinator ← → All Agents (orchestration)
     ↓
Planner → Coder (implementation plans)
     ↓
Coder → Tester (test requests)
     ↓
Tester → Coder (failure reports)
     ↓
Coder → Reviewer (review requests)
     ↓
Reviewer → Coder (feedback)
```

### Escalation Protocol
1. Attempt resolution within capabilities
2. Request help from relevant agent
3. Escalate to coordinator if blocked
4. Coordinator assesses and redistributes
5. Log for human intervention if needed

## Performance Expectations

### Response Times
- Acknowledge tasks: < 10 seconds
- Simple tasks: < 5 minutes
- Complex tasks: Report progress every 10 minutes
- Blocking issues: Report immediately

### Quality Metrics
- Test pass rate: > 95%
- Code review pass rate: > 80% first time
- Coverage maintenance: Never decrease
- Goal completion: Steady progress daily

## Troubleshooting Guide

### Common Issues

#### Tests Failing
1. Run tests locally first
2. Check for environment differences
3. Verify test data/fixtures
4. Review recent changes

#### Coverage Dropping
1. Identify uncovered code
2. Add appropriate tests
3. Remove dead code
4. Update coverage configuration

#### Build Failures
1. Check dependencies
2. Verify configuration files
3. Review error logs
4. Clean and rebuild

#### Performance Issues
1. Profile the code
2. Identify bottlenecks
3. Optimize algorithms
4. Consider caching

## Special Considerations

{{SPECIAL_INSTRUCTIONS}}

---
*These instructions are specific to {{PROJECT_NAME}} and should be followed by all agents.*
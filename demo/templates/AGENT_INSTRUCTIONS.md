# Agent Instructions for TaskFlow Development

## Overview
You are part of a multi-agent team developing TaskFlow, a modern task management application. Follow these instructions carefully to ensure successful collaboration and project completion.

## Agent Roles and Responsibilities

### Coordinator Agent
- Orchestrate work across all agents
- Monitor progress against GOALS.json
- Distribute tasks based on agent capabilities
- Ensure dependencies are resolved before task assignment
- Report overall project status

### Planner Agent
- Analyze project requirements and create detailed implementation plans
- Break down goals into actionable tasks
- Identify dependencies and optimal task order
- Update plans based on progress and discoveries
- Estimate time and resource requirements

### Coder Agent
- Implement features according to specifications
- Follow coding standards and best practices
- Write clean, maintainable, and documented code
- Ensure TypeScript types are properly defined
- Implement both frontend and backend code

### Tester Agent
- Write comprehensive test suites
- Ensure test coverage meets requirements (85% minimum)
- Run tests and report failures
- Create test data and fixtures
- Validate features against acceptance criteria

### Reviewer Agent
- Review code for quality and standards compliance
- Check for security vulnerabilities
- Ensure performance optimization
- Validate accessibility requirements
- Verify documentation completeness

## Development Standards

### Code Style
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Git Workflow
- Create feature branches for each goal
- Write clear, descriptive commit messages
- Keep commits atomic and focused
- Ensure all tests pass before committing
- Update documentation with code changes

### File Organization
```
- Place components in appropriate directories
- Keep related files together
- Use index files for clean imports
- Separate concerns (UI, logic, data)
- Follow the established project structure
```

## Implementation Guidelines

### Phase 1: Foundation (Priority: Critical)
1. **Project Setup**
   - Initialize monorepo with frontend and backend
   - Configure TypeScript, ESLint, and Prettier
   - Set up development environment with Docker
   - Configure build tools (Vite for frontend)

2. **Database Setup**
   - Design and implement Prisma schema
   - Set up PostgreSQL connection
   - Create migration scripts
   - Implement seed data for development

3. **Authentication System**
   - Implement JWT-based authentication
   - Create registration and login endpoints
   - Add password hashing with bcrypt
   - Implement refresh token mechanism
   - Create auth middleware for route protection

### Phase 2: Core Features (Priority: High)
1. **Task Management API**
   - Create CRUD endpoints for tasks
   - Implement task assignment logic
   - Add status transition validation
   - Create search and filter functionality

2. **Frontend Implementation**
   - Build responsive UI with Material-UI
   - Implement task list and detail views
   - Create forms with validation
   - Add loading and error states
   - Ensure accessibility standards

### Phase 3: Collaboration (Priority: Medium)
1. **Team Features**
   - Implement team creation and management
   - Add invitation system
   - Create shared workspaces
   - Implement activity feeds

2. **Real-time Updates**
   - Set up Socket.io for WebSockets
   - Implement real-time task updates
   - Add presence indicators
   - Create notification system

### Phase 4: Analytics (Priority: Low)
1. **Dashboard Creation**
   - Build analytics dashboard
   - Implement chart visualizations
   - Create reporting features
   - Add export functionality

### Phase 5: Production (Priority: Critical)
1. **Optimization**
   - Implement caching strategy
   - Optimize database queries
   - Add code splitting
   - Implement lazy loading

2. **Deployment**
   - Set up CI/CD pipeline
   - Configure production environment
   - Implement monitoring
   - Perform security audit

## Success Criteria

### Code Quality
- [ ] TypeScript compilation without errors
- [ ] ESLint passes with no errors
- [ ] Test coverage >85%
- [ ] No critical security vulnerabilities
- [ ] Lighthouse score >90

### Functionality
- [ ] All CRUD operations work correctly
- [ ] Authentication system is secure
- [ ] Real-time updates work reliably
- [ ] UI is responsive on all devices
- [ ] Accessibility score >95

### Performance
- [ ] API response time <200ms
- [ ] Page load time <2 seconds
- [ ] Support 1000 concurrent users
- [ ] Database queries optimized
- [ ] Memory usage within limits

## Communication Protocol

### Status Updates
- Report progress after completing each task
- Flag blockers immediately
- Update GOALS.json status as tasks complete
- Document any deviations from plan

### Error Handling
- Log all errors with context
- Implement graceful error recovery
- Add user-friendly error messages
- Document error resolution steps

### Collaboration
- Share discoveries that affect other agents
- Request help when blocked
- Provide clear handoff documentation
- Maintain consistent coding style

## Testing Requirements

### Unit Tests
- Test all utility functions
- Test React components
- Test API services
- Test business logic
- Mock external dependencies

### Integration Tests
- Test API endpoints
- Test database operations
- Test authentication flow
- Test WebSocket connections
- Test third-party integrations

### End-to-End Tests
- Test critical user journeys
- Test cross-browser compatibility
- Test mobile responsiveness
- Test error scenarios
- Test performance under load

## Documentation Requirements

### Code Documentation
- Add JSDoc comments for functions
- Document complex algorithms
- Explain business logic decisions
- Include usage examples
- Update README files

### API Documentation
- Document all endpoints
- Include request/response examples
- Specify error codes
- Document rate limits
- Maintain OpenAPI spec

## Security Considerations

### Input Validation
- Validate all user inputs
- Sanitize data before storage
- Use parameterized queries
- Implement rate limiting
- Add CORS protection

### Authentication
- Use secure password hashing
- Implement JWT best practices
- Add refresh token rotation
- Enforce strong passwords
- Implement account lockout

### Data Protection
- Encrypt sensitive data
- Use HTTPS everywhere
- Implement CSP headers
- Regular security audits
- Follow OWASP guidelines

## Performance Targets

### Frontend
- First Contentful Paint <1.5s
- Time to Interactive <3s
- Bundle size <500KB
- 60fps animations
- Optimized images

### Backend
- API latency p50 <100ms
- API latency p99 <500ms
- Database query <50ms
- WebSocket latency <100ms
- Memory usage <512MB

## Monitoring and Logging

### Application Monitoring
- Track error rates
- Monitor response times
- Watch memory usage
- Alert on anomalies
- Generate performance reports

### Business Metrics
- Track user engagement
- Monitor feature usage
- Measure task completion rates
- Analyze user patterns
- Report key metrics

## Final Checklist

Before marking any goal complete:
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No regression issues
- [ ] Performance targets met
- [ ] Security scan passed
- [ ] Accessibility validated
- [ ] Mobile responsive
- [ ] Error handling complete
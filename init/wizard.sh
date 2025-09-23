#!/bin/bash

# Agent Framework Project Initialization Wizard
# Interactive setup for new projects to work with the agent framework

set -e

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Framework paths
FRAMEWORK_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATES_DIR="$FRAMEWORK_DIR/init/templates"

# Project paths (will be set during initialization)
PROJECT_DIR=""
AGENT_DIR=""
DOCS_DIR=""
CONFIG_DIR=""

# Project information (gathered during wizard)
PROJECT_NAME=""
PROJECT_DESC=""
PROJECT_VERSION="0.1.0"
LANGUAGE=""
FRAMEWORKS=""
DATABASE=""
TEST_FRAMEWORK=""
TEST_COMMAND=""
TEST_COVERAGE="80"
SRC_DIR="src"
TEST_DIR="tests"
BUILD_DIR="dist"
ARCHITECTURE=""
GOALS=()

# Helper functions
print_header() {
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}     🤖 Agent Framework Initialization Wizard 🤖      ${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════${NC}"
}

print_section() {
    echo
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo -e "${BLUE}────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Validate directory exists and is writable
validate_directory() {
    local dir="$1"
    
    if [ ! -d "$dir" ]; then
        print_error "Directory does not exist: $dir"
        return 1
    fi
    
    if [ ! -w "$dir" ]; then
        print_error "Directory is not writable: $dir"
        return 1
    fi
    
    return 0
}

# Check if project already has agent configuration
check_existing_config() {
    if [ -d "$PROJECT_DIR/.agents" ]; then
        print_warning "This project already has an .agents directory"
        read -p "Do you want to overwrite the existing configuration? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Initialization cancelled"
            exit 0
        fi
        
        # Backup existing configuration
        local backup_name=".agents.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$PROJECT_DIR/.agents" "$PROJECT_DIR/$backup_name"
        print_success "Backed up existing configuration to $backup_name"
    fi
}

# Step 1: Project Location
gather_project_location() {
    print_section "Step 1: Project Location"
    
    # Default to current directory
    local default_dir="$(pwd)"
    
    echo "Where is your project located?"
    read -p "Project directory [$default_dir]: " input_dir
    
    PROJECT_DIR="${input_dir:-$default_dir}"
    
    # Validate the directory
    if ! validate_directory "$PROJECT_DIR"; then
        print_error "Invalid project directory"
        exit 1
    fi
    
    # Convert to absolute path
    PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
    
    print_success "Project directory: $PROJECT_DIR"
    
    # Check for existing configuration
    check_existing_config
}

# Step 2: Project Information
gather_project_info() {
    print_section "Step 2: Project Information"
    
    # Project name
    local default_name=$(basename "$PROJECT_DIR")
    read -p "Project name [$default_name]: " PROJECT_NAME
    PROJECT_NAME="${PROJECT_NAME:-$default_name}"
    
    # Project description
    read -p "Brief project description: " PROJECT_DESC
    while [ -z "$PROJECT_DESC" ]; do
        print_error "Description is required"
        read -p "Brief project description: " PROJECT_DESC
    done
    
    # Project version
    read -p "Project version [$PROJECT_VERSION]: " input_version
    PROJECT_VERSION="${input_version:-$PROJECT_VERSION}"
    
    print_success "Project: $PROJECT_NAME v$PROJECT_VERSION"
}

# Step 3: Technology Stack
gather_tech_stack() {
    print_section "Step 3: Technology Stack"
    
    # Primary language
    echo "Select primary programming language:"
    select LANGUAGE in \
        "JavaScript/TypeScript" \
        "Python" \
        "Go" \
        "Java" \
        "Rust" \
        "Ruby" \
        "C/C++" \
        "Other"
    do
        if [ -n "$LANGUAGE" ]; then
            break
        fi
    done
    
    # For Other, ask for specifics
    if [ "$LANGUAGE" = "Other" ]; then
        read -p "Specify the language: " LANGUAGE
    fi
    
    print_success "Language: $LANGUAGE"
    
    # Frameworks and libraries
    echo "List main frameworks/libraries (comma-separated):"
    read -p "> " FRAMEWORKS
    
    # Database
    read -p "Database technology (leave empty if none): " DATABASE
    
    # Testing framework
    echo "Testing framework:"
    
    case "$LANGUAGE" in
        "JavaScript/TypeScript")
            select TEST_FRAMEWORK in "Jest" "Mocha" "Vitest" "Cypress" "Playwright" "Other" "None"; do
                [ -n "$TEST_FRAMEWORK" ] && break
            done
            ;;
        "Python")
            select TEST_FRAMEWORK in "pytest" "unittest" "nose2" "Other" "None"; do
                [ -n "$TEST_FRAMEWORK" ] && break
            done
            ;;
        "Go")
            TEST_FRAMEWORK="go test"
            ;;
        *)
            read -p "Testing framework: " TEST_FRAMEWORK
            ;;
    esac
    
    if [ "$TEST_FRAMEWORK" = "Other" ]; then
        read -p "Specify testing framework: " TEST_FRAMEWORK
    fi
    
    print_success "Tech stack configured"
}

# Step 4: Project Structure
gather_project_structure() {
    print_section "Step 4: Project Structure"
    
    # Auto-detect common structures
    if [ -f "$PROJECT_DIR/package.json" ]; then
        print_info "Detected Node.js project"
        [ -d "$PROJECT_DIR/src" ] && SRC_DIR="src"
        [ -d "$PROJECT_DIR/test" ] && TEST_DIR="test"
        [ -d "$PROJECT_DIR/tests" ] && TEST_DIR="tests"
        [ -d "$PROJECT_DIR/dist" ] && BUILD_DIR="dist"
        [ -d "$PROJECT_DIR/build" ] && BUILD_DIR="build"
    elif [ -f "$PROJECT_DIR/setup.py" ] || [ -f "$PROJECT_DIR/pyproject.toml" ]; then
        print_info "Detected Python project"
        [ -d "$PROJECT_DIR/src" ] && SRC_DIR="src"
        [ -d "$PROJECT_DIR/tests" ] && TEST_DIR="tests"
        [ -d "$PROJECT_DIR/test" ] && TEST_DIR="test"
    elif [ -f "$PROJECT_DIR/go.mod" ]; then
        print_info "Detected Go project"
        SRC_DIR="."
        TEST_DIR="."
    fi
    
    # Confirm or modify detected structure
    read -p "Source code directory [$SRC_DIR]: " input_src
    SRC_DIR="${input_src:-$SRC_DIR}"
    
    read -p "Test directory [$TEST_DIR]: " input_test
    TEST_DIR="${input_test:-$TEST_DIR}"
    
    read -p "Build output directory [$BUILD_DIR]: " input_build
    BUILD_DIR="${input_build:-$BUILD_DIR}"
    
    print_success "Project structure configured"
}

# Step 5: Development Goals
gather_goals() {
    print_section "Step 5: Development Goals"
    
    echo "Define your project goals (what the agents should work toward)."
    echo "Enter each goal on a new line. Press Enter twice when done."
    echo
    
    local goal_count=1
    while true; do
        read -p "Goal $goal_count: " goal
        
        if [ -z "$goal" ]; then
            if [ ${#GOALS[@]} -eq 0 ]; then
                print_error "At least one goal is required"
                continue
            fi
            break
        fi
        
        GOALS+=("$goal")
        ((goal_count++))
    done
    
    print_success "Defined ${#GOALS[@]} goals"
}

# Step 6: Testing Strategy
gather_testing_strategy() {
    print_section "Step 6: Testing Strategy"
    
    # Test coverage target
    read -p "Minimum test coverage target (%) [$TEST_COVERAGE]: " input_coverage
    TEST_COVERAGE="${input_coverage:-$TEST_COVERAGE}"
    
    # Validate coverage is a number
    if ! [[ "$TEST_COVERAGE" =~ ^[0-9]+$ ]] || [ "$TEST_COVERAGE" -gt 100 ]; then
        print_warning "Invalid coverage target, using default: 80%"
        TEST_COVERAGE="80"
    fi
    
    # Test command
    echo "What command runs your tests?"
    
    # Suggest based on detected framework
    local suggested_command=""
    case "$TEST_FRAMEWORK" in
        "Jest"|"Mocha"|"Vitest")
            suggested_command="npm test"
            ;;
        "pytest")
            suggested_command="pytest"
            ;;
        "unittest")
            suggested_command="python -m unittest"
            ;;
        "go test")
            suggested_command="go test ./..."
            ;;
    esac
    
    if [ -n "$suggested_command" ]; then
        read -p "Test command [$suggested_command]: " TEST_COMMAND
        TEST_COMMAND="${TEST_COMMAND:-$suggested_command}"
    else
        read -p "Test command: " TEST_COMMAND
        
        while [ -z "$TEST_COMMAND" ]; do
            print_error "Test command is required"
            read -p "Test command: " TEST_COMMAND
        done
    fi
    
    print_success "Testing strategy configured"
}

# Step 7: Architecture Overview
gather_architecture() {
    print_section "Step 7: Architecture Overview"
    
    echo "Briefly describe your project's architecture"
    echo "(e.g., 'Microservices with REST APIs', 'MVC web application', 'CLI tool with plugins')"
    echo
    
    read -p "> " ARCHITECTURE
    
    while [ -z "$ARCHITECTURE" ]; do
        print_error "Architecture description is required"
        read -p "> " ARCHITECTURE
    done
    
    print_success "Architecture documented"
}

# Generate all documentation files
generate_documentation() {
    print_section "Generating Agent Documentation"
    
    # Create directories
    AGENT_DIR="$PROJECT_DIR/.agents"
    DOCS_DIR="$AGENT_DIR/docs"
    CONFIG_DIR="$AGENT_DIR/config"
    
    mkdir -p "$DOCS_DIR" "$CONFIG_DIR"
    mkdir -p "$AGENT_DIR/{logs,status,inboxes,outboxes,workspace,archive}"
    
    # Generate PROJECT_SPEC.md
    generate_project_spec
    
    # Generate GOALS.json
    generate_goals_json
    
    # Generate TESTING_STRATEGY.md
    generate_testing_strategy
    
    # Generate AGENT_INSTRUCTIONS.md
    generate_agent_instructions
    
    # Generate project configuration
    generate_project_config
    
    # Copy agent templates
    copy_agent_templates
    
    print_success "Documentation generated"
}

# Generate PROJECT_SPEC.md
generate_project_spec() {
    cat > "$DOCS_DIR/PROJECT_SPEC.md" << EOF
# $PROJECT_NAME

## Overview
$PROJECT_DESC

**Version:** $PROJECT_VERSION  
**Generated:** $(date '+%Y-%m-%d %H:%M:%S')

## Technology Stack

### Primary Language
$LANGUAGE

### Frameworks & Libraries
$FRAMEWORKS

### Database
${DATABASE:-Not applicable}

### Testing Framework
$TEST_FRAMEWORK

## Project Structure

\`\`\`
$PROJECT_DIR/
├── $SRC_DIR/          # Source code
├── $TEST_DIR/         # Test files
├── $BUILD_DIR/        # Build output
└── .agents/           # Agent framework configuration
\`\`\`

### Key Directories
- **Source Code:** \`$SRC_DIR/\`
- **Tests:** \`$TEST_DIR/\`
- **Build Output:** \`$BUILD_DIR/\`

## Architecture

$ARCHITECTURE

## Development Workflow

### Commands
- **Run Tests:** \`$TEST_COMMAND\`
- **Build:** [Configure in package.json/Makefile/etc.]
- **Run:** [Configure based on project type]

### Quality Standards
- Minimum test coverage: ${TEST_COVERAGE}%
- All tests must pass before marking work complete
- Follow existing code patterns and conventions

## Agent Integration

This project is configured to work with the Agent Framework. The agents will:
1. Analyze the codebase structure
2. Work toward the goals defined in GOALS.json
3. Maintain test coverage above ${TEST_COVERAGE}%
4. Follow the testing strategy outlined in TESTING_STRATEGY.md
5. Adhere to project-specific instructions in AGENT_INSTRUCTIONS.md

## Quick Start for Agents

1. Review this specification
2. Check GOALS.json for current objectives
3. Read AGENT_INSTRUCTIONS.md for role-specific guidance
4. Begin working toward project goals

---
*This document was auto-generated by the Agent Framework initialization wizard.*
EOF
    
    print_success "Created PROJECT_SPEC.md"
}

# Generate GOALS.json
generate_goals_json() {
    local goals_json="{\n"
    goals_json+="  \"project\": \"$PROJECT_NAME\",\n"
    goals_json+="  \"version\": \"$PROJECT_VERSION\",\n"
    goals_json+="  \"generated\": \"$(date -Iseconds)\",\n"
    goals_json+="  \"goals\": [\n"
    
    for i in "${!GOALS[@]}"; do
        goals_json+="    {\n"
        goals_json+="      \"id\": \"goal-$((i+1))\",\n"
        goals_json+="      \"description\": \"${GOALS[$i]}\",\n"
        goals_json+="      \"priority\": \"high\",\n"
        goals_json+="      \"status\": \"pending\",\n"
        goals_json+="      \"created\": \"$(date -Iseconds)\"\n"
        goals_json+="    }"
        
        if [ $i -lt $((${#GOALS[@]}-1)) ]; then
            goals_json+=","
        fi
        goals_json+="\n"
    done
    
    goals_json+="  ],\n"
    goals_json+="  \"metrics\": {\n"
    goals_json+="    \"test_coverage_target\": $TEST_COVERAGE,\n"
    goals_json+="    \"test_coverage_current\": null,\n"
    goals_json+="    \"quality_gates\": {\n"
    goals_json+="      \"tests_must_pass\": true,\n"
    goals_json+="      \"linting_required\": true,\n"
    
    if [[ "$LANGUAGE" == *"TypeScript"* ]]; then
        goals_json+="      \"type_checking\": true\n"
    else
        goals_json+="      \"type_checking\": false\n"
    fi
    
    goals_json+="    }\n"
    goals_json+="  },\n"
    goals_json+="  \"progress\": {\n"
    goals_json+="    \"completed_goals\": 0,\n"
    goals_json+="    \"total_goals\": ${#GOALS[@]},\n"
    goals_json+="    \"last_updated\": \"$(date -Iseconds)\"\n"
    goals_json+="  }\n"
    goals_json+="}"
    
    echo -e "$goals_json" > "$DOCS_DIR/GOALS.json"
    
    print_success "Created GOALS.json"
}

# Generate TESTING_STRATEGY.md
generate_testing_strategy() {
    cat > "$DOCS_DIR/TESTING_STRATEGY.md" << EOF
# Testing Strategy for $PROJECT_NAME

## Overview
This document defines the comprehensive testing approach for $PROJECT_NAME.

## Test Coverage Requirements

### Minimum Coverage
- **Target:** ${TEST_COVERAGE}%
- **Stretch Goal:** $((TEST_COVERAGE + 10))%
- **Critical Paths:** 100%

### Coverage Metrics
- Line coverage
- Branch coverage
- Function coverage

## Test Categories

### Unit Tests
- **Purpose:** Test individual functions and components in isolation
- **Location:** \`$TEST_DIR/unit/\`
- **Naming:** \`*.test.*\` or \`*.spec.*\`
- **Coverage Goal:** All business logic functions

### Integration Tests  
- **Purpose:** Test component interactions and API endpoints
- **Location:** \`$TEST_DIR/integration/\`
- **Coverage Goal:** All API endpoints and service integrations

### End-to-End Tests
- **Purpose:** Validate complete user workflows
- **Location:** \`$TEST_DIR/e2e/\`
- **Coverage Goal:** Critical user paths

## Test Execution

### Command
\`\`\`bash
$TEST_COMMAND
\`\`\`

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
$TEST_FRAMEWORK

### Additional Tools
$(if [[ "$LANGUAGE" == *"JavaScript"* ]] || [[ "$LANGUAGE" == *"TypeScript"* ]]; then
    echo "- ESLint for code quality"
    echo "- Prettier for formatting"
    [ "$TEST_FRAMEWORK" = "Jest" ] && echo "- Jest coverage reports"
elif [[ "$LANGUAGE" == "Python" ]]; then
    echo "- pylint/flake8 for code quality"
    echo "- black for formatting"
    echo "- coverage.py for coverage reports"
elif [[ "$LANGUAGE" == "Go" ]]; then
    echo "- go fmt for formatting"
    echo "- go vet for static analysis"
    echo "- go test -cover for coverage"
fi)

## Critical Test Areas

### Based on Project Architecture
$ARCHITECTURE

### Priority Areas for Testing
1. Core business logic
2. Data validation and transformation
3. External service integrations
4. Error handling and edge cases
5. Security-sensitive operations

## Test Data Management

### Approach
- Use fixtures for consistent test data
- Mock external dependencies
- Use test databases/environments when needed
- Clean up test data after execution

## Performance Testing

### Benchmarks
- Response time requirements
- Throughput expectations
- Resource usage limits

## Agent Guidelines for Testing

### For Tester Agent
1. Run \`$TEST_COMMAND\` regularly
2. Report all failures immediately
3. Track coverage trends
4. Suggest areas needing more tests

### For Coder Agent
1. Write tests for all new code
2. Update tests when modifying existing code
3. Aim for ${TEST_COVERAGE}% coverage minimum

### For Reviewer Agent
1. Verify test coverage in reviews
2. Check test quality, not just presence
3. Ensure tests actually validate behavior

---
*This strategy should be updated as the project evolves.*
EOF
    
    print_success "Created TESTING_STRATEGY.md"
}

# Generate AGENT_INSTRUCTIONS.md
generate_agent_instructions() {
    cat > "$DOCS_DIR/AGENT_INSTRUCTIONS.md" << EOF
# Agent Instructions for $PROJECT_NAME

## Overview
This document provides specific instructions for each agent working on $PROJECT_NAME.

## General Instructions (All Agents)

### Project Context
- **Language:** $LANGUAGE
- **Frameworks:** $FRAMEWORKS
- **Source Directory:** \`$SRC_DIR/\`
- **Test Directory:** \`$TEST_DIR/\`
- **Test Command:** \`$TEST_COMMAND\`

### Quality Standards
1. Maintain ${TEST_COVERAGE}% minimum test coverage
2. All tests must pass before marking work complete
3. Follow existing code patterns and conventions
4. Write clear, maintainable code
5. Document complex logic

### Communication
- Report progress regularly to coordinator
- Request help when blocked
- Share findings that might help other agents

## Coordinator Agent

### Primary Responsibilities
1. Orchestrate work across all agents
2. Prioritize tasks based on GOALS.json
3. Monitor progress toward objectives
4. Ensure balanced workload distribution

### Specific Instructions
- Review GOALS.json daily for priority changes
- Create task breakdowns for complex goals
- Track which agent is working on what
- Identify and resolve bottlenecks
- Report overall progress metrics

### Success Metrics
- All goals progressing steadily
- No agent idle while work exists
- Dependencies resolved proactively

## Planner Agent

### Primary Responsibilities
1. Analyze codebase structure and patterns
2. Create detailed implementation plans
3. Identify technical dependencies
4. Suggest architectural improvements

### Specific Instructions
- Study the project structure in \`$SRC_DIR/\`
- Understand the testing approach in \`$TEST_DIR/\`
- Break complex features into steps
- Consider the architecture: $ARCHITECTURE
- Identify reusable patterns

### Planning Priorities
1. Features that support multiple goals
2. Foundation work that enables future features
3. Technical debt that blocks progress
4. Performance and security improvements

## Tester Agent

### Primary Responsibilities
1. Execute test suite regularly
2. Analyze test failures
3. Report coverage metrics
4. Suggest test improvements

### Specific Instructions
- Run tests using: \`$TEST_COMMAND\`
- Focus on \`$TEST_DIR/\` for test files
- Maintain ${TEST_COVERAGE}% coverage minimum
- Report failures immediately to coder
- Track coverage trends over time

### Testing Focus Areas
$(if [ -n "$DATABASE" ]; then
    echo "- Database operations and queries"
fi)
- API endpoints and responses
- Data validation logic
- Error handling paths
- Edge cases and boundaries

## Coder Agent

### Primary Responsibilities
1. Implement new features
2. Fix bugs and test failures
3. Write corresponding tests
4. Refactor and improve code

### Specific Instructions
- Implement in \`$SRC_DIR/\`
- Write tests in \`$TEST_DIR/\`
- Follow $LANGUAGE best practices
$(if [[ "$LANGUAGE" == *"TypeScript"* ]]; then
    echo "- Ensure proper TypeScript types"
    echo "- Run tsc for type checking"
elif [[ "$LANGUAGE" == "Python" ]]; then
    echo "- Follow PEP 8 style guide"
    echo "- Use type hints where appropriate"
elif [[ "$LANGUAGE" == "Go" ]]; then
    echo "- Run go fmt before committing"
    echo "- Follow Go conventions"
fi)
- Test your code before marking complete

### Coding Standards
1. Clear variable and function names
2. Consistent indentation and formatting
3. Comprehensive error handling
4. Appropriate comments for complex logic
5. No console.logs or debug prints in final code

## Reviewer Agent

### Primary Responsibilities
1. Review code quality and standards
2. Check test coverage
3. Identify potential issues
4. Suggest improvements

### Specific Instructions
- Review all code in \`$SRC_DIR/\`
- Verify tests in \`$TEST_DIR/\`
- Check coverage meets ${TEST_COVERAGE}%
- Ensure consistency with architecture
- Look for security vulnerabilities

### Review Checklist
- [ ] Code follows project conventions
- [ ] Tests cover new/modified code
- [ ] No obvious bugs or issues
- [ ] Error handling is appropriate
- [ ] Documentation is updated if needed
- [ ] Performance implications considered
- [ ] Security best practices followed

## Working with Project Goals

All agents should regularly review GOALS.json to understand:
1. Current priorities
2. Overall project direction
3. Success criteria

### Goal Completion Criteria
A goal is considered complete when:
1. All requirements are implemented
2. Tests are written and passing
3. Code is reviewed and approved
4. Coverage meets requirements
5. Documentation is updated

## Collaboration Guidelines

### Inter-Agent Communication
- **Coordinator → All:** Task assignments and priorities
- **Planner → Coordinator:** Implementation plans and dependencies
- **Tester → Coder:** Test failures and coverage gaps
- **Coder → Tester:** Request testing after changes
- **Reviewer → Coder:** Issues found during review
- **All → Coordinator:** Status updates and blockers

### Escalation Path
1. Try to resolve within agent capabilities
2. Request help from relevant agent
3. Escalate to coordinator if blocked
4. Coordinator may request human intervention

---
*These instructions are specific to $PROJECT_NAME and should be followed by all agents.*
EOF
    
    print_success "Created AGENT_INSTRUCTIONS.md"
}

# Generate project configuration
generate_project_config() {
    cat > "$CONFIG_DIR/project.conf" << EOF
# Project Configuration for Agent Framework
# Generated: $(date '+%Y-%m-%d %H:%M:%S')

# Project Information
PROJECT_NAME="$PROJECT_NAME"
PROJECT_DESC="$PROJECT_DESC"
PROJECT_VERSION="$PROJECT_VERSION"
PROJECT_DIR="$PROJECT_DIR"

# Technology Stack
LANGUAGE="$LANGUAGE"
FRAMEWORKS="$FRAMEWORKS"
DATABASE="$DATABASE"
TEST_FRAMEWORK="$TEST_FRAMEWORK"

# Project Structure
SRC_DIR="$SRC_DIR"
TEST_DIR="$TEST_DIR"
BUILD_DIR="$BUILD_DIR"

# Testing Configuration
TEST_COMMAND="$TEST_COMMAND"
TEST_COVERAGE="$TEST_COVERAGE"

# Agent Framework
FRAMEWORK_DIR="$FRAMEWORK_DIR"
AGENT_BASE_DIR="$PROJECT_DIR/.agents"

# Architecture
ARCHITECTURE="$ARCHITECTURE"

# Load framework defaults
if [ -f "$FRAMEWORK_DIR/config/default.conf" ]; then
    source "$FRAMEWORK_DIR/config/default.conf"
fi
EOF
    
    print_success "Created project configuration"
}

# Copy agent templates to project
copy_agent_templates() {
    local agents_dir="$AGENT_DIR/agents"
    mkdir -p "$agents_dir"
    
    # Copy all agent templates
    for agent_template in "$FRAMEWORK_DIR/agents/templates/"*.sh; do
        if [ -f "$agent_template" ]; then
            local agent_name=$(basename "$agent_template")
            
            # Copy and make executable
            cp "$agent_template" "$agents_dir/$agent_name"
            chmod +x "$agents_dir/$agent_name"
            
            # Update paths in the agent file
            sed -i "s|FRAMEWORK_DIR=\".*\"|FRAMEWORK_DIR=\"$FRAMEWORK_DIR\"|g" "$agents_dir/$agent_name"
            sed -i "s|PROJECT_DIR=\".*\"|PROJECT_DIR=\"$PROJECT_DIR\"|g" "$agents_dir/$agent_name"
        fi
    done
    
    print_success "Copied agent templates"
}

# Create launcher script
create_launcher() {
    local launcher_script="$AGENT_DIR/launch.sh"
    
    cat > "$launcher_script" << 'EOF'
#!/bin/bash

# Agent Framework Launcher for this project
AGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$AGENT_DIR")"

# Use the framework launcher
FRAMEWORK_LAUNCHER="$FRAMEWORK_DIR/launcher/cli/launch.sh"

if [ -f "$FRAMEWORK_LAUNCHER" ]; then
    exec "$FRAMEWORK_LAUNCHER" "$PROJECT_DIR"
else
    echo "Error: Framework launcher not found at $FRAMEWORK_LAUNCHER"
    echo "Please ensure the Agent Framework is properly installed"
    exit 1
fi
EOF
    
    chmod +x "$launcher_script"
    
    # Also create a simple start script
    cat > "$AGENT_DIR/start.sh" << EOF
#!/bin/bash

# Quick start script for agents
cd "$PROJECT_DIR"

echo "Starting Agent Framework for $PROJECT_NAME..."
echo "Project: $PROJECT_DIR"
echo ""

# Launch the framework
exec "$FRAMEWORK_DIR/launcher/cli/launch.sh" "$PROJECT_DIR"
EOF
    
    chmod +x "$AGENT_DIR/start.sh"
    
    print_success "Created launcher scripts"
}

# Show summary and next steps
show_summary() {
    print_header
    echo
    print_section "✅ Initialization Complete!"
    
    echo -e "${GREEN}Project successfully configured for Agent Framework${NC}"
    echo
    echo "📁 Configuration Location: $AGENT_DIR"
    echo
    echo "📄 Generated Documents:"
    echo "   • PROJECT_SPEC.md     - Project specification"
    echo "   • GOALS.json          - Development goals (${#GOALS[@]} goals)"
    echo "   • TESTING_STRATEGY.md - Testing approach"  
    echo "   • AGENT_INSTRUCTIONS.md - Agent-specific guidance"
    echo
    
    print_section "🚀 Next Steps"
    
    echo "1. Review and refine the generated documentation:"
    echo "   cd $AGENT_DIR/docs"
    echo "   \$EDITOR PROJECT_SPEC.md"
    echo
    echo "2. Launch the agents:"
    echo "   $AGENT_DIR/start.sh"
    echo
    echo "3. Or use the framework launcher directly:"
    echo "   $FRAMEWORK_DIR/launcher/cli/launch.sh $PROJECT_DIR"
    echo
    echo "4. Monitor agent progress:"
    echo "   • Agents will work toward goals in GOALS.json"
    echo "   • Check logs in $AGENT_DIR/logs/"
    echo "   • Review completed work in workspace/"
    echo
    
    print_section "📚 Tips"
    
    echo "• Agents will start analyzing your project and working toward goals"
    echo "• You can modify GOALS.json anytime to adjust priorities"
    echo "• Check agent logs for detailed progress information"
    echo "• Use the coordinator's reports for high-level status"
    echo
    
    print_info "Run '$FRAMEWORK_DIR/init/validators/check-readiness.sh $PROJECT_DIR' to validate setup"
}

# Main wizard flow
main() {
    clear
    print_header
    echo
    echo "This wizard will configure your project to work with the Agent Framework."
    echo "The agents will help you achieve your development goals automatically."
    echo
    
    # Run through all steps
    gather_project_location
    gather_project_info
    gather_tech_stack
    gather_project_structure
    gather_goals
    gather_testing_strategy
    gather_architecture
    
    # Generate all files
    generate_documentation
    create_launcher
    
    # Show summary
    show_summary
}

# Run the wizard
main
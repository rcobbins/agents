#!/bin/bash

# Project Validation Script for Agent Framework
# Validates that a project is properly configured and ready for agent automation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Counters
ERRORS=0
WARNINGS=0
CHECKS_PASSED=0
CHECKS_TOTAL=0

# Project directory (default to current or accept as argument)
PROJECT_DIR="${1:-$(pwd)}"

# Validation results storage
VALIDATION_REPORT=""

# Helper functions
print_header() {
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}       🔍 Agent Framework Project Validation 🔍         ${NC}"
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
}

print_section() {
    echo
    echo -e "${BLUE}${BOLD}▶ $1${NC}"
    echo -e "${BLUE}────────────────────────────────────────${NC}"
}

check_pass() {
    echo -e "${GREEN}  ✓ $1${NC}"
    ((CHECKS_PASSED++))
    ((CHECKS_TOTAL++))
    VALIDATION_REPORT+="\n✓ $1"
}

check_fail() {
    echo -e "${RED}  ✗ $1${NC}"
    ((ERRORS++))
    ((CHECKS_TOTAL++))
    VALIDATION_REPORT+="\n✗ ERROR: $1"
}

check_warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
    ((WARNINGS++))
    ((CHECKS_TOTAL++))
    VALIDATION_REPORT+="\n⚠ WARNING: $1"
}

check_info() {
    echo -e "${CYAN}  ℹ $1${NC}"
}

# Validate project directory
validate_project_directory() {
    print_section "Validating Project Directory"
    
    if [ ! -d "$PROJECT_DIR" ]; then
        check_fail "Project directory does not exist: $PROJECT_DIR"
        echo -e "${RED}Cannot continue validation${NC}"
        exit 1
    fi
    
    # Convert to absolute path
    PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
    check_pass "Project directory exists: $PROJECT_DIR"
    
    # Check if it's a git repository (optional but recommended)
    if [ -d "$PROJECT_DIR/.git" ]; then
        check_pass "Project is a git repository"
    else
        check_warn "Project is not a git repository (recommended for version control)"
    fi
}

# Check agent framework configuration
check_agent_configuration() {
    print_section "Checking Agent Configuration"
    
    local agent_dir="$PROJECT_DIR/.agents"
    
    if [ ! -d "$agent_dir" ]; then
        check_fail "Agent configuration directory not found: .agents/"
        check_info "Run the initialization wizard first: agent-framework/init/wizard.sh"
        return 1
    fi
    check_pass "Agent configuration directory exists"
    
    # Check required subdirectories
    local required_dirs=("docs" "config" "logs" "status" "inboxes" "outboxes" "workspace" "agents")
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$agent_dir/$dir" ]; then
            check_pass "Directory .agents/$dir exists"
        else
            check_fail "Missing directory: .agents/$dir"
        fi
    done
}

# Check required documentation
check_documentation() {
    print_section "Checking Required Documentation"
    
    local docs_dir="$PROJECT_DIR/.agents/docs"
    
    # Required documentation files
    local required_docs=(
        "PROJECT_SPEC.md"
        "GOALS.json"
        "TESTING_STRATEGY.md"
        "AGENT_INSTRUCTIONS.md"
    )
    
    for doc in "${required_docs[@]}"; do
        if [ -f "$docs_dir/$doc" ]; then
            check_pass "Found: $doc"
            
            # Additional validation for specific files
            case "$doc" in
                "GOALS.json")
                    validate_goals_json "$docs_dir/$doc"
                    ;;
                "PROJECT_SPEC.md")
                    validate_project_spec "$docs_dir/$doc"
                    ;;
            esac
        else
            check_fail "Missing required document: $doc"
        fi
    done
}

# Validate GOALS.json structure
validate_goals_json() {
    local goals_file="$1"
    
    # Check if file is valid JSON
    if jq empty "$goals_file" 2>/dev/null; then
        check_pass "GOALS.json is valid JSON"
        
        # Check for required fields
        local goal_count=$(jq '.goals | length' "$goals_file" 2>/dev/null || echo "0")
        
        if [ "$goal_count" -eq 0 ]; then
            check_warn "No goals defined in GOALS.json"
        else
            check_pass "$goal_count goal(s) defined"
            
            # Check goal structure
            local valid_goals=$(jq '[.goals[] | has("id") and has("description") and has("priority")] | all' "$goals_file" 2>/dev/null)
            
            if [ "$valid_goals" = "true" ]; then
                check_pass "All goals have required fields"
            else
                check_warn "Some goals missing required fields (id, description, priority)"
            fi
        fi
        
        # Check metrics
        if jq -e '.metrics.test_coverage_target' "$goals_file" >/dev/null 2>&1; then
            local coverage_target=$(jq '.metrics.test_coverage_target' "$goals_file")
            check_pass "Test coverage target defined: ${coverage_target}%"
        else
            check_warn "No test coverage target defined"
        fi
    else
        check_fail "GOALS.json is not valid JSON"
    fi
}

# Validate PROJECT_SPEC.md content
validate_project_spec() {
    local spec_file="$1"
    
    # Check file size (should have substantial content)
    local file_size=$(stat -f%z "$spec_file" 2>/dev/null || stat -c%s "$spec_file" 2>/dev/null || echo "0")
    
    if [ "$file_size" -lt 100 ]; then
        check_warn "PROJECT_SPEC.md seems too small (less than 100 bytes)"
    else
        check_pass "PROJECT_SPEC.md has content"
    fi
    
    # Check for key sections
    local sections=("Overview" "Technology Stack" "Project Structure" "Architecture")
    
    for section in "${sections[@]}"; do
        if grep -q "## $section" "$spec_file" 2>/dev/null; then
            check_pass "PROJECT_SPEC.md contains section: $section"
        else
            check_warn "PROJECT_SPEC.md missing section: $section"
        fi
    done
}

# Check project configuration
check_project_config() {
    print_section "Checking Project Configuration"
    
    local config_file="$PROJECT_DIR/.agents/config/project.conf"
    
    if [ -f "$config_file" ]; then
        check_pass "Project configuration file exists"
        
        # Source the configuration
        source "$config_file" 2>/dev/null || {
            check_fail "Failed to load project configuration"
            return 1
        }
        
        # Check required variables
        local required_vars=("PROJECT_NAME" "PROJECT_DIR" "LANGUAGE" "SRC_DIR" "TEST_DIR" "TEST_COMMAND")
        
        for var in "${required_vars[@]}"; do
            if [ -n "${!var}" ]; then
                check_pass "Configuration has $var: ${!var}"
            else
                check_fail "Configuration missing: $var"
            fi
        done
    else
        check_fail "Project configuration file not found"
    fi
}

# Check project structure
check_project_structure() {
    print_section "Checking Project Structure"
    
    # Load configuration to get directories
    local config_file="$PROJECT_DIR/.agents/config/project.conf"
    
    if [ -f "$config_file" ]; then
        source "$config_file" 2>/dev/null
        
        # Check source directory
        if [ -n "$SRC_DIR" ] && [ -d "$PROJECT_DIR/$SRC_DIR" ]; then
            check_pass "Source directory exists: $SRC_DIR/"
            
            # Count source files
            local src_files=$(find "$PROJECT_DIR/$SRC_DIR" -type f 2>/dev/null | wc -l)
            check_info "Found $src_files file(s) in source directory"
        else
            check_warn "Source directory not found: ${SRC_DIR:-not configured}"
        fi
        
        # Check test directory
        if [ -n "$TEST_DIR" ] && [ -d "$PROJECT_DIR/$TEST_DIR" ]; then
            check_pass "Test directory exists: $TEST_DIR/"
            
            # Count test files
            local test_files=$(find "$PROJECT_DIR/$TEST_DIR" -type f -name "*test*" -o -name "*spec*" 2>/dev/null | wc -l)
            check_info "Found $test_files test file(s)"
        else
            check_warn "Test directory not found: ${TEST_DIR:-not configured}"
        fi
    fi
    
    # Check for common project files
    if [ -f "$PROJECT_DIR/package.json" ]; then
        check_pass "Found package.json (Node.js project)"
    elif [ -f "$PROJECT_DIR/requirements.txt" ] || [ -f "$PROJECT_DIR/setup.py" ] || [ -f "$PROJECT_DIR/pyproject.toml" ]; then
        check_pass "Found Python project files"
    elif [ -f "$PROJECT_DIR/go.mod" ]; then
        check_pass "Found go.mod (Go project)"
    elif [ -f "$PROJECT_DIR/Cargo.toml" ]; then
        check_pass "Found Cargo.toml (Rust project)"
    else
        check_warn "No recognized project configuration files found"
    fi
}

# Check agent templates
check_agent_templates() {
    print_section "Checking Agent Templates"
    
    local agents_dir="$PROJECT_DIR/.agents/agents"
    
    if [ ! -d "$agents_dir" ]; then
        check_fail "Agents directory not found"
        return 1
    fi
    
    # Required agent scripts
    local required_agents=("base-agent.sh" "coordinator.sh" "planner.sh" "tester.sh" "coder.sh" "reviewer.sh")
    
    for agent in "${required_agents[@]}"; do
        if [ -f "$agents_dir/$agent" ]; then
            check_pass "Found agent: $agent"
            
            # Check if executable
            if [ -x "$agents_dir/$agent" ]; then
                check_pass "$agent is executable"
            else
                check_warn "$agent is not executable (chmod +x needed)"
            fi
        else
            check_fail "Missing agent template: $agent"
        fi
    done
}

# Test command validation
check_test_command() {
    print_section "Checking Test Configuration"
    
    local config_file="$PROJECT_DIR/.agents/config/project.conf"
    
    if [ -f "$config_file" ]; then
        source "$config_file" 2>/dev/null
        
        if [ -n "$TEST_COMMAND" ]; then
            check_pass "Test command configured: $TEST_COMMAND"
            
            # Try to verify the command exists
            local test_cmd_base=$(echo "$TEST_COMMAND" | awk '{print $1}')
            
            case "$test_cmd_base" in
                "npm"|"yarn"|"pnpm")
                    if command -v "$test_cmd_base" &> /dev/null; then
                        check_pass "$test_cmd_base is available"
                    else
                        check_warn "$test_cmd_base not found in PATH"
                    fi
                    ;;
                "pytest"|"python"|"go"|"cargo"|"make")
                    if command -v "$test_cmd_base" &> /dev/null; then
                        check_pass "$test_cmd_base is available"
                    else
                        check_warn "$test_cmd_base not found in PATH"
                    fi
                    ;;
                *)
                    check_info "Custom test command: $test_cmd_base"
                    ;;
            esac
        else
            check_fail "No test command configured"
        fi
        
        # Check test coverage target
        if [ -n "$TEST_COVERAGE" ]; then
            check_pass "Test coverage target: ${TEST_COVERAGE}%"
        else
            check_warn "No test coverage target set"
        fi
    fi
}

# Check for dependencies
check_dependencies() {
    print_section "Checking System Dependencies"
    
    # Check for required tools
    if command -v jq &> /dev/null; then
        check_pass "jq is installed (JSON processing)"
    else
        check_warn "jq not installed (required for JSON processing)"
    fi
    
    if command -v git &> /dev/null; then
        check_pass "git is installed"
    else
        check_warn "git not installed (recommended for version control)"
    fi
    
    # Check for Claude CLI (optional but recommended)
    if command -v claude &> /dev/null; then
        check_pass "Claude CLI is installed (AI assistance available)"
    else
        check_warn "Claude CLI not installed (agents will work with limited capabilities)"
        check_info "Install with: pip install claude-cli"
    fi
}

# Check launcher scripts
check_launcher_scripts() {
    print_section "Checking Launcher Scripts"
    
    local launcher="$PROJECT_DIR/.agents/launch.sh"
    local start_script="$PROJECT_DIR/.agents/start.sh"
    
    if [ -f "$launcher" ]; then
        check_pass "Launch script exists"
        if [ -x "$launcher" ]; then
            check_pass "Launch script is executable"
        else
            check_warn "Launch script is not executable"
        fi
    else
        check_warn "Launch script not found"
    fi
    
    if [ -f "$start_script" ]; then
        check_pass "Start script exists"
        if [ -x "$start_script" ]; then
            check_pass "Start script is executable"
        else
            check_warn "Start script is not executable"
        fi
    else
        check_warn "Start script not found"
    fi
}

# Generate validation report
generate_report() {
    local report_file="$PROJECT_DIR/.agents/validation_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
Agent Framework Project Validation Report
==========================================
Date: $(date)
Project: $PROJECT_DIR

Summary
-------
Total Checks: $CHECKS_TOTAL
Passed: $CHECKS_PASSED
Errors: $ERRORS
Warnings: $WARNINGS

Details
-------
$VALIDATION_REPORT

Recommendation
--------------
EOF
    
    if [ $ERRORS -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo "Project is FULLY READY for agent automation!" >> "$report_file"
        else
            echo "Project is READY with minor warnings. Consider addressing warnings for optimal performance." >> "$report_file"
        fi
    else
        echo "Project is NOT READY. Please fix the errors before launching agents." >> "$report_file"
        
        echo -e "\nNext Steps:" >> "$report_file"
        echo "1. Review the errors above" >> "$report_file"
        echo "2. Run the initialization wizard if needed: agent-framework/init/wizard.sh" >> "$report_file"
        echo "3. Fix any missing or incorrect configurations" >> "$report_file"
        echo "4. Run this validation again" >> "$report_file"
    fi
    
    echo -e "\n---\nGenerated by Agent Framework Validator" >> "$report_file"
    
    check_info "Report saved to: $report_file"
}

# Show summary
show_summary() {
    echo
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}                    Validation Summary                   ${NC}"
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
    echo
    
    echo "📊 Results:"
    echo "  • Total Checks: $CHECKS_TOTAL"
    echo -e "  • ${GREEN}Passed: $CHECKS_PASSED${NC}"
    echo -e "  • ${RED}Errors: $ERRORS${NC}"
    echo -e "  • ${YELLOW}Warnings: $WARNINGS${NC}"
    echo
    
    if [ $ERRORS -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "${GREEN}${BOLD}✅ Project is FULLY READY for agent automation!${NC}"
            echo
            echo "You can now launch the agents:"
            echo "  $PROJECT_DIR/.agents/start.sh"
        else
            echo -e "${GREEN}${BOLD}✅ Project is READY for agent automation${NC}"
            echo -e "${YELLOW}⚠ $WARNINGS warning(s) found (non-critical)${NC}"
            echo
            echo "You can launch the agents, but consider addressing the warnings:"
            echo "  $PROJECT_DIR/.agents/start.sh"
        fi
        exit 0
    else
        echo -e "${RED}${BOLD}❌ Project is NOT READY for agent automation${NC}"
        echo -e "${RED}$ERRORS error(s) must be fixed${NC}"
        echo
        echo "Next steps:"
        echo "1. Review the errors above"
        echo "2. Run the initialization wizard if needed:"
        echo "   /home/rob/agent-framework/init/wizard.sh"
        echo "3. Fix missing or incorrect configurations"
        echo "4. Run validation again"
        exit 1
    fi
}

# Main validation flow
main() {
    clear
    print_header
    echo
    echo "Validating project: $PROJECT_DIR"
    echo
    
    # Run all validation checks
    validate_project_directory
    check_agent_configuration
    check_documentation
    check_project_config
    check_project_structure
    check_agent_templates
    check_test_command
    check_dependencies
    check_launcher_scripts
    
    # Generate report
    generate_report
    
    # Show summary
    show_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [PROJECT_DIR]"
        echo
        echo "Validates that a project is properly configured for the Agent Framework."
        echo
        echo "Arguments:"
        echo "  PROJECT_DIR    Directory to validate (defaults to current directory)"
        echo
        echo "Example:"
        echo "  $0 /path/to/my/project"
        exit 0
        ;;
    --version|-v)
        echo "Agent Framework Validator v1.0.0"
        exit 0
        ;;
esac

# Run validation
main
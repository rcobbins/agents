#!/bin/bash

# Tester Agent - Runs tests, analyzes failures, and ensures quality
AGENT_NAME="tester"
AGENT_ROLE="Test Runner and Quality Assurance"

# Source base agent
FRAMEWORK_DIR="${FRAMEWORK_DIR:-$HOME/agent-framework}"
source "$FRAMEWORK_DIR/agents/templates/base-agent.sh"

# Tester-specific configuration
TEST_RESULTS_DIR="$WORKSPACE/test_results"
COVERAGE_DIR="$WORKSPACE/coverage"
FAILURE_ANALYSIS="$WORKSPACE/failure_analysis"

# Initialize tester
initialize_agent() {
    log "Initializing Tester Agent"
    mkdir -p "$TEST_RESULTS_DIR" "$COVERAGE_DIR" "$FAILURE_ANALYSIS"
    
    # Verify test command exists
    if [ -n "$TEST_COMMAND" ]; then
        log "Test command configured: $TEST_COMMAND"
    else
        log_error "No test command configured - will try to detect"
        detect_test_command
    fi
}

# Detect test command if not configured
detect_test_command() {
    log "Attempting to detect test command"
    
    if [ -f "$PROJECT_DIR/package.json" ]; then
        # Node.js project
        if grep -q '"test"' "$PROJECT_DIR/package.json"; then
            TEST_COMMAND="npm test"
            log "Detected npm test command"
        fi
    elif [ -f "$PROJECT_DIR/Makefile" ]; then
        # Make-based project
        if grep -q '^test:' "$PROJECT_DIR/Makefile"; then
            TEST_COMMAND="make test"
            log "Detected make test command"
        fi
    elif [ -f "$PROJECT_DIR/pytest.ini" ] || [ -f "$PROJECT_DIR/setup.cfg" ]; then
        # Python project
        TEST_COMMAND="pytest"
        log "Detected pytest command"
    elif [ -f "$PROJECT_DIR/go.mod" ]; then
        # Go project
        TEST_COMMAND="go test ./..."
        log "Detected go test command"
    fi
    
    if [ -z "$TEST_COMMAND" ]; then
        log_error "Could not detect test command - manual configuration needed"
    fi
}

# Run tests and capture results
run_tests() {
    local focus="${1:-all}"
    local test_run_id="$(date +%s)"
    local result_file="$TEST_RESULTS_DIR/run_${test_run_id}.json"
    
    log "Running tests: $focus"
    
    cd "$PROJECT_DIR" || return 1
    
    # Run the test command
    local start_time=$(date +%s)
    local test_output
    local exit_code
    
    if [ "$focus" = "all" ]; then
        test_output=$($TEST_COMMAND 2>&1)
        exit_code=$?
    else
        # Try to run focused tests
        test_output=$($TEST_COMMAND "$focus" 2>&1)
        exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Parse test output
    local passed=0
    local failed=0
    local skipped=0
    
    # Try to extract test counts (patterns for common frameworks)
    if echo "$test_output" | grep -q "passed"; then
        passed=$(echo "$test_output" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | head -1 || echo "0")
    fi
    if echo "$test_output" | grep -q "failed"; then
        failed=$(echo "$test_output" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1 || echo "0")
    fi
    if echo "$test_output" | grep -q "skipped"; then
        skipped=$(echo "$test_output" | grep -oE '[0-9]+ skipped' | grep -oE '[0-9]+' | head -1 || echo "0")
    fi
    
    # Create test result
    local test_result="{
        \"run_id\": \"$test_run_id\",
        \"timestamp\": \"$(date -Iseconds)\",
        \"focus\": \"$focus\",
        \"command\": \"$TEST_COMMAND\",
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"summary\": {
            \"passed\": $passed,
            \"failed\": $failed,
            \"skipped\": $skipped,
            \"total\": $((passed + failed + skipped))
        },
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false")
    }"
    
    echo "$test_result" > "$result_file"
    
    # Save full output
    echo "$test_output" > "$TEST_RESULTS_DIR/run_${test_run_id}_output.txt"
    
    # Analyze failures if any
    if [ $failed -gt 0 ] || [ $exit_code -ne 0 ]; then
        analyze_test_failures "$test_output" "$test_run_id"
    fi
    
    log "Test run complete: $passed passed, $failed failed, $skipped skipped"
    
    # Return result
    echo "$test_result"
}

# Analyze test failures
analyze_test_failures() {
    local test_output="$1"
    local run_id="$2"
    
    log "Analyzing test failures"
    
    local failure_file="$FAILURE_ANALYSIS/run_${run_id}_failures.json"
    
    # Extract failure information
    local failures="[]"
    
    # Common patterns for test failures
    while IFS= read -r line; do
        if echo "$line" | grep -qE "(FAIL|FAILED|Error|AssertionError)"; then
            local failure_entry="{
                \"line\": $(echo "$line" | jq -Rs .),
                \"type\": \"failure\"
            }"
            failures=$(echo "$failures" | jq ". += [$failure_entry]")
        fi
    done <<< "$test_output"
    
    # Use AI to analyze if available
    if command -v claude &> /dev/null && [ "$(echo "$failures" | jq 'length')" -gt 0 ]; then
        local analysis_prompt="Analyze these test failures and suggest fixes:

Test Output:
$(echo "$test_output" | tail -100)

Project Context:
$PROJECT_SPEC

Provide a JSON response:
{
  \"root_causes\": [\"List of identified root causes\"],
  \"affected_files\": [\"Files that likely need changes\"],
  \"suggested_fixes\": [
    {
      \"file\": \"path/to/file\",
      \"issue\": \"Description of issue\",
      \"fix\": \"Suggested fix\"
    }
  ],
  \"priority\": \"high|medium|low\"
}"

        local analysis=$(ask_claude "$analysis_prompt")
        
        if [ "$analysis" != "" ] && [ "$analysis" != "*error*" ]; then
            echo "$analysis" > "$failure_file"
            
            # Report to coordinator
            report_failures_to_coordinator "$run_id" "$analysis"
        fi
    else
        # Save basic failure info
        echo "{\"failures\": $failures, \"run_id\": \"$run_id\"}" > "$failure_file"
    fi
}

# Check test coverage
check_coverage() {
    log "Checking test coverage"
    
    local coverage_file="$COVERAGE_DIR/coverage_$(date +%s).json"
    
    # Try different coverage commands based on project type
    local coverage_output=""
    local coverage_percent=0
    
    if [ -f "$PROJECT_DIR/package.json" ]; then
        # Node.js with possible coverage
        if npm run coverage 2>/dev/null; then
            coverage_output=$(npm run coverage 2>&1)
        elif npx jest --coverage 2>/dev/null; then
            coverage_output=$(npx jest --coverage 2>&1)
        fi
    elif command -v pytest &> /dev/null; then
        # Python with pytest
        coverage_output=$(cd "$PROJECT_DIR" && pytest --cov 2>&1)
    elif command -v go &> /dev/null; then
        # Go coverage
        coverage_output=$(cd "$PROJECT_DIR" && go test -cover ./... 2>&1)
    fi
    
    # Try to extract coverage percentage
    if echo "$coverage_output" | grep -qE '[0-9]+(\.[0-9]+)?%'; then
        coverage_percent=$(echo "$coverage_output" | grep -oE '[0-9]+(\.[0-9]+)?%' | grep -oE '[0-9]+(\.[0-9]+)?' | head -1)
    fi
    
    local coverage_report="{
        \"timestamp\": \"$(date -Iseconds)\",
        \"coverage_percent\": ${coverage_percent:-0},
        \"meets_target\": $([ "${coverage_percent%.*}" -ge "${TEST_COVERAGE:-80}" ] && echo "true" || echo "false"),
        \"target\": ${TEST_COVERAGE:-80}
    }"
    
    echo "$coverage_report" > "$coverage_file"
    
    log "Coverage: ${coverage_percent}% (target: ${TEST_COVERAGE:-80}%)"
    
    echo "$coverage_report"
}

# Create test for new code
create_test() {
    local target_file="$1"
    local test_type="${2:-unit}"
    
    log "Creating $test_type test for $target_file"
    
    if [ ! -f "$PROJECT_DIR/$target_file" ]; then
        log_error "Target file not found: $target_file"
        return 1
    fi
    
    # Read the target file
    local code_content=$(cat "$PROJECT_DIR/$target_file")
    
    local test_prompt="Create a comprehensive $test_type test for this code:

File: $target_file
Code:
\`\`\`
$(echo "$code_content" | head -200)
\`\`\`

Project uses: $LANGUAGE
Test framework: $TEST_FRAMEWORK
Test directory: $TEST_DIR

Create a complete test file with:
1. All necessary imports
2. Test setup/teardown if needed
3. Multiple test cases covering:
   - Normal operation
   - Edge cases
   - Error conditions
4. Clear test names and assertions

Format as a complete test file ready to save."

    local test_content=$(ask_claude "$test_prompt")
    
    if [ "$test_content" != "" ] && [ "$test_content" != "*error*" ]; then
        # Determine test file name
        local test_file_name=$(basename "$target_file")
        test_file_name="${test_file_name%.*}.test${test_file_name##*.}"
        local test_path="$PROJECT_DIR/$TEST_DIR/$test_file_name"
        
        # Save test file
        echo "$test_content" > "$test_path"
        log "Test created: $test_path"
        
        # Run the new test
        run_tests "$test_path"
        
        return 0
    fi
    
    log_error "Could not generate test for $target_file"
    return 1
}

# Report failures to coordinator
report_failures_to_coordinator() {
    local run_id="$1"
    local analysis="$2"
    
    local report="{
        \"type\": \"agent_report\",
        \"agent\": \"$AGENT_NAME\",
        \"status\": \"test_failures\",
        \"run_id\": \"$run_id\",
        \"analysis\": $analysis,
        \"timestamp\": \"$(date -Iseconds)\"
    }"
    
    send_message "coordinator" "$report" "high"
}

# Override handle_task for tester
handle_task() {
    local content="$1"
    
    local msg_type=$(echo "$content" | jq -r '.type // "run_tests"' 2>/dev/null)
    
    case "$msg_type" in
        "task_assignment")
            local task=$(echo "$content" | jq '.task')
            local task_id=$(echo "$task" | jq -r '.id')
            local description=$(echo "$task" | jq -r '.description')
            
            log "Running tests for task: $description"
            
            # Run tests
            local test_result=$(run_tests "all")
            
            # Check coverage
            local coverage=$(check_coverage)
            
            # Report results
            local report="{
                \"type\": \"agent_report\",
                \"agent\": \"$AGENT_NAME\",
                \"task_id\": \"$task_id\",
                \"status\": \"completed\",
                \"test_result\": $test_result,
                \"coverage\": $coverage,
                \"outcome\": \"Tests executed and analyzed\",
                \"impact\": \"Quality assurance maintained\"
            }"
            
            send_message "coordinator" "$report"
            ;;
            
        "run_tests")
            local focus=$(echo "$content" | jq -r '.focus // "all"')
            run_tests "$focus"
            ;;
            
        "check_coverage")
            check_coverage
            ;;
            
        "create_test")
            local target=$(echo "$content" | jq -r '.target')
            local test_type=$(echo "$content" | jq -r '.type // "unit"')
            create_test "$target" "$test_type"
            ;;
            
        *)
            log "Unknown message type: $msg_type"
            ;;
    esac
}

# Periodic testing tasks
periodic_tasks() {
    # Run full test suite every hour
    if [ $(($(date +%s) % 3600)) -eq 0 ]; then
        log "Running periodic full test suite"
        run_tests "all"
    fi
    
    # Check coverage every 30 minutes
    if [ $(($(date +%s) % 1800)) -eq 0 ]; then
        check_coverage
    fi
    
    # Clean old test results daily
    if [ $(($(date +%s) % 86400)) -eq 0 ]; then
        find "$TEST_RESULTS_DIR" -type f -mtime +30 -delete
        find "$FAILURE_ANALYSIS" -type f -mtime +30 -delete
    fi
}

# Start the tester
log "Tester Agent starting..."
run_agent
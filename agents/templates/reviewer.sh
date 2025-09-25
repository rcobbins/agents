#!/bin/bash

# Reviewer Agent - Code review, quality checks, and standards enforcement
AGENT_NAME="reviewer"
AGENT_ROLE="Code Quality and Standards Reviewer"

# Source base agent
FRAMEWORK_DIR="${FRAMEWORK_DIR:-$HOME/agent-framework}"
source "$FRAMEWORK_DIR/agents/templates/base-agent.sh"

# Reviewer-specific configuration
REVIEW_REPORTS="$WORKSPACE/reviews"
QUALITY_METRICS="$WORKSPACE/metrics"
LINT_RESULTS="$WORKSPACE/lint"

# Initialize reviewer
initialize_agent() {
    log "Initializing Reviewer Agent"
    mkdir -p "$REVIEW_REPORTS" "$QUALITY_METRICS" "$LINT_RESULTS"
    
    # Detect available linters and tools
    detect_quality_tools
}

# Detect available quality tools
detect_quality_tools() {
    log "Detecting quality tools"
    
    AVAILABLE_TOOLS=""
    
    # JavaScript/TypeScript tools
    if command -v eslint &> /dev/null; then
        AVAILABLE_TOOLS+="eslint "
    fi
    if command -v tsc &> /dev/null; then
        AVAILABLE_TOOLS+="typescript "
    fi
    if command -v prettier &> /dev/null; then
        AVAILABLE_TOOLS+="prettier "
    fi
    
    # Python tools
    if command -v pylint &> /dev/null; then
        AVAILABLE_TOOLS+="pylint "
    fi
    if command -v black &> /dev/null; then
        AVAILABLE_TOOLS+="black "
    fi
    if command -v mypy &> /dev/null; then
        AVAILABLE_TOOLS+="mypy "
    fi
    
    # General tools
    if command -v git &> /dev/null; then
        AVAILABLE_TOOLS+="git "
    fi
    
    log "Available tools: ${AVAILABLE_TOOLS:-none}"
}

# Perform code review
review_code() {
    local target="${1:-$SRC_DIR}"
    local review_type="${2:-comprehensive}"
    
    log "Performing $review_type review of $target"
    
    local review_id="review_$(date +%s)"
    local review_report="$REVIEW_REPORTS/${review_id}.json"
    
    # Initialize review results
    local issues="[]"
    local metrics="{}"
    
    # Run automated checks
    if [ -n "$AVAILABLE_TOOLS" ]; then
        issues=$(run_automated_checks "$target")
        metrics=$(calculate_code_metrics "$target")
    fi
    
    # Perform AI-assisted review if available
    if command -v claude &> /dev/null; then
        local ai_review=$(perform_ai_review "$target" "$review_type")
        
        if [ "$ai_review" != "" ] && [ "$ai_review" != "*error*" ]; then
            # Merge AI findings with automated checks
            issues=$(merge_review_findings "$issues" "$ai_review")
        fi
    fi
    
    # Create review report
    local review="{
        \"review_id\": \"$review_id\",
        \"timestamp\": \"$(date -Iseconds)\",
        \"target\": \"$target\",
        \"type\": \"$review_type\",
        \"issues\": $issues,
        \"metrics\": $metrics,
        \"summary\": $(generate_review_summary "$issues" "$metrics")
    }"
    
    echo "$review" > "$review_report"
    log "Review complete: $(echo "$issues" | jq 'length') issues found"
    
    echo "$review"
}

# Run automated quality checks
run_automated_checks() {
    local target="$1"
    local all_issues="[]"
    
    cd "$PROJECT_DIR" || return
    
    # ESLint for JavaScript/TypeScript
    if [[ "$AVAILABLE_TOOLS" == *"eslint"* ]]; then
        log "Running ESLint..."
        local eslint_output=$(eslint "$target" --format json 2>/dev/null || echo "[]")
        
        if [ "$eslint_output" != "[]" ]; then
            local eslint_issues=$(echo "$eslint_output" | jq '[.[] | .messages[] | {
                file: .filePath,
                line: .line,
                column: .column,
                severity: .severity,
                message: .message,
                rule: .ruleId,
                tool: "eslint"
            }]' 2>/dev/null || echo "[]")
            
            all_issues=$(echo "$all_issues" | jq ". += $eslint_issues")
        fi
    fi
    
    # TypeScript compiler
    if [[ "$AVAILABLE_TOOLS" == *"typescript"* ]] && [ -f "$PROJECT_DIR/tsconfig.json" ]; then
        log "Running TypeScript check..."
        local tsc_output=$(tsc --noEmit --pretty false 2>&1 || true)
        
        if echo "$tsc_output" | grep -q "error TS"; then
            # Parse TypeScript errors
            local ts_issues="[]"
            while IFS= read -r line; do
                if echo "$line" | grep -q "error TS"; then
                    local issue="{
                        \"file\": \"$(echo "$line" | cut -d: -f1)\",
                        \"message\": \"$(echo "$line" | sed 's/.*error TS[0-9]*: //')\",
                        \"severity\": \"error\",
                        \"tool\": \"typescript\"
                    }"
                    ts_issues=$(echo "$ts_issues" | jq ". += [$issue]")
                fi
            done <<< "$tsc_output"
            
            all_issues=$(echo "$all_issues" | jq ". += $ts_issues")
        fi
    fi
    
    # Python linting
    if [[ "$AVAILABLE_TOOLS" == *"pylint"* ]]; then
        log "Running pylint..."
        local pylint_output=$(pylint "$target" --output-format=json 2>/dev/null || echo "[]")
        
        if [ "$pylint_output" != "[]" ]; then
            local pylint_issues=$(echo "$pylint_output" | jq '[.[] | {
                file: .path,
                line: .line,
                column: .column,
                severity: .type,
                message: .message,
                symbol: .symbol,
                tool: "pylint"
            }]' 2>/dev/null || echo "[]")
            
            all_issues=$(echo "$all_issues" | jq ". += $pylint_issues")
        fi
    fi
    
    echo "$all_issues"
}

# Calculate code metrics
calculate_code_metrics() {
    local target="$1"
    
    local metrics="{}"
    
    # Count lines of code
    local loc=$(find "$PROJECT_DIR/$target" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    metrics=$(echo "$metrics" | jq ".lines_of_code = $loc")
    
    # Count files
    local file_count=$(find "$PROJECT_DIR/$target" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" \) 2>/dev/null | wc -l)
    metrics=$(echo "$metrics" | jq ".file_count = $file_count")
    
    # Check for common issues
    local todo_count=$(grep -r "TODO\|FIXME\|XXX" "$PROJECT_DIR/$target" 2>/dev/null | wc -l || echo "0")
    metrics=$(echo "$metrics" | jq ".todo_count = $todo_count")
    
    # Complexity estimate (basic)
    if [ $file_count -gt 0 ]; then
        local avg_file_size=$((loc / file_count))
        metrics=$(echo "$metrics" | jq ".avg_file_size = $avg_file_size")
        
        # Simple complexity rating
        local complexity="low"
        [ $avg_file_size -gt 200 ] && complexity="medium"
        [ $avg_file_size -gt 500 ] && complexity="high"
        metrics=$(echo "$metrics" | jq ".complexity = \"$complexity\"")
    fi
    
    echo "$metrics"
}

# Perform AI-assisted code review
perform_ai_review() {
    local target="$1"
    local review_type="$2"
    
    log "Performing AI review of $target"
    
    # Sample some files for review
    local code_samples=""
    local sample_count=0
    
    while IFS= read -r file && [ $sample_count -lt 3 ]; do
        if [ -f "$file" ]; then
            code_samples+="File: ${file#$PROJECT_DIR/}
\`\`\`
$(head -100 "$file")
\`\`\`

"
            ((sample_count++))
        fi
    done < <(find "$PROJECT_DIR/$target" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) 2>/dev/null | sort -R)
    
    local review_prompt="Perform a $review_type code review of these files:

$code_samples

Project Context:
$PROJECT_SPEC

Review for:
1. Code quality and maintainability
2. Potential bugs or issues
3. Performance concerns
4. Security vulnerabilities
5. Best practice violations
6. Missing error handling
7. Code duplication

Provide review findings as JSON:
{
  \"findings\": [
    {
      \"file\": \"path/to/file\",
      \"line\": 10,
      \"severity\": \"error|warning|info\",
      \"category\": \"bug|performance|security|style|maintainability\",
      \"message\": \"Description of issue\",
      \"suggestion\": \"How to fix it\"
    }
  ],
  \"overall_quality\": \"excellent|good|fair|poor\",
  \"recommendations\": [\"List of general recommendations\"]
}"

    local ai_review=$(ask_claude "$review_prompt")
    
    if [ "$ai_review" != "" ] && [ "$ai_review" != "*error*" ]; then
        echo "$ai_review"
    else
        echo "{\"findings\": [], \"overall_quality\": \"unknown\", \"recommendations\": []}"
    fi
}

# Merge review findings
merge_review_findings() {
    local automated="$1"
    local ai_review="$2"
    
    # Extract AI findings
    local ai_findings=$(echo "$ai_review" | jq '.findings // []')
    
    # Combine with automated findings
    local combined=$(echo "$automated" | jq ". += $ai_findings")
    
    # Remove duplicates based on file and message similarity
    echo "$combined" | jq 'unique_by(.file + .message)'
}

# Generate review summary
generate_review_summary() {
    local issues="$1"
    local metrics="$2"
    
    local issue_count=$(echo "$issues" | jq 'length')
    local error_count=$(echo "$issues" | jq '[.[] | select(.severity == "error")] | length')
    local warning_count=$(echo "$issues" | jq '[.[] | select(.severity == "warning")] | length')
    
    local summary="{
        \"total_issues\": $issue_count,
        \"errors\": $error_count,
        \"warnings\": $warning_count,
        \"quality_score\": $(calculate_quality_score "$issue_count" "$error_count" "$metrics"),
        \"pass\": $([ $error_count -eq 0 ] && echo "true" || echo "false")
    }"
    
    echo "$summary" | jq -c '.'
}

# Calculate quality score
calculate_quality_score() {
    local total_issues="$1"
    local errors="$2"
    local metrics="$3"
    
    # Simple scoring: Start at 100, deduct points
    local score=100
    
    # Deduct for issues
    score=$((score - errors * 10))
    score=$((score - (total_issues - errors) * 2))
    
    # Deduct for TODOs
    local todos=$(echo "$metrics" | jq '.todo_count // 0')
    score=$((score - todos))
    
    # Ensure score is between 0 and 100
    [ $score -lt 0 ] && score=0
    [ $score -gt 100 ] && score=100
    
    echo $score
}

# Check specific PR or commit
review_changes() {
    local base_ref="${1:-HEAD~1}"
    local target_ref="${2:-HEAD}"
    
    log "Reviewing changes from $base_ref to $target_ref"
    
    if ! command -v git &> /dev/null || [ ! -d "$PROJECT_DIR/.git" ]; then
        log_error "Git not available or not a git repository"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Get changed files
    local changed_files=$(git diff --name-only "$base_ref" "$target_ref")
    
    if [ -z "$changed_files" ]; then
        log "No changes to review"
        return 0
    fi
    
    # Review each changed file
    local all_issues="[]"
    
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Get the diff for context
            local diff=$(git diff "$base_ref" "$target_ref" -- "$file")
            
            # Review this specific change
            local file_issues=$(review_file_changes "$file" "$diff")
            all_issues=$(echo "$all_issues" | jq ". += $file_issues")
        fi
    done <<< "$changed_files"
    
    # Create change review report
    local review="{
        \"type\": \"change_review\",
        \"base\": \"$base_ref\",
        \"target\": \"$target_ref\",
        \"files_changed\": $(echo "$changed_files" | wc -l),
        \"issues\": $all_issues,
        \"timestamp\": \"$(date -Iseconds)\"
    }"
    
    echo "$review"
}

# Review specific file changes
review_file_changes() {
    local file="$1"
    local diff="$2"
    
    if ! command -v claude &> /dev/null; then
        echo "[]"
        return
    fi
    
    local review_prompt="Review this code change:

File: $file

Diff:
\`\`\`diff
$(echo "$diff" | head -200)
\`\`\`

Check for:
1. Logic errors introduced
2. Missing edge cases
3. Performance regressions
4. Security issues
5. Breaking changes

Provide issues as JSON array:
[{
  \"file\": \"$file\",
  \"line\": 10,
  \"severity\": \"error|warning|info\",
  \"message\": \"Issue description\",
  \"suggestion\": \"How to fix\"
}]"

    local issues=$(ask_claude "$review_prompt")
    
    if [ "$issues" != "" ] && [ "$issues" != "*error*" ]; then
        echo "$issues"
    else
        echo "[]"
    fi
}

# Report review results to coordinator
report_review_complete() {
    local task_id="$1"
    local review="$2"
    
    local issues=$(echo "$review" | jq '.issues')
    local summary=$(echo "$review" | jq '.summary')
    
    local report="{
        \"type\": \"agent_report\",
        \"agent\": \"$AGENT_NAME\",
        \"task_id\": \"$task_id\",
        \"status\": \"completed\",
        \"review\": $review,
        \"issues_found\": $(echo "$issues" | jq 'length'),
        \"outcome\": \"Code review complete\",
        \"impact\": \"Quality assurance performed\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"
    
    send_message "coordinator" "$report" "high"
    
    # If critical issues found, notify coder
    local error_count=$(echo "$summary" | jq '.errors // 0')
    if [ $error_count -gt 0 ]; then
        local fix_request="{
            \"type\": \"fix_request\",
            \"from\": \"$AGENT_NAME\",
            \"issues\": $(echo "$issues" | jq '[.[] | select(.severity == \"error\")]'),
            \"priority\": \"high\"
        }"
        
        send_message "coder" "$fix_request"
    fi
}

# Override handle_task for reviewer
handle_task() {
    local content="$1"
    
    local msg_type=$(echo "$content" | jq -r '.type // "review"' 2>/dev/null)
    
    case "$msg_type" in
        "task_assignment")
            local task=$(echo "$content" | jq '.task')
            local task_id=$(echo "$task" | jq -r '.id')
            local description=$(echo "$task" | jq -r '.description')
            
            log "Reviewing for task: $description"
            
            # Perform review
            local review=$(review_code "$SRC_DIR" "comprehensive")
            
            # Report results
            report_review_complete "$task_id" "$review"
            ;;
            
        "review_changes")
            local base=$(echo "$content" | jq -r '.base // "HEAD~1"')
            local target=$(echo "$content" | jq -r '.target // "HEAD"')
            
            review_changes "$base" "$target"
            ;;
            
        "review_file")
            local file=$(echo "$content" | jq -r '.file')
            
            review_code "$file" "focused"
            ;;
            
        "quality_check")
            # Quick quality check
            local metrics=$(calculate_code_metrics "$SRC_DIR")
            
            local report="{
                \"type\": \"quality_metrics\",
                \"metrics\": $metrics,
                \"timestamp\": \"$(date -Iseconds)\"
            }"
            
            send_message "coordinator" "$report"
            ;;
            
        *)
            log "Unknown message type: $msg_type"
            ;;
    esac
}

# Periodic review tasks
periodic_tasks() {
    # Run quality metrics every hour
    if [ $(($(date +%s) % 3600)) -eq 0 ]; then
        local metrics=$(calculate_code_metrics "$SRC_DIR")
        echo "$metrics" > "$QUALITY_METRICS/metrics_$(date +%Y%m%d_%H).json"
    fi
    
    # Clean old review reports weekly
    if [ $(($(date +%s) % 604800)) -eq 0 ]; then
        find "$REVIEW_REPORTS" -type f -mtime +30 -delete
        find "$LINT_RESULTS" -type f -mtime +7 -delete
    fi
}

# Start the reviewer
log "Reviewer Agent starting..."
run_agent
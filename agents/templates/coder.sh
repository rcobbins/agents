#!/bin/bash

# Coder Agent - Implements features, fixes bugs, writes code
AGENT_NAME="coder"
AGENT_ROLE="Code Implementation and Bug Fixing"

# Source base agent
FRAMEWORK_DIR="${FRAMEWORK_DIR:-$HOME/agent-framework}"
source "$FRAMEWORK_DIR/agents/templates/base-agent.sh"

# Coder-specific configuration
CODE_BACKUPS="$WORKSPACE/backups"
IMPLEMENTATIONS="$WORKSPACE/implementations"
PATCHES="$WORKSPACE/patches"

# Initialize coder
initialize_agent() {
    log "Initializing Coder Agent"
    mkdir -p "$CODE_BACKUPS" "$IMPLEMENTATIONS" "$PATCHES"
    
    # Check for development tools
    check_dev_tools
}

# Check available development tools
check_dev_tools() {
    log "Checking development tools"
    
    # Check for common tools
    local tools_status=""
    
    if command -v git &> /dev/null; then
        tools_status+="git:available "
    fi
    
    if command -v npm &> /dev/null; then
        tools_status+="npm:available "
    elif command -v yarn &> /dev/null; then
        tools_status+="yarn:available "
    fi
    
    if command -v python &> /dev/null; then
        tools_status+="python:available "
    fi
    
    if command -v make &> /dev/null; then
        tools_status+="make:available "
    fi
    
    log "Development tools: $tools_status"
}

# Implement a feature based on plan
implement_feature() {
    local task="$1"
    local plan="${2:-}"
    
    local task_id=$(echo "$task" | jq -r '.id')
    local description=$(echo "$task" | jq -r '.description')
    
    log "Implementing feature: $description"
    
    # Create implementation directory
    local impl_dir="$IMPLEMENTATIONS/${task_id}"
    mkdir -p "$impl_dir"
    
    # If we have a plan, follow it
    if [ -n "$plan" ] && [ "$plan" != "null" ]; then
        implement_from_plan "$task_id" "$plan" "$impl_dir"
    else
        # Generate implementation without plan
        implement_without_plan "$task" "$impl_dir"
    fi
}

# Implement based on a plan
implement_from_plan() {
    local task_id="$1"
    local plan="$2"
    local impl_dir="$3"
    
    log "Following implementation plan for task $task_id"
    
    # Extract steps from plan
    local steps=$(echo "$plan" | jq -c '.steps[]' 2>/dev/null)
    
    if [ -z "$steps" ]; then
        log_error "No steps found in plan"
        return 1
    fi
    
    local all_changes="[]"
    
    # Process each step
    while IFS= read -r step; do
        local action=$(echo "$step" | jq -r '.action')
        local target=$(echo "$step" | jq -r '.target')
        
        log "Executing step: $action on $target"
        
        # Generate code for this step
        local code_changes=$(generate_code_for_step "$action" "$target" "$step")
        
        if [ "$code_changes" != "" ]; then
            all_changes=$(echo "$all_changes" | jq ". += [$code_changes]")
        fi
    done <<< "$steps"
    
    # Apply all changes
    apply_code_changes "$all_changes" "$impl_dir"
    
    # Report completion
    report_implementation_complete "$task_id" "$all_changes"
}

# Generate code for a specific step
generate_code_for_step() {
    local action="$1"
    local target="$2"
    local step="$3"
    
    # Check if target file exists
    local existing_code=""
    if [ -f "$PROJECT_DIR/$target" ]; then
        existing_code=$(cat "$PROJECT_DIR/$target")
        
        # Backup existing file
        cp "$PROJECT_DIR/$target" "$CODE_BACKUPS/$(basename $target)_$(date +%s)"
    fi
    
    local code_prompt="Implement this specific step of the plan:

Action: $action
Target: $target
Step Details: $step

Project Context:
$PROJECT_SPEC

Current Code (if exists):
\`\`\`
$(echo "$existing_code" | head -200)
\`\`\`

Provide the implementation as JSON:
{
  \"file\": \"$target\",
  \"action_type\": \"create|modify|delete\",
  \"content\": \"Full file content or modifications\",
  \"description\": \"What this change does\"
}"

    local implementation=$(ask_claude "$code_prompt")
    
    if [ "$implementation" != "" ] && [ "$implementation" != "*error*" ]; then
        echo "$implementation"
    else
        # Fallback to basic implementation
        echo "{
            \"file\": \"$target\",
            \"action_type\": \"modify\",
            \"content\": \"// TODO: Implement $action\",
            \"description\": \"Placeholder for $action\"
        }"
    fi
}

# Implement without a plan
implement_without_plan() {
    local task="$1"
    local impl_dir="$2"
    
    local description=$(echo "$task" | jq -r '.description')
    local task_type=$(echo "$task" | jq -r '.type // "feature"')
    
    log "Implementing without plan: $description"
    
    local impl_prompt="Implement this task directly:

Task: $description
Type: $task_type

Project Context:
$PROJECT_SPEC

Project Structure:
- Source: $SRC_DIR
- Tests: $TEST_DIR
- Language: $LANGUAGE

Provide a complete implementation as JSON:
{
  \"files\": [
    {
      \"path\": \"relative/path/to/file\",
      \"action\": \"create|modify\",
      \"content\": \"Full file content\",
      \"description\": \"What this file does\"
    }
  ],
  \"tests\": [
    {
      \"path\": \"test/file/path\",
      \"content\": \"Test file content\"
    }
  ],
  \"commands_to_run\": [\"List of commands to execute after changes\"]
}"

    local implementation=$(ask_claude "$impl_prompt")
    
    if [ "$implementation" != "" ] && [ "$implementation" != "*error*" ]; then
        # Process implementation
        process_implementation "$implementation" "$impl_dir"
        
        # Report completion
        local task_id=$(echo "$task" | jq -r '.id')
        report_implementation_complete "$task_id" "$implementation"
    else
        log_error "Could not generate implementation"
    fi
}

# Apply code changes to files
apply_code_changes() {
    local changes="$1"
    local impl_dir="$2"
    
    log "Applying code changes"
    
    echo "$changes" | jq -c '.[]' | while IFS= read -r change; do
        local file=$(echo "$change" | jq -r '.file // .path')
        local action_type=$(echo "$change" | jq -r '.action_type // .action')
        local content=$(echo "$change" | jq -r '.content')
        
        local full_path="$PROJECT_DIR/$file"
        
        case "$action_type" in
            "create")
                log "Creating file: $file"
                mkdir -p "$(dirname "$full_path")"
                echo "$content" > "$full_path"
                ;;
            "modify")
                log "Modifying file: $file"
                if [ -f "$full_path" ]; then
                    # Backup first
                    cp "$full_path" "$impl_dir/$(basename $file).backup"
                fi
                echo "$content" > "$full_path"
                ;;
            "delete")
                log "Deleting file: $file"
                if [ -f "$full_path" ]; then
                    mv "$full_path" "$impl_dir/$(basename $file).deleted"
                fi
                ;;
        esac
    done
}

# Process a complete implementation
process_implementation() {
    local implementation="$1"
    local impl_dir="$2"
    
    # Apply file changes
    local files=$(echo "$implementation" | jq '.files')
    if [ "$files" != "null" ] && [ "$files" != "[]" ]; then
        apply_code_changes "$files" "$impl_dir"
    fi
    
    # Apply test files
    local tests=$(echo "$implementation" | jq '.tests')
    if [ "$tests" != "null" ] && [ "$tests" != "[]" ]; then
        echo "$tests" | jq -c '.[]' | while IFS= read -r test; do
            local path=$(echo "$test" | jq -r '.path')
            local content=$(echo "$test" | jq -r '.content')
            
            local full_path="$PROJECT_DIR/$path"
            mkdir -p "$(dirname "$full_path")"
            echo "$content" > "$full_path"
            log "Created test: $path"
        done
    fi
    
    # Run any required commands
    local commands=$(echo "$implementation" | jq -r '.commands_to_run[]?' 2>/dev/null)
    if [ -n "$commands" ]; then
        while IFS= read -r cmd; do
            log "Running command: $cmd"
            (cd "$PROJECT_DIR" && eval "$cmd")
        done <<< "$commands"
    fi
}

# Fix a bug or test failure
fix_bug() {
    local issue="$1"
    local affected_file=$(echo "$issue" | jq -r '.file // .affected_file')
    local issue_description=$(echo "$issue" | jq -r '.issue // .description')
    
    log "Fixing bug in $affected_file: $issue_description"
    
    if [ ! -f "$PROJECT_DIR/$affected_file" ]; then
        log_error "File not found: $affected_file"
        return 1
    fi
    
    # Backup the file
    cp "$PROJECT_DIR/$affected_file" "$CODE_BACKUPS/$(basename $affected_file)_$(date +%s)"
    
    # Read current code
    local current_code=$(cat "$PROJECT_DIR/$affected_file")
    
    local fix_prompt="Fix this bug in the code:

File: $affected_file
Issue: $issue_description

Current Code:
\`\`\`
$current_code
\`\`\`

Additional Context:
$issue

Provide the fixed code as the complete file content. Ensure the fix:
1. Resolves the reported issue
2. Doesn't break existing functionality
3. Follows the project's coding patterns
4. Includes any necessary imports or dependencies"

    local fixed_code=$(ask_claude "$fix_prompt")
    
    if [ "$fixed_code" != "" ] && [ "$fixed_code" != "*error*" ]; then
        # Apply the fix
        echo "$fixed_code" > "$PROJECT_DIR/$affected_file"
        log "Applied fix to $affected_file"
        
        # Create a patch file for review
        diff -u "$CODE_BACKUPS/$(basename $affected_file)_"* "$PROJECT_DIR/$affected_file" > "$PATCHES/fix_$(date +%s).patch" 2>/dev/null || true
        
        return 0
    fi
    
    log_error "Could not generate fix"
    return 1
}

# Report implementation completion
report_implementation_complete() {
    local task_id="$1"
    local changes="$2"
    
    # Count changed files
    local files_changed=0
    if echo "$changes" | jq -e '.files' >/dev/null 2>&1; then
        files_changed=$(echo "$changes" | jq '.files | length')
    elif echo "$changes" | jq -e 'length' >/dev/null 2>&1; then
        files_changed=$(echo "$changes" | jq 'length')
    fi
    
    local report="{
        \"type\": \"agent_report\",
        \"agent\": \"$AGENT_NAME\",
        \"task_id\": \"$task_id\",
        \"status\": \"completed\",
        \"changes\": $changes,
        \"files_changed\": $files_changed,
        \"outcome\": \"Implementation complete\",
        \"impact\": \"Feature/fix implemented as requested\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"
    
    send_message "coordinator" "$report" "high"
    
    # Request testing
    local test_request="{
        \"type\": \"test_request\",
        \"from\": \"$AGENT_NAME\",
        \"reason\": \"New implementation needs testing\",
        \"focus\": \"recent_changes\"
    }"
    
    send_message "tester" "$test_request"
}

# Override handle_task for coder
handle_task() {
    local content="$1"
    
    local msg_type=$(echo "$content" | jq -r '.type // "implement"' 2>/dev/null)
    
    case "$msg_type" in
        "task_assignment")
            local task=$(echo "$content" | jq '.task')
            local plan=$(echo "$content" | jq '.plan' 2>/dev/null)
            
            implement_feature "$task" "$plan"
            ;;
            
        "fix_bug")
            local issue=$(echo "$content" | jq '.issue')
            fix_bug "$issue"
            ;;
            
        "implement_plan")
            local task_id=$(echo "$content" | jq -r '.task_id')
            local plan=$(echo "$content" | jq '.plan')
            
            implement_from_plan "$task_id" "$plan" "$IMPLEMENTATIONS/$task_id"
            ;;
            
        "refactor")
            local target=$(echo "$content" | jq -r '.target')
            local reason=$(echo "$content" | jq -r '.reason')
            
            log "Refactoring $target: $reason"
            # Refactoring logic would go here
            ;;
            
        *)
            log "Processing general coding task: $msg_type"
            ;;
    esac
}

# Periodic coder tasks
periodic_tasks() {
    # Clean old backups daily
    if [ $(($(date +%s) % 86400)) -eq 0 ]; then
        find "$CODE_BACKUPS" -type f -mtime +7 -delete
        log "Cleaned old backups"
    fi
    
    # Check for uncommitted changes every hour
    if [ $(($(date +%s) % 3600)) -eq 0 ]; then
        if command -v git &> /dev/null; then
            cd "$PROJECT_DIR"
            if [ -d .git ]; then
                local changes=$(git status --porcelain | wc -l)
                if [ $changes -gt 0 ]; then
                    log "Warning: $changes uncommitted changes in repository"
                fi
            fi
        fi
    fi
}

# Start the coder
log "Coder Agent starting..."
run_agent
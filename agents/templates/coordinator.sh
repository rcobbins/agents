#!/bin/bash

# Coordinator Agent - Orchestrates work between all agents
AGENT_NAME="coordinator"
AGENT_ROLE="Work Orchestrator and Planner"

# Source base agent
FRAMEWORK_DIR="${FRAMEWORK_DIR:-$HOME/agent-framework}"
source "$FRAMEWORK_DIR/agents/templates/base-agent.sh"

# Coordinator-specific configuration
TASK_QUEUE="$WORKSPACE/task_queue.json"
WORK_LOG="$WORKSPACE/work_completed.json"
AGENT_STATUS_CACHE="$WORKSPACE/agent_status.json"

# Track active agents
AGENTS=("planner" "tester" "coder" "reviewer")

# Initialize coordinator
initialize_agent() {
    log "Initializing Coordinator Agent"
    
    # Create task queue
    if [ ! -f "$TASK_QUEUE" ]; then
        echo "[]" > "$TASK_QUEUE"
    fi
    
    # Create work log
    if [ ! -f "$WORK_LOG" ]; then
        echo "[]" > "$WORK_LOG"
    fi
    
    # Load project goals
    if [ -f "$DOCS_DIR/GOALS.json" ]; then
        PROJECT_GOALS=$(jq -r '.goals' "$DOCS_DIR/GOALS.json" 2>/dev/null || echo "[]")
        log "Loaded $(echo "$PROJECT_GOALS" | jq 'length') project goals"
    fi
}

# Analyze project and create initial task list
analyze_project() {
    log "Analyzing project to create task list"
    
    local analysis_prompt="As a project coordinator, analyze this project and create an initial task list.

Project Specification:
$PROJECT_SPEC

Project Goals:
$GOALS

Based on this information, provide a JSON array of tasks with the following structure:
[
  {
    \"id\": \"task-1\",
    \"description\": \"Task description\",
    \"type\": \"test|code|review|plan\",
    \"priority\": \"high|medium|low\",
    \"assigned_to\": \"planner|tester|coder|reviewer\",
    \"dependencies\": [],
    \"estimated_hours\": 1
  }
]

Focus on:
1. Failing tests or missing test coverage
2. Incomplete features from the goals
3. Code quality issues
4. Documentation gaps"

    local tasks=$(ask_claude "$analysis_prompt")
    
    if [ "$tasks" != "" ] && [ "$tasks" != "*error*" ]; then
        echo "$tasks" > "$TASK_QUEUE"
        log "Generated $(echo "$tasks" | jq 'length') tasks"
    else
        # Fallback: Create basic tasks from goals
        create_tasks_from_goals
    fi
}

# Create tasks from project goals
create_tasks_from_goals() {
    log "Creating tasks from project goals"
    
    local tasks="["
    local first=true
    
    if [ -f "$DOCS_DIR/GOALS.json" ]; then
        while IFS= read -r goal; do
            [ "$first" = false ] && tasks+=","
            tasks+="{
                \"id\": \"goal-$(uuidgen | cut -c1-8)\",
                \"description\": \"Implement: $goal\",
                \"type\": \"plan\",
                \"priority\": \"high\",
                \"assigned_to\": \"planner\",
                \"dependencies\": [],
                \"estimated_hours\": 2
            }"
            first=false
        done < <(jq -r '.goals[].description' "$DOCS_DIR/GOALS.json" 2>/dev/null)
    fi
    
    tasks+="]"
    echo "$tasks" > "$TASK_QUEUE"
}

# Assign task to agent
assign_task() {
    local task="$1"
    local agent="$2"
    
    log "Assigning task to $agent: $(echo "$task" | jq -r '.description')"
    
    # Create task message
    local msg="{
        \"type\": \"task_assignment\",
        \"task\": $task,
        \"project_context\": {
            \"tech_stack\": \"$LANGUAGE\",
            \"src_dir\": \"$SRC_DIR\",
            \"test_dir\": \"$TEST_DIR\",
            \"test_command\": \"$TEST_COMMAND\"
        }
    }"
    
    send_message "$agent" "$msg" "high"
}

# Process agent reports
handle_agent_report() {
    local report="$1"
    local agent=$(echo "$report" | jq -r '.agent')
    local task_id=$(echo "$report" | jq -r '.task_id')
    local status=$(echo "$report" | jq -r '.status')
    
    log "Received report from $agent: Task $task_id - $status"
    
    # Update task queue
    if [ "$status" = "completed" ]; then
        # Log completed work
        log_completed_work "$agent" "$report"
        
        # Remove from queue
        jq "map(select(.id != \"$task_id\"))" "$TASK_QUEUE" > "$TASK_QUEUE.tmp"
        mv "$TASK_QUEUE.tmp" "$TASK_QUEUE"
        
        # Check for follow-up tasks
        create_follow_up_tasks "$report"
    elif [ "$status" = "failed" ]; then
        # Reassign or escalate
        handle_failed_task "$task_id" "$agent" "$report"
    fi
}

# Log completed work
log_completed_work() {
    local agent="$1"
    local report="$2"
    
    local work_entry="{
        \"timestamp\": \"$(date -Iseconds)\",
        \"agent\": \"$agent\",
        \"task\": $(echo "$report" | jq '.task'),
        \"outcome\": $(echo "$report" | jq '.outcome // \"Task completed\"'),
        \"impact\": $(echo "$report" | jq '.impact // \"Contributed to project goals\"'),
        \"files_changed\": $(echo "$report" | jq '.files_changed // []')
    }"
    
    # Append to work log
    jq ". += [$work_entry]" "$WORK_LOG" > "$WORK_LOG.tmp"
    mv "$WORK_LOG.tmp" "$WORK_LOG"
}

# Create follow-up tasks based on completed work
create_follow_up_tasks() {
    local report="$1"
    local agent=$(echo "$report" | jq -r '.agent')
    
    case "$agent" in
        "tester")
            # If tests failed, create fix tasks
            if echo "$report" | jq -e '.failures | length > 0' >/dev/null 2>&1; then
                create_fix_tasks "$report"
            fi
            ;;
        "coder")
            # After coding, create test and review tasks
            create_test_task "$report"
            create_review_task "$report"
            ;;
        "reviewer")
            # If review found issues, create fix tasks
            if echo "$report" | jq -e '.issues | length > 0' >/dev/null 2>&1; then
                create_improvement_tasks "$report"
            fi
            ;;
    esac
}

# Handle failed tasks
handle_failed_task() {
    local task_id="$1"
    local agent="$2"
    local report="$3"
    
    log_error "Task $task_id failed by $agent"
    
    # Try reassigning to another capable agent
    local task=$(jq ".[] | select(.id == \"$task_id\")" "$TASK_QUEUE")
    local task_type=$(echo "$task" | jq -r '.type')
    
    # Increase priority
    task=$(echo "$task" | jq '.priority = "high"')
    
    # Reassign based on type
    case "$task_type" in
        "test")
            assign_task "$task" "tester"
            ;;
        "code")
            # Maybe needs planning first
            assign_task "$task" "planner"
            ;;
        *)
            # Log for manual intervention
            log_error "Task $task_id requires manual intervention"
            ;;
    esac
}

# Check agent health
check_agent_health() {
    local all_healthy=true
    
    for agent in "${AGENTS[@]}"; do
        if [ -f "$STATUS_DIR/$agent.status" ]; then
            local status=$(jq -r '.status' "$STATUS_DIR/$agent.status" 2>/dev/null)
            if [ "$status" != "running" ] && [ "$status" != "healthy" ]; then
                log_error "Agent $agent is not healthy: $status"
                all_healthy=false
            fi
        else
            log_error "Agent $agent status unknown"
            all_healthy=false
        fi
    done
    
    echo "$all_healthy"
}

# Periodic coordinator tasks
periodic_tasks() {
    # Check for unassigned tasks every 10 seconds
    if [ $(($(date +%s) % 10)) -eq 0 ]; then
        distribute_tasks
    fi
    
    # Check agent health every 30 seconds
    if [ $(($(date +%s) % 30)) -eq 0 ]; then
        check_agent_health
    fi
    
    # Generate progress report every minute
    if [ $(($(date +%s) % 60)) -eq 0 ]; then
        generate_progress_report
    fi
}

# Distribute unassigned tasks
distribute_tasks() {
    local unassigned=$(jq '[.[] | select(.status == null or .status == "pending")]' "$TASK_QUEUE" 2>/dev/null)
    
    if [ "$(echo "$unassigned" | jq 'length')" -gt 0 ]; then
        log "Distributing $(echo "$unassigned" | jq 'length') unassigned tasks"
        
        echo "$unassigned" | jq -c '.[]' | while IFS= read -r task; do
            local agent=$(echo "$task" | jq -r '.assigned_to')
            assign_task "$task" "$agent"
            
            # Mark as assigned
            local task_id=$(echo "$task" | jq -r '.id')
            jq "map((select(.id == \"$task_id\") | .status = \"assigned\") // .)" "$TASK_QUEUE" > "$TASK_QUEUE.tmp"
            mv "$TASK_QUEUE.tmp" "$TASK_QUEUE"
        done
    fi
}

# Generate progress report
generate_progress_report() {
    local total_goals=$(jq '.goals | length' "$DOCS_DIR/GOALS.json" 2>/dev/null || echo "0")
    local completed_tasks=$(jq 'length' "$WORK_LOG" 2>/dev/null || echo "0")
    local pending_tasks=$(jq '[.[] | select(.status != "completed")] | length' "$TASK_QUEUE" 2>/dev/null || echo "0")
    
    local report="{
        \"timestamp\": \"$(date -Iseconds)\",
        \"total_goals\": $total_goals,
        \"completed_tasks\": $completed_tasks,
        \"pending_tasks\": $pending_tasks,
        \"agents_healthy\": $(check_agent_health)
    }"
    
    echo "$report" > "$STATUS_DIR/progress.json"
    log "Progress: $completed_tasks tasks completed, $pending_tasks pending"
}

# Override handle_task for coordinator
handle_task() {
    local content="$1"
    
    # Parse message type
    local msg_type=$(echo "$content" | jq -r '.type // "unknown"' 2>/dev/null)
    
    case "$msg_type" in
        "agent_report")
            handle_agent_report "$content"
            ;;
        "request_task")
            # Agent requesting work
            local agent=$(echo "$content" | jq -r '.from')
            assign_next_task "$agent"
            ;;
        "analyze_project")
            analyze_project
            ;;
        *)
            log "Unknown message type: $msg_type"
            ;;
    esac
}

# Start the coordinator
log "Coordinator Agent starting..."
run_agent
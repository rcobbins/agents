#!/bin/bash

# Planner Agent - Analyzes tasks and creates implementation plans
AGENT_NAME="planner"
AGENT_ROLE="Task Analyst and Implementation Planner"

# Source base agent
FRAMEWORK_DIR="${FRAMEWORK_DIR:-$HOME/agent-framework}"
source "$FRAMEWORK_DIR/agents/templates/base-agent.sh"

# Planner-specific configuration
PLANS_DIR="$WORKSPACE/plans"
ANALYSIS_CACHE="$WORKSPACE/analysis_cache"

# Initialize planner
initialize_agent() {
    log "Initializing Planner Agent"
    mkdir -p "$PLANS_DIR" "$ANALYSIS_CACHE"
    
    # Cache project structure analysis
    if [ ! -f "$ANALYSIS_CACHE/project_structure.json" ]; then
        analyze_project_structure
    fi
}

# Analyze project structure
analyze_project_structure() {
    log "Analyzing project structure"
    
    local structure="{
        \"project_dir\": \"$PROJECT_DIR\",
        \"source_dir\": \"$SRC_DIR\",
        \"test_dir\": \"$TEST_DIR\",
        \"has_typescript\": $([ -f "$PROJECT_DIR/tsconfig.json" ] && echo "true" || echo "false"),
        \"has_package_json\": $([ -f "$PROJECT_DIR/package.json" ] && echo "true" || echo "false"),
        \"has_tests\": $([ -d "$PROJECT_DIR/$TEST_DIR" ] && echo "true" || echo "false")
    }"
    
    # Find main entry points
    local entry_points="[]"
    for ext in js ts py java go rs rb; do
        if find "$PROJECT_DIR/$SRC_DIR" -name "*.${ext}" -type f 2>/dev/null | head -1 | grep -q .; then
            entry_points=$(echo "$entry_points" | jq ". += [\"${ext}\"]")
        fi
    done
    
    structure=$(echo "$structure" | jq ".languages = $entry_points")
    
    echo "$structure" > "$ANALYSIS_CACHE/project_structure.json"
    log "Project structure cached"
}

# Create implementation plan for a task
create_implementation_plan() {
    local task="$1"
    local task_id=$(echo "$task" | jq -r '.id')
    local description=$(echo "$task" | jq -r '.description')
    
    log "Creating implementation plan for task: $description"
    
    # Load project context
    local project_structure=$(cat "$ANALYSIS_CACHE/project_structure.json" 2>/dev/null || echo "{}")
    
    local planning_prompt="As a senior software architect, create a detailed implementation plan for this task.

Task: $description

Project Context:
$PROJECT_SPEC

Project Structure:
$project_structure

Current Goals:
$GOALS

Please provide a JSON implementation plan with:
{
  \"task_id\": \"$task_id\",
  \"approach\": \"Brief description of approach\",
  \"steps\": [
    {
      \"order\": 1,
      \"action\": \"Specific action to take\",
      \"target\": \"File or component to modify\",
      \"validation\": \"How to verify this step\"
    }
  ],
  \"risks\": [\"Potential issues to watch for\"],
  \"success_criteria\": [\"How to know the task is complete\"],
  \"estimated_minutes\": 30,
  \"required_tools\": [\"Tools or commands needed\"],
  \"test_strategy\": \"How to test the implementation\"
}"

    local plan=$(ask_claude "$planning_prompt")
    
    if [ "$plan" != "" ] && [ "$plan" != "*error*" ]; then
        # Save plan
        echo "$plan" > "$PLANS_DIR/${task_id}_plan.json"
        log "Plan created for task $task_id"
        
        # Send plan to coordinator
        send_plan_to_coordinator "$task_id" "$plan"
    else
        # Create basic plan
        create_basic_plan "$task" "$task_id"
    fi
}

# Create basic plan without AI
create_basic_plan() {
    local task="$1"
    local task_id="$2"
    local description=$(echo "$task" | jq -r '.description')
    local task_type=$(echo "$task" | jq -r '.type // "general"')
    
    local plan="{
        \"task_id\": \"$task_id\",
        \"approach\": \"Standard $task_type implementation\",
        \"steps\": ["
    
    case "$task_type" in
        "test")
            plan+="{\"order\": 1, \"action\": \"Identify test requirements\", \"target\": \"$TEST_DIR\"},"
            plan+="{\"order\": 2, \"action\": \"Write test cases\", \"target\": \"test files\"},"
            plan+="{\"order\": 3, \"action\": \"Run tests\", \"target\": \"$TEST_COMMAND\"}"
            ;;
        "code")
            plan+="{\"order\": 1, \"action\": \"Analyze requirements\", \"target\": \"task description\"},"
            plan+="{\"order\": 2, \"action\": \"Implement solution\", \"target\": \"$SRC_DIR\"},"
            plan+="{\"order\": 3, \"action\": \"Add tests\", \"target\": \"$TEST_DIR\"}"
            ;;
        "review")
            plan+="{\"order\": 1, \"action\": \"Check code quality\", \"target\": \"$SRC_DIR\"},"
            plan+="{\"order\": 2, \"action\": \"Run linting\", \"target\": \"all files\"},"
            plan+="{\"order\": 3, \"action\": \"Verify tests\", \"target\": \"$TEST_DIR\"}"
            ;;
        *)
            plan+="{\"order\": 1, \"action\": \"Analyze task\", \"target\": \"requirements\"},"
            plan+="{\"order\": 2, \"action\": \"Execute task\", \"target\": \"relevant files\"}"
            ;;
    esac
    
    plan+="],
        \"risks\": [\"May need additional context\"],
        \"success_criteria\": [\"Task requirements met\"],
        \"estimated_minutes\": 30,
        \"required_tools\": [],
        \"test_strategy\": \"Run existing tests\"
    }"
    
    echo "$plan" > "$PLANS_DIR/${task_id}_plan.json"
    send_plan_to_coordinator "$task_id" "$plan"
}

# Analyze code for patterns and architecture
analyze_codebase() {
    local focus_area="${1:-}"
    
    log "Analyzing codebase${focus_area:+ for $focus_area}"
    
    local analysis_prompt="Analyze this project's codebase and identify:

Project: $PROJECT_DIR
Focus: ${focus_area:-General architecture}

Project Documentation:
$PROJECT_SPEC

Please provide JSON analysis:
{
  \"patterns\": [\"Identified patterns in use\"],
  \"architecture\": \"Brief architecture description\",
  \"dependencies\": [\"Key dependencies\"],
  \"test_coverage_estimate\": \"low|medium|high\",
  \"improvement_areas\": [\"Areas that need work\"],
  \"strengths\": [\"Well-implemented areas\"]
}"

    local analysis=$(ask_claude "$analysis_prompt")
    
    if [ "$analysis" != "" ] && [ "$analysis" != "*error*" ]; then
        echo "$analysis" > "$ANALYSIS_CACHE/codebase_analysis_$(date +%s).json"
        return 0
    fi
    
    # Basic analysis without AI
    perform_basic_analysis
}

# Basic code analysis without AI
perform_basic_analysis() {
    log "Performing basic code analysis"
    
    local analysis="{
        \"file_count\": $(find "$PROJECT_DIR/$SRC_DIR" -type f 2>/dev/null | wc -l),
        \"test_count\": $(find "$PROJECT_DIR/$TEST_DIR" -type f -name "*test*" 2>/dev/null | wc -l),
        \"has_ci\": $([ -f "$PROJECT_DIR/.github/workflows/"*.yml ] && echo "true" || echo "false"),
        \"has_readme\": $([ -f "$PROJECT_DIR/README.md" ] && echo "true" || echo "false")
    }"
    
    echo "$analysis" > "$ANALYSIS_CACHE/basic_analysis.json"
}

# Send plan to coordinator
send_plan_to_coordinator() {
    local task_id="$1"
    local plan="$2"
    
    local report="{
        \"type\": \"agent_report\",
        \"agent\": \"$AGENT_NAME\",
        \"task_id\": \"$task_id\",
        \"status\": \"completed\",
        \"plan\": $plan,
        \"timestamp\": \"$(date -Iseconds)\"
    }"
    
    send_message "coordinator" "$report" "high"
}

# Break down complex task into subtasks
decompose_task() {
    local task="$1"
    local description=$(echo "$task" | jq -r '.description')
    
    log "Decomposing complex task: $description"
    
    local decomposition_prompt="Break down this complex task into smaller, manageable subtasks.

Task: $description

Context:
$PROJECT_SPEC

Provide a JSON array of subtasks:
[
  {
    \"id\": \"subtask-1\",
    \"description\": \"Specific subtask\",
    \"type\": \"test|code|review\",
    \"dependencies\": [],
    \"estimated_minutes\": 15
  }
]"

    local subtasks=$(ask_claude "$decomposition_prompt")
    
    if [ "$subtasks" != "" ] && [ "$subtasks" != "*error*" ]; then
        echo "$subtasks"
    else
        echo "[]"
    fi
}

# Override handle_task for planner
handle_task() {
    local content="$1"
    
    # Parse task assignment
    local msg_type=$(echo "$content" | jq -r '.type // "task"' 2>/dev/null)
    
    case "$msg_type" in
        "task_assignment")
            local task=$(echo "$content" | jq '.task')
            create_implementation_plan "$task"
            ;;
        "analyze_codebase")
            local focus=$(echo "$content" | jq -r '.focus // ""')
            analyze_codebase "$focus"
            ;;
        "decompose_task")
            local task=$(echo "$content" | jq '.task')
            local subtasks=$(decompose_task "$task")
            
            # Send subtasks to coordinator
            local report="{
                \"type\": \"subtasks_created\",
                \"agent\": \"$AGENT_NAME\",
                \"parent_task\": $(echo "$task" | jq '.id'),
                \"subtasks\": $subtasks
            }"
            send_message "coordinator" "$report"
            ;;
        *)
            log "Processing general planning task: $msg_type"
            # Try to create a plan anyway
            if echo "$content" | jq -e '.task' >/dev/null 2>&1; then
                create_implementation_plan "$(echo "$content" | jq '.task')"
            fi
            ;;
    esac
}

# Periodic planning tasks
periodic_tasks() {
    # Re-analyze project structure every hour
    if [ $(($(date +%s) % 3600)) -eq 0 ]; then
        analyze_project_structure
    fi
    
    # Clean old analysis cache every day
    if [ $(($(date +%s) % 86400)) -eq 0 ]; then
        find "$ANALYSIS_CACHE" -type f -mtime +7 -delete
    fi
}

# Start the planner
log "Planner Agent starting..."
run_agent
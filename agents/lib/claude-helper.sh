#!/bin/bash

# Claude CLI Helper Library
# Provides enhanced Claude integration with system prompts and session persistence

# Load session manager if available
FRAMEWORK_DIR="${FRAMEWORK_DIR:-/home/rob/agent-framework}"
if [ -f "$FRAMEWORK_DIR/agents/lib/session-manager.sh" ]; then
    source "$FRAMEWORK_DIR/agents/lib/session-manager.sh"
fi

# Get system prompt based on agent name and context
get_system_prompt() {
    local agent_name="${1:-agent}"
    local project_context="${2:-}"
    local prompt=""
    
    case "$agent_name" in
        "coordinator")
            prompt="You are the Coordinator Agent in a multi-agent development framework. Your role is to:
- Orchestrate work between planner, coder, tester, and reviewer agents
- Analyze project requirements and create actionable task lists
- Track progress and ensure goals are met
- Distribute tasks based on agent capabilities
- Handle failures and reassign work as needed
Focus on practical task breakdown and efficient delegation."
            ;;
            
        "planner")
            prompt="You are the Planner Agent responsible for:
- Breaking down high-level goals into concrete implementation steps
- Creating detailed technical specifications
- Identifying dependencies and prerequisites
- Estimating effort and complexity
- Suggesting optimal implementation approaches
Provide clear, actionable plans that other agents can execute."
            ;;
            
        "coder")
            prompt="You are the Coder Agent focused on:
- Writing clean, maintainable code following best practices
- Implementing features according to specifications
- Fixing bugs and addressing test failures
- Refactoring code for better quality
- Following existing code patterns and conventions
Always write production-ready code with proper error handling."
            ;;
            
        "tester")
            prompt="You are the Tester Agent dedicated to:
- Writing comprehensive test cases
- Running tests and analyzing results
- Identifying edge cases and potential issues
- Ensuring code coverage targets are met
- Creating integration and end-to-end tests
Focus on catching bugs before they reach production."
            ;;
            
        "reviewer")
            prompt="You are the Reviewer Agent responsible for:
- Code quality assessment and improvements
- Security and performance reviews
- Best practices enforcement
- Documentation completeness checks
- Suggesting optimizations and refactoring
Provide constructive feedback to improve code quality."
            ;;
            
        *)
            prompt="You are an AI assistant in a development framework. 
Provide helpful, practical advice for software development tasks.
Focus on clean code, best practices, and production readiness."
            ;;
    esac
    
    # Add project context if provided
    if [ -n "$project_context" ]; then
        prompt="$prompt

Project Context:
$project_context"
    fi
    
    echo "$prompt"
}

# Enhanced ask_claude function with system prompts and session persistence
ask_claude_enhanced() {
    local user_prompt="$1"
    local agent_name="${2:-agent}"
    local project_context="${3:-}"
    local output_format="${4:-text}"  # text or json
    
    # Get session info if session manager is available
    local session_cmd=""
    if declare -f get_or_create_session &>/dev/null; then
        local session_info=$(get_or_create_session "$agent_name")
        local session_type="${session_info%%:*}"
        local uuid="${session_info#*:}"
        
        if [ "$session_type" = "new" ]; then
            session_cmd="--session-id $uuid"
            local is_new_session=true
        else
            session_cmd="--resume $uuid"
            local is_new_session=false
        fi
        
        # Update last used timestamp
        update_last_used "$agent_name" 2>/dev/null
    fi
    
    # Get appropriate system prompt
    local system_prompt=$(get_system_prompt "$agent_name" "$project_context")
    
    # Build command with proper escaping
    local cmd="claude --print"
    
    # Add session command if available
    if [ -n "$session_cmd" ]; then
        cmd="$cmd $session_cmd"
    fi
    
    # Add system prompt
    cmd="$cmd --append-system-prompt '${system_prompt//\'/\'\\\'\'}'"
    
    # Add output format if JSON requested
    if [ "$output_format" = "json" ]; then
        cmd="$cmd --output-format json"
    fi
    
    # Add fallback model for reliability
    cmd="$cmd --fallback-model claude-3-haiku-20240307"
    
    # Add the user prompt
    cmd="$cmd '${user_prompt//\'/\'\\\'\'}'"
    
    # Execute command
    local output
    local stderr_output
    output=$(eval "$cmd" 2>&1)
    local exit_code=$?
    
    # Handle session-related errors
    if [ $exit_code -ne 0 ]; then
        if echo "$output" | grep -qi "session.*exists\|UUID.*clash\|already.*exists"; then
            # UUID clash - session already exists, retry with --resume
            if [ "$is_new_session" = true ] && declare -f mark_session_created &>/dev/null; then
                mark_session_created "$agent_name"
                # Retry with --resume
                cmd="claude --print --resume $uuid"
                cmd="$cmd --append-system-prompt '${system_prompt//\'/\'\\\'\'}'"
                [ "$output_format" = "json" ] && cmd="$cmd --output-format json"
                cmd="$cmd --fallback-model claude-3-haiku-20240307"
                cmd="$cmd '${user_prompt//\'/\'\\\'\'}'"
                output=$(eval "$cmd" 2>&1)
                exit_code=$?
            fi
        elif echo "$output" | grep -qi "session.*not.*found\|no.*such.*session"; then
            # Session expired or not found - reset and try again
            if declare -f reset_agent_session &>/dev/null; then
                reset_agent_session "$agent_name" "soft" >/dev/null 2>&1
                # Recursive call to try with new session
                ask_claude_enhanced "$user_prompt" "$agent_name" "$project_context" "$output_format"
                return $?
            fi
        fi
    fi
    
    if [ $exit_code -eq 0 ] && [ -n "$output" ]; then
        # Mark session as created if this was a new session
        if [ "$is_new_session" = true ] && declare -f mark_session_created &>/dev/null; then
            mark_session_created "$agent_name"
        fi
        echo "$output"
        return 0
    else
        # Fallback response
        echo "{\"error\": \"Claude CLI failed\", \"fallback\": true}"
        return 1
    fi
}

# Convenience functions for each agent
ask_claude_coordinator() {
    ask_claude_enhanced "$1" "coordinator" "$2" "$3"
}

ask_claude_planner() {
    ask_claude_enhanced "$1" "planner" "$2" "$3"
}

ask_claude_coder() {
    ask_claude_enhanced "$1" "coder" "$2" "$3"
}

ask_claude_tester() {
    ask_claude_enhanced "$1" "tester" "$2" "$3"
}

ask_claude_reviewer() {
    ask_claude_enhanced "$1" "reviewer" "$2" "$3"
}

# Export functions for use by other scripts
export -f get_system_prompt ask_claude_enhanced
export -f ask_claude_coordinator ask_claude_planner ask_claude_coder
export -f ask_claude_tester ask_claude_reviewer
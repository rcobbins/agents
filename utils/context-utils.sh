#!/bin/bash

# Context Utilities for Agent Framework
# Provides project context loading and management

# Configuration
AGENT_BASE_DIR="${AGENT_BASE_DIR:-$PROJECT_DIR/.agents}"
DOCS_DIR="$AGENT_BASE_DIR/docs"
CONFIG_DIR="$AGENT_BASE_DIR/config"
CONTEXT_CACHE="$AGENT_BASE_DIR/workspace/context_cache"

# Ensure directories exist
mkdir -p "$CONTEXT_CACHE"

# Load project configuration
# Usage: load_project_config
load_project_config() {
    local config_file="$CONFIG_DIR/project.conf"
    
    if [ -f "$config_file" ]; then
        source "$config_file"
        echo "Project config loaded: $PROJECT_NAME"
        return 0
    else
        echo "Warning: Project config not found" >&2
        return 1
    fi
}

# Load project specification
# Usage: load_project_spec
load_project_spec() {
    local spec_file="$DOCS_DIR/PROJECT_SPEC.md"
    
    if [ -f "$spec_file" ]; then
        PROJECT_SPEC=$(cat "$spec_file")
        export PROJECT_SPEC
        echo "Project specification loaded"
        return 0
    else
        echo "Warning: PROJECT_SPEC.md not found" >&2
        return 1
    fi
}

# Load project goals
# Usage: load_project_goals
load_project_goals() {
    local goals_file="$DOCS_DIR/GOALS.json"
    
    if [ -f "$goals_file" ]; then
        PROJECT_GOALS=$(cat "$goals_file")
        export PROJECT_GOALS
        
        # Extract specific goal counts
        TOTAL_GOALS=$(echo "$PROJECT_GOALS" | jq '.goals | length' 2>/dev/null || echo "0")
        PENDING_GOALS=$(echo "$PROJECT_GOALS" | jq '[.goals[] | select(.status == "pending")] | length' 2>/dev/null || echo "0")
        
        export TOTAL_GOALS PENDING_GOALS
        
        echo "Loaded $TOTAL_GOALS project goals ($PENDING_GOALS pending)"
        return 0
    else
        echo "Warning: GOALS.json not found" >&2
        return 1
    fi
}

# Load testing strategy
# Usage: load_testing_strategy
load_testing_strategy() {
    local strategy_file="$DOCS_DIR/TESTING_STRATEGY.md"
    
    if [ -f "$strategy_file" ]; then
        TESTING_STRATEGY=$(cat "$strategy_file")
        export TESTING_STRATEGY
        echo "Testing strategy loaded"
        return 0
    else
        echo "Warning: TESTING_STRATEGY.md not found" >&2
        return 1
    fi
}

# Load agent instructions
# Usage: load_agent_instructions AGENT_NAME
load_agent_instructions() {
    local agent_name="$1"
    local instructions_file="$DOCS_DIR/AGENT_INSTRUCTIONS.md"
    
    if [ -f "$instructions_file" ]; then
        # Extract agent-specific section
        AGENT_INSTRUCTIONS=$(awk "/## ${agent_name^} Agent/,/^## [A-Z]/" "$instructions_file" 2>/dev/null)
        
        if [ -z "$AGENT_INSTRUCTIONS" ]; then
            # Try to get general instructions
            AGENT_INSTRUCTIONS=$(awk '/## General Instructions/,/^## [A-Z]/' "$instructions_file" 2>/dev/null)
        fi
        
        export AGENT_INSTRUCTIONS
        echo "Agent instructions loaded for $agent_name"
        return 0
    else
        echo "Warning: AGENT_INSTRUCTIONS.md not found" >&2
        return 1
    fi
}

# Load complete project context
# Usage: load_project_context [AGENT_NAME]
load_project_context() {
    local agent_name="${1:-generic}"
    
    echo "Loading project context for $agent_name..."
    
    # Load all context components
    load_project_config
    load_project_spec
    load_project_goals
    load_testing_strategy
    load_agent_instructions "$agent_name"
    
    # Cache the context
    cache_context "$agent_name"
    
    echo "Project context fully loaded"
}

# Cache context for performance
# Usage: cache_context AGENT_NAME
cache_context() {
    local agent_name="$1"
    local cache_file="$CONTEXT_CACHE/${agent_name}_context.cache"
    
    cat > "$cache_file" << EOF
# Context cache for $agent_name
# Generated: $(date -Iseconds)

export PROJECT_NAME="$PROJECT_NAME"
export PROJECT_VERSION="$PROJECT_VERSION"
export PROJECT_DIR="$PROJECT_DIR"
export LANGUAGE="$LANGUAGE"
export FRAMEWORKS="$FRAMEWORKS"
export DATABASE="$DATABASE"
export TEST_FRAMEWORK="$TEST_FRAMEWORK"
export SRC_DIR="$SRC_DIR"
export TEST_DIR="$TEST_DIR"
export BUILD_DIR="$BUILD_DIR"
export TEST_COMMAND="$TEST_COMMAND"
export TEST_COVERAGE="$TEST_COVERAGE"
export ARCHITECTURE="$ARCHITECTURE"
export TOTAL_GOALS="$TOTAL_GOALS"
export PENDING_GOALS="$PENDING_GOALS"

# Cached content (base64 encoded to preserve formatting)
export PROJECT_SPEC_CACHED="$(echo "$PROJECT_SPEC" | base64)"
export PROJECT_GOALS_CACHED="$(echo "$PROJECT_GOALS" | base64)"
export TESTING_STRATEGY_CACHED="$(echo "$TESTING_STRATEGY" | base64)"
export AGENT_INSTRUCTIONS_CACHED="$(echo "$AGENT_INSTRUCTIONS" | base64)"
EOF
    
    echo "Context cached for $agent_name"
}

# Load cached context
# Usage: load_cached_context AGENT_NAME
load_cached_context() {
    local agent_name="$1"
    local cache_file="$CONTEXT_CACHE/${agent_name}_context.cache"
    
    if [ -f "$cache_file" ]; then
        # Check cache age (invalidate after 1 hour)
        local cache_age=$(($(date +%s) - $(stat -f%m "$cache_file" 2>/dev/null || stat -c%Y "$cache_file" 2>/dev/null || echo "0")))
        
        if [ $cache_age -lt 3600 ]; then
            source "$cache_file"
            
            # Decode cached content
            PROJECT_SPEC=$(echo "$PROJECT_SPEC_CACHED" | base64 -d)
            PROJECT_GOALS=$(echo "$PROJECT_GOALS_CACHED" | base64 -d)
            TESTING_STRATEGY=$(echo "$TESTING_STRATEGY_CACHED" | base64 -d)
            AGENT_INSTRUCTIONS=$(echo "$AGENT_INSTRUCTIONS_CACHED" | base64 -d)
            
            export PROJECT_SPEC PROJECT_GOALS TESTING_STRATEGY AGENT_INSTRUCTIONS
            
            echo "Loaded cached context (age: ${cache_age}s)"
            return 0
        else
            echo "Cache expired, loading fresh context"
            return 1
        fi
    else
        return 1
    fi
}

# Get goal by ID
# Usage: get_goal_by_id GOAL_ID
get_goal_by_id() {
    local goal_id="$1"
    
    if [ -z "$PROJECT_GOALS" ]; then
        load_project_goals
    fi
    
    echo "$PROJECT_GOALS" | jq ".goals[] | select(.id == \"$goal_id\")" 2>/dev/null
}

# Get pending goals
# Usage: get_pending_goals
get_pending_goals() {
    if [ -z "$PROJECT_GOALS" ]; then
        load_project_goals
    fi
    
    echo "$PROJECT_GOALS" | jq '[.goals[] | select(.status == "pending")]' 2>/dev/null
}

# Get goals for agent
# Usage: get_goals_for_agent AGENT_NAME
get_goals_for_agent() {
    local agent_name="$1"
    
    if [ -z "$PROJECT_GOALS" ]; then
        load_project_goals
    fi
    
    echo "$PROJECT_GOALS" | jq "[.goals[] | select(.assigned_to == \"$agent_name\" or .assigned_to == null)]" 2>/dev/null
}

# Update goal status
# Usage: update_goal_status GOAL_ID NEW_STATUS
update_goal_status() {
    local goal_id="$1"
    local new_status="$2"
    local goals_file="$DOCS_DIR/GOALS.json"
    
    if [ ! -f "$goals_file" ]; then
        echo "Error: GOALS.json not found" >&2
        return 1
    fi
    
    # Update the goal status
    local updated_goals=$(jq "(.goals[] | select(.id == \"$goal_id\") | .status) = \"$new_status\"" "$goals_file")
    
    # Update last_updated timestamp
    updated_goals=$(echo "$updated_goals" | jq ".progress.last_updated = \"$(date -Iseconds)\"")
    
    # Save back to file
    echo "$updated_goals" > "$goals_file"
    
    echo "Goal $goal_id status updated to: $new_status"
    
    # Reload goals
    load_project_goals
}

# Get project summary
# Usage: get_project_summary
get_project_summary() {
    if [ -z "$PROJECT_NAME" ]; then
        load_project_config
    fi
    
    cat << EOF
{
    "name": "$PROJECT_NAME",
    "version": "$PROJECT_VERSION",
    "language": "$LANGUAGE",
    "frameworks": "$FRAMEWORKS",
    "test_framework": "$TEST_FRAMEWORK",
    "test_coverage_target": "$TEST_COVERAGE",
    "total_goals": $TOTAL_GOALS,
    "pending_goals": $PENDING_GOALS,
    "directories": {
        "source": "$SRC_DIR",
        "tests": "$TEST_DIR",
        "build": "$BUILD_DIR"
    }
}
EOF
}

# Clear context cache
# Usage: clear_context_cache
clear_context_cache() {
    rm -rf "$CONTEXT_CACHE"/*
    echo "Context cache cleared"
}

# Export functions for use by agents
export -f load_project_config load_project_spec load_project_goals
export -f load_testing_strategy load_agent_instructions load_project_context
export -f cache_context load_cached_context get_goal_by_id
export -f get_pending_goals get_goals_for_agent update_goal_status
export -f get_project_summary clear_context_cache
#!/bin/bash

# Status Utilities for Agent Framework
# Provides status tracking and reporting functions

# Configuration
AGENT_BASE_DIR="${AGENT_BASE_DIR:-$PROJECT_DIR/.agents}"
STATUS_DIR="$AGENT_BASE_DIR/status"
LOG_DIR="$AGENT_BASE_DIR/logs"

# Ensure directories exist
mkdir -p "$STATUS_DIR" "$LOG_DIR"

# Status levels
STATUS_RUNNING="running"
STATUS_IDLE="idle"
STATUS_BUSY="busy"
STATUS_ERROR="error"
STATUS_STOPPED="stopped"
STATUS_HEALTHY="healthy"

# Update agent status
# Usage: update_agent_status AGENT STATUS [DETAILS]
update_agent_status() {
    local agent="$1"
    local status="$2"
    local details="${3:-}"
    local timestamp=$(date -Iseconds)
    
    local status_file="$STATUS_DIR/${agent}.status"
    
    # Create status JSON
    cat > "$status_file" << EOF
{
    "agent": "$agent",
    "status": "$status",
    "details": "$details",
    "timestamp": "$timestamp",
    "pid": $$,
    "uptime": $(ps -o etime= -p $$ 2>/dev/null | xargs || echo "unknown")
}
EOF
    
    # Log status change
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$agent] Status: $status - $details" >> "$LOG_DIR/status.log"
}

# Get agent status
# Usage: get_agent_status AGENT
get_agent_status() {
    local agent="$1"
    local status_file="$STATUS_DIR/${agent}.status"
    
    if [ -f "$status_file" ]; then
        cat "$status_file"
    else
        echo "{\"agent\":\"$agent\",\"status\":\"unknown\"}"
    fi
}

# Check if agent is running
# Usage: is_agent_running AGENT
is_agent_running() {
    local agent="$1"
    local status_file="$STATUS_DIR/${agent}.status"
    
    if [ ! -f "$status_file" ]; then
        return 1
    fi
    
    local pid=$(jq -r '.pid' "$status_file" 2>/dev/null)
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Get all agent statuses
# Usage: get_all_agent_statuses
get_all_agent_statuses() {
    local all_statuses="["
    local first=true
    
    for status_file in "$STATUS_DIR"/*.status; do
        if [ -f "$status_file" ]; then
            [ "$first" = false ] && all_statuses+=","
            all_statuses+=$(cat "$status_file")
            first=false
        fi
    done
    
    all_statuses+="]"
    echo "$all_statuses"
}

# Track task progress
# Usage: track_task_progress AGENT TASK_ID PROGRESS TOTAL
track_task_progress() {
    local agent="$1"
    local task_id="$2"
    local progress="$3"
    local total="$4"
    
    local progress_file="$STATUS_DIR/${agent}_progress.json"
    local percentage=$((progress * 100 / total))
    
    cat > "$progress_file" << EOF
{
    "agent": "$agent",
    "task_id": "$task_id",
    "progress": $progress,
    "total": $total,
    "percentage": $percentage,
    "timestamp": "$(date -Iseconds)"
}
EOF
    
    # Log progress
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$agent] Task $task_id: ${percentage}% ($progress/$total)" >> "$LOG_DIR/progress.log"
}

# Report agent metrics
# Usage: report_metrics AGENT METRIC_NAME VALUE
report_metrics() {
    local agent="$1"
    local metric="$2"
    local value="$3"
    
    local metrics_file="$STATUS_DIR/${agent}_metrics.json"
    local timestamp=$(date -Iseconds)
    
    # Load existing metrics or create new
    if [ -f "$metrics_file" ]; then
        local metrics=$(cat "$metrics_file")
    else
        local metrics="{}"
    fi
    
    # Update metric
    metrics=$(echo "$metrics" | jq ".\"$metric\" = {\"value\": $value, \"timestamp\": \"$timestamp\"}")
    
    echo "$metrics" > "$metrics_file"
}

# Get agent metrics
# Usage: get_agent_metrics AGENT
get_agent_metrics() {
    local agent="$1"
    local metrics_file="$STATUS_DIR/${agent}_metrics.json"
    
    if [ -f "$metrics_file" ]; then
        cat "$metrics_file"
    else
        echo "{}"
    fi
}

# Create health check
# Usage: health_check AGENT
health_check() {
    local agent="$1"
    local health_file="$STATUS_DIR/${agent}_health.json"
    
    # Basic health checks
    local memory_usage=$(ps -o vsz= -p $$ 2>/dev/null | xargs || echo "0")
    local cpu_usage=$(ps -o %cpu= -p $$ 2>/dev/null | xargs || echo "0")
    local message_count=$(ls -1 "$AGENT_BASE_DIR/inboxes/$agent"/*.msg 2>/dev/null | wc -l)
    
    local health_status="healthy"
    local issues=()
    
    # Check for issues
    if [ "$message_count" -gt 100 ]; then
        health_status="warning"
        issues+=("High message backlog: $message_count")
    fi
    
    if [ "${memory_usage%%.*}" -gt 500000 ]; then  # > 500MB
        health_status="warning"
        issues+=("High memory usage: ${memory_usage}KB")
    fi
    
    # Create health report
    cat > "$health_file" << EOF
{
    "agent": "$agent",
    "status": "$health_status",
    "memory_kb": $memory_usage,
    "cpu_percent": $cpu_usage,
    "message_backlog": $message_count,
    "issues": $(printf '%s\n' "${issues[@]}" | jq -R . | jq -s .),
    "timestamp": "$(date -Iseconds)"
}
EOF
    
    echo "$health_status"
}

# Get system-wide status
# Usage: get_system_status
get_system_status() {
    local agents=("coordinator" "planner" "tester" "coder" "reviewer")
    local running=0
    local total=${#agents[@]}
    
    for agent in "${agents[@]}"; do
        if is_agent_running "$agent"; then
            ((running++))
        fi
    done
    
    cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "agents_total": $total,
    "agents_running": $running,
    "system_health": "$([ $running -eq $total ] && echo "healthy" || echo "degraded")",
    "uptime": "$(uptime -p 2>/dev/null || echo "unknown")"
}
EOF
}

# Create status summary
# Usage: create_status_summary
create_status_summary() {
    local summary_file="$STATUS_DIR/summary.json"
    
    local system_status=$(get_system_status)
    local agent_statuses=$(get_all_agent_statuses)
    
    cat > "$summary_file" << EOF
{
    "generated": "$(date -Iseconds)",
    "system": $system_status,
    "agents": $agent_statuses
}
EOF
    
    echo "Status summary created: $summary_file"
}

# Monitor agent heartbeat
# Usage: heartbeat AGENT
heartbeat() {
    local agent="$1"
    local heartbeat_file="$STATUS_DIR/${agent}.heartbeat"
    
    date +%s > "$heartbeat_file"
}

# Check agent heartbeat
# Usage: check_heartbeat AGENT [TIMEOUT_SECONDS]
check_heartbeat() {
    local agent="$1"
    local timeout="${2:-60}"
    local heartbeat_file="$STATUS_DIR/${agent}.heartbeat"
    
    if [ ! -f "$heartbeat_file" ]; then
        return 1
    fi
    
    local last_heartbeat=$(cat "$heartbeat_file")
    local current_time=$(date +%s)
    local elapsed=$((current_time - last_heartbeat))
    
    if [ $elapsed -gt $timeout ]; then
        return 1
    else
        return 0
    fi
}

# Clean old status files
# Usage: clean_old_status_files [DAYS]
clean_old_status_files() {
    local days="${1:-7}"
    
    echo "Cleaning status files older than $days days..."
    
    find "$STATUS_DIR" -type f -mtime +$days -delete 2>/dev/null
    
    echo "Status cleanup complete"
}

# Export functions for use by agents
export -f update_agent_status get_agent_status is_agent_running
export -f get_all_agent_statuses track_task_progress report_metrics
export -f get_agent_metrics health_check get_system_status
export -f create_status_summary heartbeat check_heartbeat
export -f clean_old_status_files
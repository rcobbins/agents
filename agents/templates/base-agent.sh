#!/bin/bash

# Base Agent Template - Foundation for all agents
# This provides common functionality that all agents inherit

# Agent configuration (to be overridden)
AGENT_NAME="${AGENT_NAME:-agent}"
AGENT_ROLE="${AGENT_ROLE:-Generic Agent}"
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
AGENT_BASE_DIR="${AGENT_BASE_DIR:-$PROJECT_DIR/.agents}"

# Core directories
INBOX="$AGENT_BASE_DIR/inboxes/$AGENT_NAME"
OUTBOX="$AGENT_BASE_DIR/outboxes/$AGENT_NAME"
LOG_DIR="$AGENT_BASE_DIR/logs"
LOG="$LOG_DIR/$AGENT_NAME.log"
WORKSPACE="$AGENT_BASE_DIR/workspace/$AGENT_NAME"
STATUS_DIR="$AGENT_BASE_DIR/status"
DOCS_DIR="$AGENT_BASE_DIR/docs"

# Ensure directories exist
mkdir -p "$INBOX" "$OUTBOX" "$WORKSPACE" "$LOG_DIR" "$STATUS_DIR"

# Load project configuration if exists
if [ -f "$AGENT_BASE_DIR/config/project.conf" ]; then
    source "$AGENT_BASE_DIR/config/project.conf"
fi

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$AGENT_NAME] $1" | tee -a "$LOG"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$AGENT_NAME] ERROR: $1" | tee -a "$LOG" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$AGENT_NAME] SUCCESS: $1" | tee -a "$LOG"
}

# Status management
update_status() {
    local status="$1"
    local details="${2:-}"
    
    cat > "$STATUS_DIR/$AGENT_NAME.status" << EOF
{
    "agent": "$AGENT_NAME",
    "status": "$status",
    "details": "$details",
    "timestamp": "$(date -Iseconds)",
    "pid": $$
}
EOF
}

# Message handling
send_message() {
    local recipient="$1"
    local message="$2"
    local priority="${3:-normal}"
    
    local msg_file="$AGENT_BASE_DIR/inboxes/$recipient/$(date +%s)_${AGENT_NAME}.msg"
    
    cat > "$msg_file" << EOF
{
    "from": "$AGENT_NAME",
    "to": "$recipient",
    "message": "$message",
    "priority": "$priority",
    "timestamp": "$(date -Iseconds)"
}
EOF
    
    log "Message sent to $recipient"
}

# Process incoming message
process_message() {
    local msg_file="$1"
    
    if [ ! -f "$msg_file" ]; then
        log_error "Message file not found: $msg_file"
        return 1
    fi
    
    # Extract message content (basic parsing for now)
    local content=$(cat "$msg_file")
    log "Processing message: $content"
    
    # Agent-specific processing (to be overridden)
    handle_task "$content"
    
    # Archive processed message
    mkdir -p "$WORKSPACE/processed"
    mv "$msg_file" "$WORKSPACE/processed/$(basename $msg_file)_processed"
}

# Health check
health_check() {
    echo "HEALTHY" > "$OUTBOX/health_$(date +%s)"
    update_status "healthy" "Responding to health check"
}

# Graceful shutdown
shutdown() {
    log "Shutdown signal received"
    update_status "stopped" "Agent stopped"
    cleanup
    exit 0
}

# Cleanup function (to be overridden if needed)
cleanup() {
    # Default cleanup
    rm -f "$STATUS_DIR/$AGENT_NAME.pid"
}

# Trap signals
trap shutdown SIGTERM SIGINT

# Load project documentation
load_project_docs() {
    if [ -f "$DOCS_DIR/PROJECT_SPEC.md" ]; then
        PROJECT_SPEC=$(cat "$DOCS_DIR/PROJECT_SPEC.md")
    fi
    
    if [ -f "$DOCS_DIR/GOALS.json" ]; then
        GOALS=$(cat "$DOCS_DIR/GOALS.json")
    fi
    
    if [ -f "$DOCS_DIR/AGENT_INSTRUCTIONS.md" ]; then
        AGENT_INSTRUCTIONS=$(grep -A 20 "## $AGENT_NAME" "$DOCS_DIR/AGENT_INSTRUCTIONS.md" 2>/dev/null || echo "")
    fi
}

# Main agent loop
run_agent() {
    log "Starting $AGENT_NAME ($AGENT_ROLE)"
    echo $$ > "$STATUS_DIR/$AGENT_NAME.pid"
    update_status "running" "Agent started"
    
    # Load project documentation
    load_project_docs
    
    # Initialize agent (to be overridden)
    if declare -f initialize_agent >/dev/null; then
        initialize_agent
    fi
    
    # Main loop
    while true; do
        # Check for messages
        shopt -s nullglob
        for msg in "$INBOX"/*.msg; do
            [ -f "$msg" ] && process_message "$msg"
        done
        shopt -u nullglob
        
        # Check for control signals
        if [ -f "$INBOX/STOP" ]; then
            rm -f "$INBOX/STOP"
            shutdown
        fi
        
        if [ -f "$INBOX/HEALTH_CHECK" ]; then
            rm -f "$INBOX/HEALTH_CHECK"
            health_check
        fi
        
        # Periodic tasks (to be overridden)
        if declare -f periodic_tasks >/dev/null; then
            periodic_tasks
        fi
        
        sleep 2
    done
}

# Default task handler (to be overridden by specific agents)
handle_task() {
    log "Base agent received task: $1"
    # Specific agents will override this
}

# Load enhanced Claude helper if available
FRAMEWORK_DIR="${FRAMEWORK_DIR:-/home/rob/agent-framework}"
if [ -f "$FRAMEWORK_DIR/agents/lib/claude-helper.sh" ]; then
    source "$FRAMEWORK_DIR/agents/lib/claude-helper.sh"
fi

# Legacy ask_claude function (backward compatibility)
ask_claude() {
    local prompt="$1"
    local context="${2:-}"
    
    # Try to use enhanced version if available
    if declare -f ask_claude_enhanced &>/dev/null; then
        ask_claude_enhanced "$prompt" "$AGENT_NAME" "$context"
    elif command -v claude &> /dev/null; then
        # Fallback to simple claude with --print flag
        claude --print "$prompt" 2>/dev/null
    else
        log_error "Claude CLI not available"
        echo "{\"error\": \"Claude CLI not available\"}"
    fi
}

# Export functions for child scripts
export -f log log_error log_success update_status send_message process_message
export -f health_check shutdown cleanup load_project_docs ask_claude run_agent handle_task
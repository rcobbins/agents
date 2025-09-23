#!/bin/bash

# Message Utilities for Agent Framework
# Provides inter-agent communication functions

# Configuration
AGENT_BASE_DIR="${AGENT_BASE_DIR:-$PROJECT_DIR/.agents}"
INBOX_DIR="$AGENT_BASE_DIR/inboxes"
OUTBOX_DIR="$AGENT_BASE_DIR/outboxes"
MESSAGE_ARCHIVE="$AGENT_BASE_DIR/archive/messages"

# Ensure directories exist
mkdir -p "$MESSAGE_ARCHIVE"

# Generate unique message ID
generate_message_id() {
    echo "msg-$(date +%Y%m%d-%H%M%S)-$$-$RANDOM"
}

# Escape string for JSON
escape_json() {
    local str="$1"
    # Properly escape special characters for JSON
    printf '%s' "$str" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | \
        awk '{gsub(/\r/,"\\r"); gsub(/\n/,"\\n"); printf "%s", $0}'
}

# Send message between agents
# Usage: send_agent_message FROM TO TYPE CONTENT [PRIORITY]
send_agent_message() {
    local from="$1"
    local to="$2"
    local type="$3"
    local content="$4"
    local priority="${5:-normal}"
    
    local timestamp=$(date -Iseconds)
    local msg_id=$(generate_message_id)
    
    # Ensure recipient inbox exists
    mkdir -p "$INBOX_DIR/$to"
    
    # Create message file
    local msg_file="$INBOX_DIR/$to/${msg_id}.msg"
    
    # Create message JSON
    cat > "$msg_file" << EOF
{
    "id": "$msg_id",
    "from": "$from",
    "to": "$to",
    "type": "$type",
    "priority": "$priority",
    "content": $(echo "$content" | jq -Rs .),
    "timestamp": "$timestamp",
    "status": "unread"
}
EOF
    
    # Log message sent
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Message sent: $from -> $to (Type: $type)" >> "$AGENT_BASE_DIR/logs/messages.log"
    
    # Archive copy
    cp "$msg_file" "$MESSAGE_ARCHIVE/${msg_id}.msg"
    
    echo "$msg_id"
}

# Read message
# Usage: read_agent_message AGENT MESSAGE_FILE
read_agent_message() {
    local agent="$1"
    local msg_file="$2"
    
    if [ ! -f "$msg_file" ]; then
        echo "Error: Message file not found: $msg_file" >&2
        return 1
    fi
    
    # Parse message
    local content=$(cat "$msg_file")
    
    # Mark as read by moving to processed
    local processed_dir="$AGENT_BASE_DIR/workspace/$agent/processed_messages"
    mkdir -p "$processed_dir"
    
    mv "$msg_file" "$processed_dir/$(basename $msg_file)"
    
    echo "$content"
}

# Broadcast message to multiple agents
# Usage: broadcast_message FROM "agent1 agent2 agent3" TYPE CONTENT
broadcast_message() {
    local from="$1"
    local recipients="$2"
    local type="$3"
    local content="$4"
    local priority="${5:-normal}"
    
    local msg_ids=""
    
    for recipient in $recipients; do
        local msg_id=$(send_agent_message "$from" "$recipient" "$type" "$content" "$priority")
        msg_ids+="$msg_id "
    done
    
    echo "$msg_ids"
}

# Check for new messages
# Usage: check_messages AGENT
check_messages() {
    local agent="$1"
    local inbox="$INBOX_DIR/$agent"
    
    if [ ! -d "$inbox" ]; then
        echo "0"
        return
    fi
    
    local count=$(ls -1 "$inbox"/*.msg 2>/dev/null | wc -l)
    echo "$count"
}

# Get next message for agent
# Usage: get_next_message AGENT
get_next_message() {
    local agent="$1"
    local inbox="$INBOX_DIR/$agent"
    
    if [ ! -d "$inbox" ]; then
        return 1
    fi
    
    # Get oldest message (first by timestamp)
    local next_msg=$(ls -1t "$inbox"/*.msg 2>/dev/null | tail -1)
    
    if [ -z "$next_msg" ]; then
        return 1
    fi
    
    echo "$next_msg"
}

# Send priority message (interrupts normal flow)
# Usage: send_priority_message FROM TO CONTENT
send_priority_message() {
    local from="$1"
    local to="$2"
    local content="$3"
    
    send_agent_message "$from" "$to" "priority" "$content" "high"
}

# Send task assignment
# Usage: send_task FROM TO TASK_JSON
send_task() {
    local from="$1"
    local to="$2"
    local task="$3"
    
    local content="{
        \"type\": \"task_assignment\",
        \"task\": $task
    }"
    
    send_agent_message "$from" "$to" "task_assignment" "$content" "normal"
}

# Send status update
# Usage: send_status AGENT STATUS DETAILS
send_status() {
    local agent="$1"
    local status="$2"
    local details="$3"
    
    local content="{
        \"agent\": \"$agent\",
        \"status\": \"$status\",
        \"details\": \"$details\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"
    
    send_agent_message "$agent" "coordinator" "status_update" "$content" "normal"
}

# Request help from another agent
# Usage: request_help FROM TO PROBLEM
request_help() {
    local from="$1"
    local to="$2"
    local problem="$3"
    
    local content="{
        \"type\": \"help_request\",
        \"from\": \"$from\",
        \"problem\": \"$problem\",
        \"urgency\": \"high\"
    }"
    
    send_agent_message "$from" "$to" "help_request" "$content" "high"
}

# Clean old messages
# Usage: clean_old_messages DAYS
clean_old_messages() {
    local days="${1:-7}"
    
    echo "Cleaning messages older than $days days..."
    
    # Clean from archive
    find "$MESSAGE_ARCHIVE" -type f -name "*.msg" -mtime +$days -delete 2>/dev/null
    
    # Clean from processed directories
    find "$AGENT_BASE_DIR/workspace" -type f -name "*.msg" -mtime +$days -delete 2>/dev/null
    
    echo "Message cleanup complete"
}

# Message queue functions for batching
MESSAGE_QUEUE=()

# Queue message for batch sending
queue_message() {
    local from="$1"
    local to="$2"
    local type="$3"
    local content="$4"
    
    MESSAGE_QUEUE+=("{\"from\":\"$from\",\"to\":\"$to\",\"type\":\"$type\",\"content\":\"$content\"}")
}

# Flush message queue
flush_message_queue() {
    for msg in "${MESSAGE_QUEUE[@]}"; do
        local from=$(echo "$msg" | jq -r '.from')
        local to=$(echo "$msg" | jq -r '.to')
        local type=$(echo "$msg" | jq -r '.type')
        local content=$(echo "$msg" | jq -r '.content')
        
        send_agent_message "$from" "$to" "$type" "$content"
    done
    
    MESSAGE_QUEUE=()
}

# Export functions for use by agents
export -f generate_message_id escape_json send_agent_message read_agent_message
export -f broadcast_message check_messages get_next_message send_priority_message
export -f send_task send_status request_help clean_old_messages
export -f queue_message flush_message_queue
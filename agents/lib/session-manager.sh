#!/bin/bash

# Session Manager Library
# Handles UUID generation, tracking, and session lifecycle for agents

# Configuration
PERSISTENCE_BASE="${PERSISTENCE_BASE:-$HOME/.agent-framework/persistence}"

# Ensure persistence directory exists
mkdir -p "$PERSISTENCE_BASE"

# Generate UUID - with fallback methods
generate_uuid() {
    # Try different methods to generate UUID
    if command -v uuidgen &>/dev/null; then
        uuidgen
    elif [ -r /proc/sys/kernel/random/uuid ]; then
        cat /proc/sys/kernel/random/uuid
    else
        # Fallback: generate a pseudo-UUID using random and date
        printf '%04x%04x-%04x-%04x-%04x-%04x%04x%04x\n' \
            $RANDOM $RANDOM $RANDOM \
            $((RANDOM & 0x0fff | 0x4000)) \
            $((RANDOM & 0x3fff | 0x8000)) \
            $RANDOM $RANDOM $RANDOM
    fi
}

# Get or create session UUID for agent
get_or_create_session() {
    local agent_name="$1"
    local session_file="$PERSISTENCE_BASE/$agent_name/session.state"
    
    if [ -f "$session_file" ]; then
        local uuid=$(jq -r '.uuid' "$session_file" 2>/dev/null)
        local exists=$(jq -r '.session_exists' "$session_file" 2>/dev/null)
        
        if [ "$exists" = "true" ]; then
            echo "resume:$uuid"  # Use --resume
        else
            echo "new:$uuid"     # Use --session-id (session creation failed last time)
        fi
    else
        # Generate new UUID
        local new_uuid=$(generate_uuid)
        mkdir -p "$(dirname "$session_file")"
        
        cat > "$session_file" << EOF
{
    "uuid": "$new_uuid",
    "created_at": "$(date -Iseconds)",
    "last_used": "$(date -Iseconds)",
    "status": "active",
    "session_exists": false,
    "agent": "$agent_name"
}
EOF
        echo "new:$new_uuid"
    fi
}

# Mark session as successfully created
mark_session_created() {
    local agent_name="$1"
    local session_file="$PERSISTENCE_BASE/$agent_name/session.state"
    
    if [ -f "$session_file" ]; then
        local tmp_file="${session_file}.tmp"
        jq '.session_exists = true | .last_used = now' "$session_file" > "$tmp_file" 2>/dev/null
        if [ $? -eq 0 ]; then
            mv "$tmp_file" "$session_file"
        else
            # Fallback if jq fails
            sed -i 's/"session_exists": false/"session_exists": true/' "$session_file" 2>/dev/null || \
            sed -i '' 's/"session_exists": false/"session_exists": true/' "$session_file" 2>/dev/null
        fi
    fi
}

# Update last used timestamp
update_last_used() {
    local agent_name="$1"
    local session_file="$PERSISTENCE_BASE/$agent_name/session.state"
    
    if [ -f "$session_file" ]; then
        local tmp_file="${session_file}.tmp"
        jq '.last_used = now' "$session_file" > "$tmp_file" 2>/dev/null
        if [ $? -eq 0 ]; then
            mv "$tmp_file" "$session_file"
        fi
    fi
}

# Reset agent session (generate new UUID)
reset_agent_session() {
    local agent_name="$1"
    local mode="${2:-soft}"  # soft, hard, archive
    local session_file="$PERSISTENCE_BASE/$agent_name/session.state"
    
    # Archive old session if requested
    if [ "$mode" = "archive" ] && [ -f "$session_file" ]; then
        local old_uuid=$(jq -r '.uuid' "$session_file" 2>/dev/null)
        if [ -n "$old_uuid" ] && [ "$old_uuid" != "null" ]; then
            local archive_dir="$PERSISTENCE_BASE/$agent_name/archive"
            mkdir -p "$archive_dir"
            cp "$session_file" "$archive_dir/session_${old_uuid}_$(date +%Y%m%d_%H%M%S).state"
            echo "Archived session: $old_uuid"
        fi
    fi
    
    # Generate new UUID
    local new_uuid=$(generate_uuid)
    mkdir -p "$(dirname "$session_file")"
    
    cat > "$session_file" << EOF
{
    "uuid": "$new_uuid",
    "created_at": "$(date -Iseconds)",
    "last_used": "$(date -Iseconds)",
    "status": "active",
    "session_exists": false,
    "agent": "$agent_name",
    "reset_mode": "$mode",
    "reset_at": "$(date -Iseconds)"
}
EOF
    
    # Handle different reset modes
    case "$mode" in
        hard)
            # Clear all agent data
            rm -f "$PERSISTENCE_BASE/$agent_name/memory.json"
            rm -f "$PERSISTENCE_BASE/$agent_name/context.json"
            echo "✓ Hard reset: Cleared all data for $agent_name"
            ;;
        soft)
            # Keep memory and context, just reset session
            echo "✓ Soft reset: New session for $agent_name, memory retained"
            ;;
        archive)
            echo "✓ Archive reset: Old session archived, new session for $agent_name"
            ;;
    esac
    
    echo "New session UUID: $new_uuid"
}

# Reset all agent sessions
reset_all_sessions() {
    local mode="${1:-soft}"
    local agents=("coordinator" "planner" "coder" "tester" "reviewer" "ui-assistant")
    
    echo "Resetting all agent sessions ($mode mode)..."
    for agent in "${agents[@]}"; do
        reset_agent_session "$agent" "$mode"
    done
}

# Get session info for an agent
get_session_info() {
    local agent_name="$1"
    local session_file="$PERSISTENCE_BASE/$agent_name/session.state"
    
    if [ -f "$session_file" ]; then
        cat "$session_file"
    else
        echo "{\"error\": \"No session found for $agent_name\"}"
    fi
}

# List all active sessions
list_all_sessions() {
    echo "Active Agent Sessions:"
    echo "====================="
    
    for agent_dir in "$PERSISTENCE_BASE"/*; do
        if [ -d "$agent_dir" ]; then
            local agent_name=$(basename "$agent_dir")
            local session_file="$agent_dir/session.state"
            
            if [ -f "$session_file" ]; then
                local uuid=$(jq -r '.uuid' "$session_file" 2>/dev/null || echo "unknown")
                local created=$(jq -r '.created_at' "$session_file" 2>/dev/null || echo "unknown")
                local last_used=$(jq -r '.last_used' "$session_file" 2>/dev/null || echo "never")
                local exists=$(jq -r '.session_exists' "$session_file" 2>/dev/null || echo "false")
                
                printf "%-15s: %s\n" "$agent_name" "$uuid"
                printf "%-15s  Created: %s\n" "" "$created"
                printf "%-15s  Last used: %s\n" "" "$last_used"
                printf "%-15s  Session active: %s\n\n" "" "$exists"
            fi
        fi
    done
}

# Clean up expired sessions (not used in last N days)
cleanup_old_sessions() {
    local days="${1:-30}"
    local count=0
    
    echo "Cleaning up sessions older than $days days..."
    
    for agent_dir in "$PERSISTENCE_BASE"/*; do
        if [ -d "$agent_dir" ]; then
            local agent_name=$(basename "$agent_dir")
            local archive_dir="$agent_dir/archive"
            
            if [ -d "$archive_dir" ]; then
                # Find and remove old archived sessions
                find "$archive_dir" -name "session_*.state" -mtime +"$days" -exec rm {} \; 2>/dev/null
                count=$((count + $(find "$archive_dir" -name "session_*.state" -mtime +"$days" 2>/dev/null | wc -l)))
            fi
        fi
    done
    
    echo "Cleaned up $count old session files"
}

# Save agent memory/learning
save_agent_memory() {
    local agent_name="$1"
    local memory_type="$2"  # memory, context, learning
    local content="$3"
    
    local memory_file="$PERSISTENCE_BASE/$agent_name/${memory_type}.json"
    mkdir -p "$(dirname "$memory_file")"
    
    if [ -f "$memory_file" ]; then
        # Append to existing memory
        local tmp_file="${memory_file}.tmp"
        jq ". + [{\"timestamp\": \"$(date -Iseconds)\", \"content\": \"$content\"}]" "$memory_file" > "$tmp_file" 2>/dev/null
        if [ $? -eq 0 ]; then
            mv "$tmp_file" "$memory_file"
        else
            # Fallback: create new array
            echo "[{\"timestamp\": \"$(date -Iseconds)\", \"content\": \"$content\"}]" > "$memory_file"
        fi
    else
        # Create new memory file
        echo "[{\"timestamp\": \"$(date -Iseconds)\", \"content\": \"$content\"}]" > "$memory_file"
    fi
}

# Load agent memory
load_agent_memory() {
    local agent_name="$1"
    local memory_type="${2:-memory}"  # memory, context, learning
    
    local memory_file="$PERSISTENCE_BASE/$agent_name/${memory_type}.json"
    
    if [ -f "$memory_file" ]; then
        cat "$memory_file"
    else
        echo "[]"
    fi
}

# Export functions for use by other scripts
export -f get_or_create_session mark_session_created update_last_used
export -f reset_agent_session reset_all_sessions get_session_info
export -f list_all_sessions cleanup_old_sessions
export -f save_agent_memory load_agent_memory
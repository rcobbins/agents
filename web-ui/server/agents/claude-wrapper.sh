#!/bin/bash
# Claude CLI wrapper to work around Node.js spawn bug #771
# This script is called from Node.js and properly invokes Claude CLI

# Set strict error handling
set -euo pipefail

# Get Claude path from environment or use default
CLAUDE_PATH="${CLAUDE_PATH:-/home/rob/bin/claude}"

# Function to handle timeout
timeout_handler() {
    local timeout=$1
    shift
    
    # Use timeout command if available
    if command -v timeout &> /dev/null; then
        timeout "$timeout" "$@"
    else
        # Fallback: run command in background and kill after timeout
        "$@" &
        local pid=$!
        ( sleep "$timeout" && kill -TERM $pid 2>/dev/null ) &
        local watcher=$!
        wait $pid 2>/dev/null
        local result=$?
        kill $watcher 2>/dev/null || true
        return $result
    fi
}

# Parse arguments
MODEL=""
SESSION_ID=""
RESUME=""
SYSTEM_PROMPT=""
OUTPUT_FORMAT=""
TIMEOUT="600"  # Default 10 minutes
USER_PROMPT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --model)
            MODEL="$2"
            shift 2
            ;;
        --session-id)
            SESSION_ID="$2"
            shift 2
            ;;
        --resume)
            RESUME="$2"
            shift 2
            ;;
        --append-system-prompt)
            SYSTEM_PROMPT="$2"
            shift 2
            ;;
        --output-format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --print)
            # Skip this flag, we'll add it
            shift
            ;;
        *)
            # This should be the user prompt
            USER_PROMPT="$1"
            shift
            ;;
    esac
done

# Build command
CMD=("$CLAUDE_PATH" "--print")

if [[ -n "$MODEL" ]]; then
    CMD+=("--model" "$MODEL")
fi

if [[ -n "$SESSION_ID" ]]; then
    CMD+=("--session-id" "$SESSION_ID")
elif [[ -n "$RESUME" ]]; then
    CMD+=("--resume" "$RESUME")
fi

if [[ -n "$OUTPUT_FORMAT" ]]; then
    CMD+=("--output-format" "$OUTPUT_FORMAT")
fi

# For system prompt, use echo and pipe if it's large
if [[ -n "$SYSTEM_PROMPT" ]]; then
    if [[ ${#SYSTEM_PROMPT} -gt 1000 ]]; then
        # For large system prompts, write to temp file
        TEMP_FILE=$(mktemp)
        echo "$SYSTEM_PROMPT" > "$TEMP_FILE"
        CMD+=("--append-system-prompt" "@$TEMP_FILE")
        trap "rm -f $TEMP_FILE" EXIT
    else
        CMD+=("--append-system-prompt" "$SYSTEM_PROMPT")
    fi
fi

# Add user prompt as the last argument
if [[ -n "$USER_PROMPT" ]]; then
    # For very large prompts, use stdin
    if [[ ${#USER_PROMPT} -gt 5000 ]]; then
        # Use echo and pipe for large prompts
        echo "$USER_PROMPT" | timeout_handler "$TIMEOUT" "${CMD[@]}"
    else
        CMD+=("$USER_PROMPT")
        timeout_handler "$TIMEOUT" "${CMD[@]}"
    fi
else
    # No user prompt, just run the command
    timeout_handler "$TIMEOUT" "${CMD[@]}"
fi
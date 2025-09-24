#!/bin/bash

# Simple agent launcher script
AGENT_SCRIPT="$1"

if [ -z "$AGENT_SCRIPT" ]; then
    echo "Error: Agent script path required"
    exit 1
fi

if [ ! -f "$AGENT_SCRIPT" ]; then
    echo "Error: Agent script not found: $AGENT_SCRIPT"
    exit 1
fi

# Execute the agent script
exec /bin/bash "$AGENT_SCRIPT"
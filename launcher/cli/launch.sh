#!/bin/bash

# Agent Framework CLI Launcher
# Main entry point for launching and managing agents

set -e

# Script directory and paths
LAUNCHER_DIR="$(cd "$(dirname "$0")" && pwd)"
FRAMEWORK_DIR="$(cd "$LAUNCHER_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project directory (can be passed as argument)
PROJECT_DIR="${1:-$(pwd)}"

# Validate project directory
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

# Convert to absolute path
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

# Agent configuration directory
AGENT_BASE_DIR="$PROJECT_DIR/.agents"

# Check if project is initialized
if [ ! -d "$AGENT_BASE_DIR" ]; then
    echo -e "${RED}Error: Project not initialized for Agent Framework${NC}"
    echo ""
    echo "Please run the initialization wizard first:"
    echo "  $FRAMEWORK_DIR/init/wizard.sh $PROJECT_DIR"
    exit 1
fi

# Load configurations
source "$FRAMEWORK_DIR/config/default.conf"
source "$AGENT_BASE_DIR/config/project.conf" 2>/dev/null || true

# Export necessary paths
export PROJECT_DIR
export AGENT_BASE_DIR
export FRAMEWORK_DIR

# Track running agents
declare -A AGENT_PIDS
declare -A AGENT_LOGS

# Source utilities
source "$FRAMEWORK_DIR/utils/message-utils.sh"
source "$FRAMEWORK_DIR/utils/status-utils.sh"
source "$FRAMEWORK_DIR/utils/context-utils.sh"

# Function to display header
show_header() {
    clear
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}             🤖 Agent Framework Launcher 🤖             ${NC}"
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}Project:${NC} $PROJECT_NAME"
    echo -e "${BOLD}Version:${NC} $PROJECT_VERSION"
    echo -e "${BOLD}Location:${NC} $PROJECT_DIR"
    echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}${BOLD}Checking prerequisites...${NC}"
    
    local errors=0
    
    # Check for required tools
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}  ⚠ jq not installed (JSON processing limited)${NC}"
    else
        echo -e "${GREEN}  ✓ jq installed${NC}"
    fi
    
    # Check for Claude CLI
    if command -v claude &> /dev/null; then
        echo -e "${GREEN}  ✓ Claude CLI available (AI assistance enabled)${NC}"
        CLAUDE_AVAILABLE=true
    else
        echo -e "${YELLOW}  ⚠ Claude CLI not available (agents will work with limited capabilities)${NC}"
        CLAUDE_AVAILABLE=false
    fi
    
    # Validate project configuration
    echo -e "\n${BLUE}${BOLD}Validating project configuration...${NC}"
    
    if [ -f "$AGENT_BASE_DIR/docs/PROJECT_SPEC.md" ]; then
        echo -e "${GREEN}  ✓ PROJECT_SPEC.md found${NC}"
    else
        echo -e "${RED}  ✗ PROJECT_SPEC.md missing${NC}"
        ((errors++))
    fi
    
    if [ -f "$AGENT_BASE_DIR/docs/GOALS.json" ]; then
        local goal_count=$(jq '.goals | length' "$AGENT_BASE_DIR/docs/GOALS.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}  ✓ GOALS.json found ($goal_count goals)${NC}"
    else
        echo -e "${RED}  ✗ GOALS.json missing${NC}"
        ((errors++))
    fi
    
    if [ $errors -gt 0 ]; then
        echo -e "\n${RED}${BOLD}Configuration errors found. Please fix before continuing.${NC}"
        exit 1
    fi
    
    echo -e "\n${GREEN}${BOLD}All prerequisites met!${NC}"
}

# Function to start an agent
start_agent() {
    local agent_name="$1"
    local agent_script="$AGENT_BASE_DIR/agents/${agent_name}.sh"
    
    if [ ! -f "$agent_script" ]; then
        echo -e "${RED}Agent script not found: $agent_script${NC}"
        return 1
    fi
    
    # Create log file
    local log_file="$AGENT_BASE_DIR/logs/${agent_name}_$(date +%Y%m%d_%H%M%S).log"
    AGENT_LOGS[$agent_name]="$log_file"
    
    # Start agent in background
    echo -e "${BLUE}Starting $agent_name agent...${NC}"
    
    # Export environment for agent
    export AGENT_NAME="$agent_name"
    export AGENT_BASE_DIR
    export PROJECT_DIR
    export FRAMEWORK_DIR
    
    # Start the agent
    nohup bash "$agent_script" > "$log_file" 2>&1 &
    local pid=$!
    AGENT_PIDS[$agent_name]=$pid
    
    # Wait a moment for agent to start
    sleep 1
    
    # Check if agent started successfully
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}  ✓ $agent_name started (PID: $pid)${NC}"
        update_agent_status "$agent_name" "running" "Started by launcher"
        return 0
    else
        echo -e "${RED}  ✗ $agent_name failed to start${NC}"
        echo -e "${YELLOW}  Check log: $log_file${NC}"
        return 1
    fi
}

# Function to stop an agent
stop_agent() {
    local agent_name="$1"
    local pid="${AGENT_PIDS[$agent_name]}"
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}$agent_name not tracked by launcher${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Stopping $agent_name agent (PID: $pid)...${NC}"
    
    # Send stop signal via messaging
    echo "STOP" > "$AGENT_BASE_DIR/inboxes/$agent_name/STOP"
    
    # Wait for graceful shutdown
    local count=0
    while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
        sleep 1
        ((count++))
    done
    
    # Force kill if still running
    if kill -0 $pid 2>/dev/null; then
        echo -e "${YELLOW}  Force stopping $agent_name...${NC}"
        kill -9 $pid 2>/dev/null || true
    fi
    
    echo -e "${GREEN}  ✓ $agent_name stopped${NC}"
    update_agent_status "$agent_name" "stopped" "Stopped by launcher"
    
    unset AGENT_PIDS[$agent_name]
}

# Function to start all agents
start_all_agents() {
    echo -e "\n${BLUE}${BOLD}Starting all agents...${NC}"
    
    # Start in order: coordinator first, then others
    start_agent "coordinator"
    sleep 2  # Give coordinator time to initialize
    
    for agent in planner tester coder reviewer; do
        start_agent "$agent"
        sleep 1
    done
    
    echo -e "\n${GREEN}${BOLD}All agents started successfully!${NC}"
}

# Function to stop all agents
stop_all_agents() {
    echo -e "\n${BLUE}${BOLD}Stopping all agents...${NC}"
    
    # Stop in reverse order
    for agent in reviewer coder tester planner coordinator; do
        if [ -n "${AGENT_PIDS[$agent]}" ]; then
            stop_agent "$agent"
        fi
    done
    
    echo -e "\n${GREEN}${BOLD}All agents stopped.${NC}"
}

# Function to show agent status
show_agent_status() {
    echo -e "\n${BLUE}${BOLD}Agent Status:${NC}"
    echo -e "${CYAN}────────────────────────────────────────${NC}"
    
    for agent in coordinator planner tester coder reviewer; do
        local status_file="$AGENT_BASE_DIR/status/${agent}.status"
        local color="$COLOR_RESET"
        local status="stopped"
        local details=""
        
        if [ -f "$status_file" ]; then
            status=$(jq -r '.status' "$status_file" 2>/dev/null || echo "unknown")
            details=$(jq -r '.details' "$status_file" 2>/dev/null || echo "")
        fi
        
        # Color based on agent
        case "$agent" in
            coordinator) color="$COLOR_COORDINATOR" ;;
            planner) color="$COLOR_PLANNER" ;;
            tester) color="$COLOR_TESTER" ;;
            coder) color="$COLOR_CODER" ;;
            reviewer) color="$COLOR_REVIEWER" ;;
        esac
        
        # Status icon
        local icon="⚫"
        case "$status" in
            running|healthy) icon="🟢" ;;
            busy) icon="🟡" ;;
            error) icon="🔴" ;;
            stopped) icon="⚫" ;;
        esac
        
        printf "${color}%-12s${NC} %s %-10s %s\n" "$agent" "$icon" "$status" "$details"
    done
    
    echo -e "${CYAN}────────────────────────────────────────${NC}"
}

# Function to tail agent logs
tail_agent_logs() {
    local agent="${1:-all}"
    
    if [ "$agent" = "all" ]; then
        echo -e "\n${BLUE}${BOLD}Tailing all agent logs...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
        
        # Tail all log files
        tail -f "$AGENT_BASE_DIR/logs/"*.log 2>/dev/null
    else
        local log_file="${AGENT_LOGS[$agent]}"
        if [ -z "$log_file" ]; then
            # Try to find the latest log for this agent
            log_file=$(ls -t "$AGENT_BASE_DIR/logs/${agent}_"*.log 2>/dev/null | head -1)
        fi
        
        if [ -f "$log_file" ]; then
            echo -e "\n${BLUE}${BOLD}Tailing $agent log...${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
            tail -f "$log_file"
        else
            echo -e "${RED}No log file found for $agent${NC}"
        fi
    fi
}

# Function to show project goals
show_project_goals() {
    echo -e "\n${BLUE}${BOLD}Project Goals:${NC}"
    echo -e "${CYAN}────────────────────────────────────────${NC}"
    
    if [ -f "$AGENT_BASE_DIR/docs/GOALS.json" ]; then
        jq -r '.goals[] | "[\(.status)] \(.id): \(.description)"' "$AGENT_BASE_DIR/docs/GOALS.json"
    else
        echo -e "${RED}No goals file found${NC}"
    fi
    
    echo -e "${CYAN}────────────────────────────────────────${NC}"
}

# Function to show menu
show_menu() {
    echo -e "\n${BLUE}${BOLD}Actions:${NC}"
    echo "  1) Start all agents"
    echo "  2) Stop all agents"
    echo "  3) Show agent status"
    echo "  4) Show project goals"
    echo "  5) Tail agent logs"
    echo "  6) Start specific agent"
    echo "  7) Stop specific agent"
    echo "  8) Run validation"
    echo "  9) Show configuration"
    echo "  0) Exit"
    echo ""
    read -p "Select action: " choice
    
    case $choice in
        1) start_all_agents ;;
        2) stop_all_agents ;;
        3) show_agent_status ;;
        4) show_project_goals ;;
        5)
            read -p "Agent name (or 'all'): " agent
            tail_agent_logs "$agent"
            ;;
        6)
            read -p "Agent name: " agent
            start_agent "$agent"
            ;;
        7)
            read -p "Agent name: " agent
            stop_agent "$agent"
            ;;
        8)
            "$FRAMEWORK_DIR/init/validators/check-readiness.sh" "$PROJECT_DIR"
            ;;
        9)
            show_config
            ;;
        0)
            echo -e "\n${BLUE}${BOLD}Shutting down...${NC}"
            stop_all_agents
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
}

# Signal handlers
trap 'echo -e "\n${RED}Interrupted!${NC}"; stop_all_agents; exit 130' INT TERM

# Main execution
main() {
    show_header
    check_prerequisites
    
    # Check if agents should auto-start
    if [ "${2:-}" = "--auto-start" ]; then
        start_all_agents
        show_agent_status
    fi
    
    # Main loop
    while true; do
        show_menu
        echo ""
        read -p "Press Enter to continue..." -r
        show_header
    done
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [PROJECT_DIR] [OPTIONS]"
        echo ""
        echo "Launch and manage agents for a project."
        echo ""
        echo "Arguments:"
        echo "  PROJECT_DIR      Project directory (defaults to current)"
        echo ""
        echo "Options:"
        echo "  --auto-start     Start all agents automatically"
        echo "  --help, -h       Show this help message"
        echo "  --version, -v    Show version information"
        echo ""
        echo "Examples:"
        echo "  $0                    # Launch for current directory"
        echo "  $0 /path/to/project   # Launch for specific project"
        echo "  $0 . --auto-start     # Auto-start agents"
        exit 0
        ;;
    --version|-v)
        echo "Agent Framework Launcher v$FRAMEWORK_VERSION"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
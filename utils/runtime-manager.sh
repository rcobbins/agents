#!/bin/bash

# Runtime Manager for Agent Framework
# Handles PID files, process management, and service state

set -e

# Runtime directory
RUNTIME_DIR="/home/rob/agent-framework/.runtime"
FRAMEWORK_DIR="/home/rob/agent-framework"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure runtime directory exists
ensure_runtime_dir() {
    if [ ! -d "$RUNTIME_DIR" ]; then
        mkdir -p "$RUNTIME_DIR"
    fi
}

# Save PID to file
save_pid() {
    local service_name="$1"
    local pid="$2"
    ensure_runtime_dir
    echo "$pid" > "$RUNTIME_DIR/${service_name}.pid"
}

# Read PID from file
read_pid() {
    local service_name="$1"
    local pid_file="$RUNTIME_DIR/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        cat "$pid_file"
    else
        echo ""
    fi
}

# Remove PID file
remove_pid() {
    local service_name="$1"
    rm -f "$RUNTIME_DIR/${service_name}.pid"
}

# Check if process is running
is_process_running() {
    local pid="$1"
    if [ -z "$pid" ]; then
        return 1
    fi
    
    if ps -p "$pid" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if service is running
is_service_running() {
    local service_name="$1"
    local pid=$(read_pid "$service_name")
    
    if is_process_running "$pid"; then
        return 0
    else
        # Clean up stale PID file
        remove_pid "$service_name"
        return 1
    fi
}

# Stop a service
stop_service() {
    local service_name="$1"
    local pid=$(read_pid "$service_name")
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}Service $service_name is not running${NC}"
        return 0
    fi
    
    if is_process_running "$pid"; then
        echo -e "${YELLOW}Stopping $service_name (PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null || true
        
        # Wait for process to stop
        local count=0
        while is_process_running "$pid" && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if is_process_running "$pid"; then
            echo -e "${YELLOW}Force stopping $service_name...${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        echo -e "${GREEN}$service_name stopped${NC}"
    fi
    
    remove_pid "$service_name"
}

# Check port availability
is_port_available() {
    local port="$1"
    
    if command -v lsof > /dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 1
        fi
    elif command -v netstat > /dev/null 2>&1; then
        if netstat -tuln | grep -q ":$port "; then
            return 1
        fi
    else
        # If we can't check, assume it's available
        echo -e "${YELLOW}Warning: Cannot check port availability (install lsof or netstat)${NC}"
    fi
    
    return 0
}

# Wait for service to be ready
wait_for_service() {
    local service_name="$1"
    local port="$2"
    local max_wait="${3:-30}"
    
    echo -e "${CYAN}Waiting for $service_name to be ready on port $port...${NC}"
    
    local count=0
    while [ $count -lt $max_wait ]; do
        if ! is_port_available "$port"; then
            echo -e "${GREEN}$service_name is ready${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${RED}$service_name failed to start within ${max_wait} seconds${NC}"
    return 1
}

# Get service status
get_service_status() {
    local service_name="$1"
    local pid=$(read_pid "$service_name")
    
    if [ -z "$pid" ]; then
        echo "stopped"
    elif is_process_running "$pid"; then
        echo "running"
    else
        remove_pid "$service_name"
        echo "stopped"
    fi
}

# Display service status
display_service_status() {
    local service_name="$1"
    local port="$2"
    local status=$(get_service_status "$service_name")
    local pid=$(read_pid "$service_name")
    
    if [ "$status" = "running" ]; then
        echo -e "${GREEN}✓${NC} $service_name: ${GREEN}running${NC} (PID: $pid, Port: $port)"
    else
        echo -e "${RED}✗${NC} $service_name: ${RED}stopped${NC}"
    fi
}

# Clean up stale PID files
cleanup_stale_pids() {
    ensure_runtime_dir
    
    for pid_file in "$RUNTIME_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ! is_process_running "$pid"; then
                echo -e "${YELLOW}Cleaning up stale PID file: $(basename "$pid_file")${NC}"
                rm -f "$pid_file"
            fi
        fi
    done
}

# Get all running services
list_running_services() {
    ensure_runtime_dir
    
    local has_services=false
    for pid_file in "$RUNTIME_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            local service_name=$(basename "$pid_file" .pid)
            local pid=$(cat "$pid_file")
            if is_process_running "$pid"; then
                echo -e "${GREEN}✓${NC} $service_name (PID: $pid)"
                has_services=true
            fi
        fi
    done
    
    if [ "$has_services" = false ]; then
        echo -e "${YELLOW}No services are currently running${NC}"
    fi
}

# Export functions for use in other scripts
export -f ensure_runtime_dir
export -f save_pid
export -f read_pid
export -f remove_pid
export -f is_process_running
export -f is_service_running
export -f stop_service
export -f is_port_available
export -f wait_for_service
export -f get_service_status
export -f display_service_status
export -f cleanup_stale_pids
export -f list_running_services
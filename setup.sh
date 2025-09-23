#!/bin/bash

# Agent Framework Setup Script
# Installs and configures the agent framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Framework paths
FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$HOME/.local/bin"
CONFIG_DIR="$HOME/.config/agent-framework"

# Print colored message
print_message() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# Print header
print_header() {
    echo
    print_message "$BLUE" "═══════════════════════════════════════════"
    print_message "$BLUE" "    Agent Framework Installation Setup"
    print_message "$BLUE" "═══════════════════════════════════════════"
    echo
}

# Check prerequisites
check_prerequisites() {
    print_message "$YELLOW" "Checking prerequisites..."
    
    local missing=()
    
    # Check for bash
    if ! command -v bash &> /dev/null; then
        missing+=("bash")
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi
    
    # Check for git
    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi
    
    # Check for Python 3
    if ! command -v python3 &> /dev/null; then
        missing+=("python3")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        print_message "$RED" "Missing prerequisites: ${missing[*]}"
        print_message "$RED" "Please install missing components and run setup again."
        exit 1
    fi
    
    print_message "$GREEN" "✓ All prerequisites met"
}

# Create directories
create_directories() {
    print_message "$YELLOW" "Creating directories..."
    
    # Create bin directory if it doesn't exist
    if [ ! -d "$BIN_DIR" ]; then
        mkdir -p "$BIN_DIR"
        print_message "$GREEN" "✓ Created $BIN_DIR"
    fi
    
    # Create config directory
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        print_message "$GREEN" "✓ Created $CONFIG_DIR"
    fi
}

# Install CLI command
install_cli() {
    print_message "$YELLOW" "Installing CLI command..."
    
    # Create symbolic link to launcher
    local launcher_path="$FRAMEWORK_DIR/launcher/cli/launch.sh"
    local link_path="$BIN_DIR/agent-framework"
    
    if [ -L "$link_path" ]; then
        rm "$link_path"
    fi
    
    ln -s "$launcher_path" "$link_path"
    chmod +x "$launcher_path"
    
    print_message "$GREEN" "✓ CLI command installed at $link_path"
    
    # Check if bin directory is in PATH
    if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
        print_message "$YELLOW" "Note: Add $BIN_DIR to your PATH:"
        print_message "$YELLOW" "  export PATH=\"\$PATH:$BIN_DIR\""
        
        # Add to shell rc file
        read -p "Add to shell configuration? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            add_to_path
        fi
    fi
}

# Add bin directory to PATH
add_to_path() {
    local shell_rc=""
    
    if [ -n "$BASH_VERSION" ]; then
        shell_rc="$HOME/.bashrc"
    elif [ -n "$ZSH_VERSION" ]; then
        shell_rc="$HOME/.zshrc"
    else
        shell_rc="$HOME/.profile"
    fi
    
    if ! grep -q "$BIN_DIR" "$shell_rc" 2>/dev/null; then
        echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$shell_rc"
        print_message "$GREEN" "✓ Added to $shell_rc"
        print_message "$YELLOW" "  Run: source $shell_rc"
    fi
}

# Install Node.js dependencies
install_npm_dependencies() {
    print_message "$YELLOW" "Installing Node.js dependencies..."
    
    cd "$FRAMEWORK_DIR"
    
    if [ -f "package.json" ]; then
        npm install
        print_message "$GREEN" "✓ Node.js dependencies installed"
    else
        print_message "$YELLOW" "⚠ No package.json found, skipping npm install"
    fi
    
    # Install web UI dependencies if present
    if [ -d "web-ui/server" ] && [ -f "web-ui/server/package.json" ]; then
        print_message "$YELLOW" "Installing server dependencies..."
        cd "web-ui/server"
        npm install
        print_message "$GREEN" "✓ Server dependencies installed"
    fi
    
    if [ -d "web-ui/client" ] && [ -f "web-ui/client/package.json" ]; then
        print_message "$YELLOW" "Installing client dependencies..."
        cd "web-ui/client"
        npm install
        print_message "$GREEN" "✓ Client dependencies installed"
    fi
    
    cd "$FRAMEWORK_DIR"
}

# Copy configuration
setup_configuration() {
    print_message "$YELLOW" "Setting up configuration..."
    
    # Copy default configuration
    cp "$FRAMEWORK_DIR/config/default.conf" "$CONFIG_DIR/default.conf"
    cp "$FRAMEWORK_DIR/config/framework.json" "$CONFIG_DIR/framework.json"
    
    print_message "$GREEN" "✓ Configuration files copied"
    
    # Create user config if it doesn't exist
    if [ ! -f "$CONFIG_DIR/user.conf" ]; then
        cat > "$CONFIG_DIR/user.conf" << EOF
# User configuration for Agent Framework
# Override default settings here

# Framework directory
export AGENT_FRAMEWORK_DIR="$FRAMEWORK_DIR"

# Project directory (set to your project path)
# export PROJECT_DIR="/path/to/your/project"

# Debug mode
# export DEBUG=true

# Custom agent timeout (seconds)
# export AGENT_TIMEOUT=300

# Web UI settings
# export WEB_UI_PORT=3001
# export WEB_UI_HOST=localhost
EOF
        print_message "$GREEN" "✓ User configuration created"
    fi
}

# Set permissions
set_permissions() {
    print_message "$YELLOW" "Setting permissions..."
    
    # Make all scripts executable
    find "$FRAMEWORK_DIR" -name "*.sh" -exec chmod +x {} \;
    
    print_message "$GREEN" "✓ Permissions set"
}

# Run validation
validate_installation() {
    print_message "$YELLOW" "Validating installation..."
    
    # Test CLI command
    if command -v agent-framework &> /dev/null; then
        print_message "$GREEN" "✓ CLI command available"
    else
        print_message "$YELLOW" "⚠ CLI command not in PATH yet"
    fi
    
    # Check agent templates
    local templates=("base-agent.sh" "coordinator.sh" "planner.sh" "tester.sh" "coder.sh" "reviewer.sh")
    for template in "${templates[@]}"; do
        if [ -f "$FRAMEWORK_DIR/agents/templates/$template" ]; then
            print_message "$GREEN" "✓ Found template: $template"
        else
            print_message "$RED" "✗ Missing template: $template"
        fi
    done
}

# Create test project
create_test_project() {
    read -p "Create a test project? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local test_dir="$HOME/agent-framework-test"
        print_message "$YELLOW" "Creating test project at $test_dir..."
        
        mkdir -p "$test_dir"
        cd "$test_dir"
        
        # Run initialization wizard
        "$FRAMEWORK_DIR/init/wizard.sh"
        
        print_message "$GREEN" "✓ Test project created"
        print_message "$BLUE" "  To launch agents: agent-framework launch $test_dir"
    fi
}

# Print summary
print_summary() {
    echo
    print_message "$GREEN" "════════════════════════════════════════════"
    print_message "$GREEN" "    Installation completed successfully!"
    print_message "$GREEN" "════════════════════════════════════════════"
    echo
    print_message "$BLUE" "Next steps:"
    print_message "$BLUE" "  1. Source your shell configuration:"
    print_message "$BLUE" "     source ~/.bashrc (or ~/.zshrc)"
    print_message "$BLUE" "  2. Initialize a new project:"
    print_message "$BLUE" "     agent-framework init /path/to/project"
    print_message "$BLUE" "  3. Launch agents:"
    print_message "$BLUE" "     agent-framework launch /path/to/project"
    print_message "$BLUE" "  4. Start web UI:"
    print_message "$BLUE" "     agent-framework web"
    echo
    print_message "$YELLOW" "Documentation: $FRAMEWORK_DIR/README.md"
    print_message "$YELLOW" "Configuration: $CONFIG_DIR/"
    echo
}

# Uninstall function
uninstall() {
    print_message "$RED" "Uninstalling Agent Framework..."
    
    # Remove symbolic link
    rm -f "$BIN_DIR/agent-framework"
    
    # Remove config directory
    read -p "Remove configuration files? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$CONFIG_DIR"
    fi
    
    print_message "$GREEN" "✓ Uninstallation complete"
}

# Main installation flow
main() {
    print_header
    
    # Check for uninstall flag
    if [ "$1" = "--uninstall" ]; then
        uninstall
        exit 0
    fi
    
    check_prerequisites
    create_directories
    install_cli
    install_npm_dependencies
    setup_configuration
    set_permissions
    validate_installation
    create_test_project
    print_summary
}

# Run main function
main "$@"
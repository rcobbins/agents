#!/bin/bash

# Comprehensive Dependency Test Script for Agent Framework
# Tests all components and dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Function to print test result
print_test() {
    local name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓${NC} $name"
    elif [ "$status" = "WARN" ]; then
        WARNINGS=$((WARNINGS + 1))
        echo -e "${YELLOW}⚠${NC} $name: $message"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗${NC} $name: $message"
    fi
}

# Print header
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}     Agent Framework Dependency Verification Test        ${NC}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# Test Node.js version
echo -e "${BLUE}${BOLD}1. System Requirements${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

if [ -z "$NODE_VERSION" ]; then
    print_test "Node.js installed" "FAIL" "Node.js not found"
elif [ "$NODE_MAJOR" -lt 18 ]; then
    print_test "Node.js version" "WARN" "Found v$NODE_VERSION, recommend v18+"
else
    print_test "Node.js version" "PASS" "v$NODE_VERSION"
fi

NPM_VERSION=$(npm -v 2>/dev/null)
NPM_MAJOR=$(echo "$NPM_VERSION" | cut -d'.' -f1)

if [ -z "$NPM_VERSION" ]; then
    print_test "npm installed" "FAIL" "npm not found"
elif [ "$NPM_MAJOR" -lt 9 ]; then
    print_test "npm version" "WARN" "Found v$NPM_VERSION, recommend v9+"
else
    print_test "npm version" "PASS" "v$NPM_VERSION"
fi

# Test directory structure
echo -e "\n${BLUE}${BOLD}2. Directory Structure${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

REQUIRED_DIRS=(
    "agents/templates"
    "agents/prompts"
    "bin"
    "config"
    "demo/templates"
    "docs"
    "init/templates"
    "init/validators"
    "launcher/cli"
    "utils"
    "web-ui/server"
    "web-ui/client"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$SCRIPT_DIR/$dir" ]; then
        print_test "Directory: $dir" "PASS"
    else
        print_test "Directory: $dir" "FAIL" "Not found"
    fi
done

# Test key files
echo -e "\n${BLUE}${BOLD}3. Core Files${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

REQUIRED_FILES=(
    "package.json"
    "bin/agent-framework"
    "setup.sh"
    "init/wizard.sh"
    "demo/init-demo.sh"
    "launcher/cli/launch.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        if [ -x "$SCRIPT_DIR/$file" ] || [[ "$file" == *.json ]]; then
            print_test "File: $file" "PASS"
        else
            print_test "File: $file" "WARN" "Not executable"
        fi
    else
        print_test "File: $file" "FAIL" "Not found"
    fi
done

# Test main package.json validity
echo -e "\n${BLUE}${BOLD}4. Main Package Dependencies${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

if [ -f "$SCRIPT_DIR/package.json" ]; then
    # Check if package.json is valid JSON
    if node -e "JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/package.json'))" 2>/dev/null; then
        print_test "package.json syntax" "PASS"
        
        # Test npm install (dry run)
        cd "$SCRIPT_DIR"
        if npm ls --depth=0 --json 2>/dev/null | grep -q '"dependencies"'; then
            print_test "Main dependencies installed" "PASS"
        else
            print_test "Main dependencies" "WARN" "Not installed - run npm install"
        fi
    else
        print_test "package.json syntax" "FAIL" "Invalid JSON"
    fi
else
    print_test "package.json" "FAIL" "File not found"
fi

# Test server package
echo -e "\n${BLUE}${BOLD}5. Server Dependencies${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

if [ -f "$SCRIPT_DIR/web-ui/server/package.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/web-ui/server/package.json'))" 2>/dev/null; then
        print_test "Server package.json syntax" "PASS"
        
        # Check for deprecated packages
        if grep -q "body-parser" "$SCRIPT_DIR/web-ui/server/package.json"; then
            print_test "Server deprecated packages" "FAIL" "body-parser found (use express built-in)"
        else
            print_test "Server deprecated packages" "PASS" "None found"
        fi
    else
        print_test "Server package.json syntax" "FAIL" "Invalid JSON"
    fi
else
    print_test "Server package.json" "FAIL" "File not found"
fi

# Test client package
echo -e "\n${BLUE}${BOLD}6. Client (React) Dependencies${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

if [ -f "$SCRIPT_DIR/web-ui/client/package.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/web-ui/client/package.json'))" 2>/dev/null; then
        print_test "Client package.json syntax" "PASS"
        
        # Check for Vite configuration
        if [ -f "$SCRIPT_DIR/web-ui/client/vite.config.ts" ]; then
            print_test "Vite configuration" "PASS"
        else
            print_test "Vite configuration" "FAIL" "vite.config.ts not found"
        fi
        
        # Check for TypeScript configuration
        if [ -f "$SCRIPT_DIR/web-ui/client/tsconfig.json" ]; then
            print_test "TypeScript configuration" "PASS"
        else
            print_test "TypeScript configuration" "WARN" "tsconfig.json not found"
        fi
    else
        print_test "Client package.json syntax" "FAIL" "Invalid JSON"
    fi
else
    print_test "Client package.json" "FAIL" "File not found"
fi

# Test demo templates
echo -e "\n${BLUE}${BOLD}7. Demo Templates${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

DEMO_FILES=(
    "demo/templates/PROJECT_SPEC.md"
    "demo/templates/GOALS.json"
    "demo/templates/ARCHITECTURE.md"
    "demo/templates/TECH_STACK.md"
    "demo/templates/TESTING_STRATEGY.md"
    "demo/templates/AGENT_INSTRUCTIONS.md"
)

for file in "${DEMO_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        print_test "Demo: $(basename $file)" "PASS"
    else
        print_test "Demo: $(basename $file)" "FAIL" "Not found"
    fi
done

# Check for common dependency issues
echo -e "\n${BLUE}${BOLD}8. Dependency Compatibility${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

# Check ESLint configuration
if [ -f "$SCRIPT_DIR/eslint.config.js" ]; then
    print_test "ESLint v9 flat config" "PASS"
else
    print_test "ESLint v9 flat config" "FAIL" "eslint.config.js not found"
fi

# Quick install test (non-destructive)
echo -e "\n${BLUE}${BOLD}9. Installation Test${NC}"
echo -e "${BLUE}────────────────────────────────────${NC}"

# Test if npm can resolve dependencies
cd "$SCRIPT_DIR"
if npm ls --depth=0 --json --package-lock-only 2>&1 | grep -q "ERESOLVE"; then
    print_test "Dependency resolution" "FAIL" "Conflicts detected"
else
    print_test "Dependency resolution" "PASS" "No conflicts"
fi

# Print summary
echo -e "\n${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}                    Test Summary                         ${NC}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}${BOLD}Passed:${NC} $PASSED_TESTS"
echo -e "${YELLOW}${BOLD}Warnings:${NC} $WARNINGS"
echo -e "${RED}${BOLD}Failed:${NC} $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}✅ All tests passed! Framework is ready to use.${NC}"
    else
        echo -e "${GREEN}${BOLD}✅ Framework is functional with $WARNINGS warnings.${NC}"
    fi
    echo ""
    echo -e "${BOLD}Next steps:${NC}"
    echo -e "  1. Run: ${CYAN}npm run install:deps${NC} to install all dependencies"
    echo -e "  2. Run: ${CYAN}./setup.sh${NC} to complete setup"
    echo -e "  3. Run: ${CYAN}agent-framework init-demo /path/to/project${NC} to test"
    exit 0
else
    echo -e "${RED}${BOLD}❌ $FAILED_TESTS tests failed. Please fix issues before proceeding.${NC}"
    echo ""
    echo -e "${BOLD}Common fixes:${NC}"
    echo -e "  • Update Node.js to version 18 or higher"
    echo -e "  • Run: ${CYAN}git pull${NC} to get latest changes"
    echo -e "  • Check file permissions"
    echo -e "  • Review error messages above"
    exit 1
fi
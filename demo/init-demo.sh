#!/bin/bash

# Demo Project Initialization Script
# Creates a pre-populated TaskFlow project for demonstration

set -e

# Script directory
DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
FRAMEWORK_DIR="$(cd "$DEMO_DIR/.." && pwd)"
TEMPLATES_DIR="$DEMO_DIR/templates"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Project directory from argument
PROJECT_DIR="${1:-$(pwd)}"

# Print header
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}       🚀 TaskFlow Demo Project Initialization 🚀        ${NC}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

# Validate project directory
if [ -z "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: No project directory specified${NC}"
    echo "Usage: agent-framework init-demo /path/to/project"
    exit 1
fi

# Convert to absolute path
PROJECT_DIR="$(cd "$(dirname "$PROJECT_DIR")" && pwd)/$(basename "$PROJECT_DIR")"

# Check if directory exists
if [ -d "$PROJECT_DIR" ]; then
    # Check if it's empty
    if [ "$(ls -A "$PROJECT_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}Warning: Directory $PROJECT_DIR is not empty${NC}"
        read -p "Continue and overwrite existing files? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Initialization cancelled${NC}"
            exit 1
        fi
    fi
else
    # Create directory
    echo -e "${BLUE}Creating project directory: $PROJECT_DIR${NC}"
    mkdir -p "$PROJECT_DIR"
fi

echo -e "\n${BLUE}${BOLD}Step 1: Copying project documentation${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Copy documentation files
cp "$TEMPLATES_DIR/README.md" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ README.md${NC}"

cp "$TEMPLATES_DIR/PROJECT_SPEC.md" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ PROJECT_SPEC.md${NC}"

cp "$TEMPLATES_DIR/GOALS.json" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ GOALS.json${NC}"

cp "$TEMPLATES_DIR/TECH_STACK.md" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ TECH_STACK.md${NC}"

cp "$TEMPLATES_DIR/TESTING_STRATEGY.md" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ TESTING_STRATEGY.md${NC}"

cp "$TEMPLATES_DIR/ARCHITECTURE.md" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ ARCHITECTURE.md${NC}"

cp "$TEMPLATES_DIR/AGENT_INSTRUCTIONS.md" "$PROJECT_DIR/"
echo -e "${GREEN}  ✓ AGENT_INSTRUCTIONS.md${NC}"

echo -e "\n${BLUE}${BOLD}Step 2: Creating project structure${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Create directory structure
mkdir -p "$PROJECT_DIR"/{frontend,backend,shared,database,docs,tests}
echo -e "${GREEN}  ✓ Created project directories${NC}"

# Copy source files
if [ -f "$TEMPLATES_DIR/src/package.json" ]; then
    cp "$TEMPLATES_DIR/src/package.json" "$PROJECT_DIR/"
    echo -e "${GREEN}  ✓ Root package.json${NC}"
fi

# Create frontend structure
mkdir -p "$PROJECT_DIR/frontend"/{src,public,tests}
mkdir -p "$PROJECT_DIR/frontend/src"/{components,pages,services,hooks,store,utils,types,styles}
echo -e "${GREEN}  ✓ Frontend structure${NC}"

# Create backend structure
mkdir -p "$PROJECT_DIR/backend"/{src,tests}
mkdir -p "$PROJECT_DIR/backend/src"/{api,services,middleware,models,utils,config,types}
echo -e "${GREEN}  ✓ Backend structure${NC}"

# Create shared structure
mkdir -p "$PROJECT_DIR/shared/src"/{types,utils,constants}
echo -e "${GREEN}  ✓ Shared structure${NC}"

echo -e "\n${BLUE}${BOLD}Step 3: Creating initial source files${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Create initial TypeScript configs
cat > "$PROJECT_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./",
    "composite": true,
    "incremental": true
  },
  "references": [
    { "path": "./frontend" },
    { "path": "./backend" },
    { "path": "./shared" }
  ]
}
EOF
echo -e "${GREEN}  ✓ Root tsconfig.json${NC}"

# Create frontend package.json
cat > "$PROJECT_DIR/frontend/package.json" << 'EOF'
{
  "name": "@taskflow/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
EOF
echo -e "${GREEN}  ✓ Frontend package.json${NC}"

# Create backend package.json
cat > "$PROJECT_DIR/backend/package.json" << 'EOF'
{
  "name": "@taskflow/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src"
  },
  "dependencies": {
    "express": "^4.19.0",
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "nodemon": "^3.0.0",
    "prisma": "^5.7.0"
  }
}
EOF
echo -e "${GREEN}  ✓ Backend package.json${NC}"

echo -e "\n${BLUE}${BOLD}Step 4: Setting up agent framework${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Create .agents directory structure
AGENT_DIR="$PROJECT_DIR/.agents"
mkdir -p "$AGENT_DIR"/{inbox,outbox,logs,state,config}
echo -e "${GREEN}  ✓ Agent directories created${NC}"

# Create project configuration
cat > "$AGENT_DIR/config/project.conf" << EOF
# TaskFlow Demo Project Configuration
PROJECT_NAME="TaskFlow"
PROJECT_VERSION="1.0.0"
PROJECT_TYPE="demo"
PROJECT_DESCRIPTION="Modern task management application"

# Agent settings
ENABLE_ALL_AGENTS=true
AUTO_START_AGENTS=false
DEBUG_MODE=true

# Development settings
TECH_STACK="TypeScript,React,Node.js,PostgreSQL"
TEST_FRAMEWORK="Jest,Vitest"
BUILD_TOOL="Vite"
EOF
echo -e "${GREEN}  ✓ Project configuration${NC}"

# Create initial agent state
cat > "$AGENT_DIR/state/project.json" << 'EOF'
{
  "initialized": true,
  "phase": 1,
  "currentGoal": "goal-001",
  "completedTasks": [],
  "activeAgents": [],
  "lastUpdated": null
}
EOF
echo -e "${GREEN}  ✓ Initial agent state${NC}"

echo -e "\n${BLUE}${BOLD}Step 5: Creating development files${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Create .gitignore
cat > "$PROJECT_DIR/.gitignore" << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.lcov

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Agent Framework
.agents/logs/
.agents/state/
.agents/inbox/
.agents/outbox/
EOF
echo -e "${GREEN}  ✓ .gitignore${NC}"

# Create .eslintrc.js
cat > "$PROJECT_DIR/.eslintrc.js" << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  env: {
    node: true,
    es2022: true
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
EOF
echo -e "${GREEN}  ✓ ESLint configuration${NC}"

# Create .prettierrc
cat > "$PROJECT_DIR/.prettierrc" << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF
echo -e "${GREEN}  ✓ Prettier configuration${NC}"

# Create docker-compose.yml for development
cat > "$PROJECT_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: taskflow
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: taskflow123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
EOF
echo -e "${GREEN}  ✓ Docker Compose configuration${NC}"

echo -e "\n${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}        ✅ Demo Project Initialized Successfully!        ${NC}"
echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Project Details:${NC}"
echo -e "  • Name: TaskFlow"
echo -e "  • Type: Task Management Application"
echo -e "  • Location: $PROJECT_DIR"
echo -e "  • Stack: TypeScript, React, Node.js, PostgreSQL"
echo ""
echo -e "${BOLD}Project Structure:${NC}"
echo -e "  • Frontend: React 18 with TypeScript and Vite"
echo -e "  • Backend: Express with TypeScript and Prisma"
echo -e "  • Database: PostgreSQL with Redis cache"
echo -e "  • Testing: Jest and Vitest"
echo ""
echo -e "${BOLD}Documentation Files:${NC}"
echo -e "  • PROJECT_SPEC.md - Complete project specification"
echo -e "  • GOALS.json - Development goals and milestones"
echo -e "  • ARCHITECTURE.md - System design and architecture"
echo -e "  • AGENT_INSTRUCTIONS.md - Instructions for AI agents"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo -e "  1. Review the project documentation"
echo -e "  2. Start Docker containers: ${CYAN}cd $PROJECT_DIR && docker-compose up -d${NC}"
echo -e "  3. Install dependencies: ${CYAN}npm install${NC}"
echo -e "  4. Launch agents: ${CYAN}agent-framework launch $PROJECT_DIR${NC}"
echo -e "  5. Monitor progress: ${CYAN}agent-framework monitor $PROJECT_DIR${NC}"
echo ""
echo -e "${YELLOW}${BOLD}Note:${NC} The agents will begin developing the TaskFlow application"
echo -e "      according to the specifications in GOALS.json"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
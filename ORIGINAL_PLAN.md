# Original Agent Framework Plan

## Phase 1: Extract Agent Framework to Standalone Project

### 1.1 Core Framework Structure

Location: /home/rob/agent-framework/

```
/home/rob/agent-framework/
├── agents/                      # Agent definitions
│   ├── templates/               # Base agent templates
│   │   ├── base-agent.sh
│   │   ├── coordinator.sh
│   │   ├── planner.sh
│   │   ├── tester.sh
│   │   ├── coder.sh
│   │   └── reviewer.sh
│   └── prompts/                 # Agent instruction templates
│       ├── coordinator.md
│       ├── planner.md
│       ├── tester.md
│       ├── coder.md
│       └── reviewer.md
├── launcher/                    # Launch and monitoring scripts
│   ├── cli/                    # Terminal-based launcher
│   │   └── launch.sh           # Main CLI launcher
│   └── web/                    # Web-based launcher (Phase 2)
├── utils/                      # Shared utilities
│   ├── message-utils.sh
│   ├── status-utils.sh
│   └── escape-utils.sh
├── init/                       # Project initialization system
│   ├── wizard.sh              # Interactive project setup
│   ├── templates/             # Project documentation templates
│   │   ├── PROJECT_SPEC.md
│   │   ├── TECH_STACK.md
│   │   ├── GOALS.json
│   │   ├── TESTING_STRATEGY.md
│   │   └── ARCHITECTURE.md
│   └── validators/            # Validate project readiness
│       └── check-readiness.sh
├── config/                    # Configuration files
│   ├── default.conf
│   └── framework.json
├── docs/                      # Framework documentation
│   ├── README.md
│   ├── INITIALIZATION.md
│   ├── AGENT_GUIDE.md
│   └── API.md
├── web-ui/                    # Web interface
│   ├── server/               # Node.js backend
│   └── client/              # React frontend
├── package.json              # Node dependencies
├── setup.sh                  # Framework installation
└── README.md                # Main documentation
```

## Phase 2: Web UI with Project Setup Interface

### 2.1 Web-Based Project Initialization

Component: ProjectInitWizard.tsx

```typescript
interface ProjectInitWizard {
  steps: [
    'BasicInfo',        // Name, description
    'TechStack',        // Languages, frameworks
    'Structure',        // Directory layout
    'Goals',           // Project objectives
    'Testing',         // Test strategy
    'Architecture',    // System design
    'Review'          // Confirm settings
  ];
  
  onComplete: (config: ProjectConfig) => void;
  
  // Validation per step
  validateStep: (step: string, data: any) => ValidationResult;
  
  // Generate agent docs
  generateDocumentation: (config: ProjectConfig) => AgentDocs;
}
```

### 2.2 Project Management Dashboard

```typescript
// Main project view
interface ProjectDashboard {
  // Project selector
  projectList: ProjectInfo[];
  activeProject: string;
  
  // Initialization status
  initStatus: {
    documented: boolean;
    validated: boolean;
    agentsReady: boolean;
  };
  
  // Quick actions
  actions: {
    editDocs: () => void;
    revalidate: () => void;
    launchAgents: () => void;
  };
}
```

## Phase 3: Implementation Steps

### Step 4: Web UI Development (Days 4-6)

```bash
cd /home/rob/agent-framework/web-ui

# Backend setup
cd server
npm init -y
npm install express socket.io chokidar

# Frontend setup  
cd ../client
npx create-react-app . --template typescript
npm install socket.io-client xterm chart.js
```

## Key Features of the Initialization System

1. **Guided Documentation Creation**
   - Interactive wizard walks through all necessary information
   - Generates structured documentation agents can understand
   - Templates ensure consistency across projects

2. **Project-Specific Agent Instructions**
   - Each project gets custom AGENT_INSTRUCTIONS.md
   - Tailored to project's tech stack and structure
   - Clear success criteria for each agent

3. **Goal-Driven Development**
   - GOALS.json becomes the north star for agents
   - Coordinator tracks progress toward objectives
   - Measurable success metrics

4. **Validation Before Launch**
   - Ensures all required documentation exists
   - Validates project structure matches config
   - Prevents agents from starting without proper setup

5. **Easy Refinement**
   - Documentation is in markdown/JSON for easy editing
   - Can iteratively improve agent instructions
   - Learn from agent performance and adjust
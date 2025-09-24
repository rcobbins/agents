export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'api' | 'mobile' | 'cli' | 'library' | 'data' | 'ml' | 'desktop';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  techStack: string[];
  structure: {
    directories: string[];
    entryPoint: string;
  };
  goals: Array<{
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  testing: {
    framework: string;
    coverage: number;
  };
  architecture: {
    type: string;
    components: string[];
  };
  setupTime: string;
  popularityScore: number;
}

export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  'init-demo': {
    id: 'init-demo',
    name: 'Demo Project',
    description: 'A demonstration project showcasing all features of the project initialization system',
    category: 'web',
    difficulty: 'intermediate',
    icon: '🎯',
    techStack: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Jest', 'Docker', 'Redis'],
    structure: {
      directories: ['src', 'tests', 'docs', 'src/components', 'src/services', 'src/api', 'src/utils', 'server', 'database'],
      entryPoint: 'src/index.tsx'
    },
    goals: [
      { description: 'Build a full-stack web application with React and Node.js', priority: 'high' },
      { description: 'Implement user authentication and authorization', priority: 'high' },
      { description: 'Create RESTful API endpoints with Express', priority: 'high' },
      { description: 'Set up PostgreSQL database with migrations', priority: 'high' },
      { description: 'Achieve 80% test coverage with Jest', priority: 'medium' },
      { description: 'Implement caching with Redis', priority: 'medium' },
      { description: 'Deploy with Docker containers', priority: 'low' }
    ],
    testing: { framework: 'Jest', coverage: 80 },
    architecture: {
      type: 'layered',
      components: ['Frontend UI', 'API Gateway', 'Business Logic', 'Data Access Layer', 'Database', 'Cache Layer']
    },
    setupTime: '5 minutes',
    popularityScore: 100
  },
  'react-spa': {
    id: 'react-spa',
    name: 'Modern React SPA',
    description: 'Single-page application with React, TypeScript, and modern tooling',
    category: 'web',
    difficulty: 'beginner',
    icon: '⚛️',
    techStack: ['React', 'TypeScript', 'Vite', 'React Router', 'Axios', 'TailwindCSS', 'ESLint', 'Prettier'],
    structure: {
      directories: ['src', 'public', 'tests', 'docs', 'src/components', 'src/hooks', 'src/services', 'src/utils'],
      entryPoint: 'src/main.tsx'
    },
    goals: [
      { description: 'Set up development environment with hot reload', priority: 'high' },
      { description: 'Create reusable component library', priority: 'high' },
      { description: 'Implement routing and navigation', priority: 'high' },
      { description: 'Add state management solution', priority: 'medium' },
      { description: 'Integrate API communication layer', priority: 'medium' },
      { description: 'Set up testing infrastructure', priority: 'medium' }
    ],
    testing: { framework: 'Vitest', coverage: 80 },
    architecture: {
      type: 'component-based',
      components: ['UI Components', 'Services Layer', 'State Management', 'Routing']
    },
    setupTime: '5 minutes',
    popularityScore: 95
  },
  
  'express-api': {
    id: 'express-api',
    name: 'RESTful API with Express',
    description: 'Production-ready REST API with Express.js, TypeScript, and PostgreSQL',
    category: 'api',
    difficulty: 'intermediate',
    icon: '🚀',
    techStack: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL', 'Prisma', 'JWT', 'Joi', 'Winston', 'Jest'],
    structure: {
      directories: ['src', 'tests', 'docs', 'migrations', 'src/controllers', 'src/services', 'src/models', 'src/middleware', 'src/utils'],
      entryPoint: 'src/server.ts'
    },
    goals: [
      { description: 'Set up Express server with TypeScript', priority: 'high' },
      { description: 'Configure database connection and ORM', priority: 'high' },
      { description: 'Implement authentication and authorization', priority: 'high' },
      { description: 'Create CRUD endpoints for core entities', priority: 'high' },
      { description: 'Add request validation and error handling', priority: 'medium' },
      { description: 'Implement logging and monitoring', priority: 'medium' },
      { description: 'Set up API documentation with Swagger', priority: 'low' }
    ],
    testing: { framework: 'Jest', coverage: 85 },
    architecture: {
      type: 'layered',
      components: ['Controllers', 'Services', 'Data Access Layer', 'Middleware', 'Utilities']
    },
    setupTime: '10 minutes',
    popularityScore: 90
  },
  
  'fullstack-mern': {
    id: 'fullstack-mern',
    name: 'Full-Stack MERN Application',
    description: 'Complete MERN stack application with authentication and real-time features',
    category: 'web',
    difficulty: 'advanced',
    icon: '🌐',
    techStack: ['MongoDB', 'Express', 'React', 'Node.js', 'TypeScript', 'Socket.io', 'Redux Toolkit', 'Material-UI', 'Docker'],
    structure: {
      directories: ['client', 'server', 'shared', 'docker', 'docs', 'client/src', 'server/src', 'shared/types'],
      entryPoint: 'server/src/index.ts'
    },
    goals: [
      { description: 'Set up monorepo with client and server', priority: 'high' },
      { description: 'Configure MongoDB with Mongoose schemas', priority: 'high' },
      { description: 'Implement user authentication flow', priority: 'high' },
      { description: 'Create real-time features with WebSockets', priority: 'high' },
      { description: 'Set up Redux for state management', priority: 'medium' },
      { description: 'Implement file upload functionality', priority: 'medium' },
      { description: 'Add Docker configuration for deployment', priority: 'low' }
    ],
    testing: { framework: 'Jest + Cypress', coverage: 75 },
    architecture: {
      type: 'microservices-ready',
      components: ['React Client', 'Express API', 'MongoDB Database', 'WebSocket Server', 'Shared Types']
    },
    setupTime: '15 minutes',
    popularityScore: 88
  },
  
  'nextjs-app': {
    id: 'nextjs-app',
    name: 'Next.js Full-Stack App',
    description: 'Server-side rendered React app with API routes and database',
    category: 'web',
    difficulty: 'intermediate',
    icon: '▲',
    techStack: ['Next.js', 'React', 'TypeScript', 'Prisma', 'PostgreSQL', 'TailwindCSS', 'NextAuth', 'tRPC'],
    structure: {
      directories: ['app', 'components', 'lib', 'prisma', 'public', 'styles', 'tests', 'types'],
      entryPoint: 'app/layout.tsx'
    },
    goals: [
      { description: 'Set up Next.js 14 with App Router', priority: 'high' },
      { description: 'Configure database with Prisma ORM', priority: 'high' },
      { description: 'Implement authentication with NextAuth', priority: 'high' },
      { description: 'Create server and client components', priority: 'high' },
      { description: 'Set up API routes with tRPC', priority: 'medium' },
      { description: 'Implement SEO and metadata', priority: 'medium' },
      { description: 'Add incremental static regeneration', priority: 'low' }
    ],
    testing: { framework: 'Jest + React Testing Library', coverage: 80 },
    architecture: {
      type: 'hybrid-rendering',
      components: ['Server Components', 'Client Components', 'API Routes', 'Database Layer']
    },
    setupTime: '8 minutes',
    popularityScore: 92
  },
  
  'python-fastapi': {
    id: 'python-fastapi',
    name: 'FastAPI Microservice',
    description: 'High-performance Python API with async support and automatic documentation',
    category: 'api',
    difficulty: 'intermediate',
    icon: '🐍',
    techStack: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Alembic', 'Pydantic', 'Pytest', 'Redis', 'Celery'],
    structure: {
      directories: ['app', 'tests', 'migrations', 'app/api', 'app/core', 'app/models', 'app/services', 'app/schemas'],
      entryPoint: 'app/main.py'
    },
    goals: [
      { description: 'Set up FastAPI with async/await support', priority: 'high' },
      { description: 'Configure SQLAlchemy ORM with PostgreSQL', priority: 'high' },
      { description: 'Implement JWT authentication', priority: 'high' },
      { description: 'Create async CRUD operations', priority: 'high' },
      { description: 'Set up Celery for background tasks', priority: 'medium' },
      { description: 'Add Redis caching layer', priority: 'medium' },
      { description: 'Configure automatic API documentation', priority: 'low' }
    ],
    testing: { framework: 'Pytest', coverage: 90 },
    architecture: {
      type: 'clean-architecture',
      components: ['API Layer', 'Service Layer', 'Repository Layer', 'Domain Models', 'Background Tasks']
    },
    setupTime: '10 minutes',
    popularityScore: 85
  },
  
  'vue-pwa': {
    id: 'vue-pwa',
    name: 'Vue.js Progressive Web App',
    description: 'Offline-first PWA with Vue 3, Composition API, and service workers',
    category: 'web',
    difficulty: 'intermediate',
    icon: '💚',
    techStack: ['Vue 3', 'TypeScript', 'Vite', 'Pinia', 'Vue Router', 'Quasar', 'Workbox', 'IndexedDB'],
    structure: {
      directories: ['src', 'public', 'tests', 'src/components', 'src/composables', 'src/stores', 'src/views'],
      entryPoint: 'src/main.ts'
    },
    goals: [
      { description: 'Set up Vue 3 with Composition API', priority: 'high' },
      { description: 'Configure PWA with service workers', priority: 'high' },
      { description: 'Implement offline data sync', priority: 'high' },
      { description: 'Set up Pinia for state management', priority: 'medium' },
      { description: 'Add push notifications support', priority: 'medium' },
      { description: 'Implement app installation prompt', priority: 'low' }
    ],
    testing: { framework: 'Vitest + Vue Test Utils', coverage: 80 },
    architecture: {
      type: 'component-based',
      components: ['Vue Components', 'Composables', 'State Stores', 'Service Workers']
    },
    setupTime: '7 minutes',
    popularityScore: 80
  },
  
  'react-native-app': {
    id: 'react-native-app',
    name: 'Cross-Platform Mobile App',
    description: 'React Native app for iOS and Android with native features',
    category: 'mobile',
    difficulty: 'advanced',
    icon: '📱',
    techStack: ['React Native', 'TypeScript', 'Expo', 'React Navigation', 'Redux Toolkit', 'React Query', 'React Native Paper'],
    structure: {
      directories: ['src', 'assets', 'src/screens', 'src/components', 'src/navigation', 'src/services', 'src/store'],
      entryPoint: 'App.tsx'
    },
    goals: [
      { description: 'Set up React Native with Expo', priority: 'high' },
      { description: 'Configure navigation structure', priority: 'high' },
      { description: 'Implement authentication flow', priority: 'high' },
      { description: 'Add camera and gallery access', priority: 'medium' },
      { description: 'Set up push notifications', priority: 'medium' },
      { description: 'Implement offline storage', priority: 'medium' }
    ],
    testing: { framework: 'Jest + React Native Testing Library', coverage: 70 },
    architecture: {
      type: 'mobile-mvc',
      components: ['Screens', 'Navigation', 'Components', 'Services', 'State Management']
    },
    setupTime: '12 minutes',
    popularityScore: 82
  },
  
  'cli-tool': {
    id: 'cli-tool',
    name: 'Node.js CLI Tool',
    description: 'Command-line tool with interactive prompts and file operations',
    category: 'cli',
    difficulty: 'beginner',
    icon: '⌨️',
    techStack: ['Node.js', 'TypeScript', 'Commander', 'Inquirer', 'Chalk', 'Ora', 'Jest'],
    structure: {
      directories: ['src', 'tests', 'bin', 'src/commands', 'src/utils', 'templates'],
      entryPoint: 'src/index.ts'
    },
    goals: [
      { description: 'Set up CLI with Commander.js', priority: 'high' },
      { description: 'Add interactive prompts with Inquirer', priority: 'high' },
      { description: 'Implement file operations', priority: 'high' },
      { description: 'Add colorful output and spinners', priority: 'medium' },
      { description: 'Create config file management', priority: 'medium' },
      { description: 'Add update notifier', priority: 'low' }
    ],
    testing: { framework: 'Jest', coverage: 90 },
    architecture: {
      type: 'command-pattern',
      components: ['Commands', 'Utilities', 'Templates', 'Config Manager']
    },
    setupTime: '5 minutes',
    popularityScore: 75
  },
  
  'django-webapp': {
    id: 'django-webapp',
    name: 'Django Full-Stack Application',
    description: 'Full-featured Django app with admin panel, REST API, and templates',
    category: 'web',
    difficulty: 'intermediate',
    icon: '🎸',
    techStack: ['Python', 'Django', 'PostgreSQL', 'Django REST Framework', 'Celery', 'Redis', 'Bootstrap', 'htmx'],
    structure: {
      directories: ['apps', 'config', 'static', 'templates', 'media', 'tests', 'requirements'],
      entryPoint: 'manage.py'
    },
    goals: [
      { description: 'Set up Django project with multiple apps', priority: 'high' },
      { description: 'Configure PostgreSQL database', priority: 'high' },
      { description: 'Implement user authentication system', priority: 'high' },
      { description: 'Create REST API with DRF', priority: 'high' },
      { description: 'Set up Celery for async tasks', priority: 'medium' },
      { description: 'Add admin panel customization', priority: 'medium' },
      { description: 'Implement file upload handling', priority: 'low' }
    ],
    testing: { framework: 'Django Test + Pytest', coverage: 85 },
    architecture: {
      type: 'mvt',
      components: ['Models', 'Views', 'Templates', 'REST API', 'Admin Panel', 'Background Tasks']
    },
    setupTime: '10 minutes',
    popularityScore: 83
  },
  
  'graphql-server': {
    id: 'graphql-server',
    name: 'GraphQL API Server',
    description: 'GraphQL server with subscriptions, DataLoader, and type generation',
    category: 'api',
    difficulty: 'advanced',
    icon: '◈',
    techStack: ['Node.js', 'Apollo Server', 'TypeScript', 'Prisma', 'GraphQL', 'DataLoader', 'Redis', 'Jest'],
    structure: {
      directories: ['src', 'tests', 'src/resolvers', 'src/schema', 'src/dataloaders', 'src/services', 'generated'],
      entryPoint: 'src/server.ts'
    },
    goals: [
      { description: 'Set up Apollo Server with TypeScript', priority: 'high' },
      { description: 'Define GraphQL schema and types', priority: 'high' },
      { description: 'Implement resolvers with Prisma', priority: 'high' },
      { description: 'Add DataLoader for N+1 prevention', priority: 'high' },
      { description: 'Implement subscriptions', priority: 'medium' },
      { description: 'Add authentication and permissions', priority: 'medium' },
      { description: 'Set up type generation', priority: 'low' }
    ],
    testing: { framework: 'Jest + Apollo Testing', coverage: 85 },
    architecture: {
      type: 'schema-first',
      components: ['Schema', 'Resolvers', 'DataLoaders', 'Services', 'Subscriptions']
    },
    setupTime: '12 minutes',
    popularityScore: 78
  },
  
  'electron-desktop': {
    id: 'electron-desktop',
    name: 'Electron Desktop Application',
    description: 'Cross-platform desktop app with React and native features',
    category: 'desktop',
    difficulty: 'advanced',
    icon: '🖥️',
    techStack: ['Electron', 'React', 'TypeScript', 'Electron Forge', 'SQLite', 'Electron Store', 'Electron Builder'],
    structure: {
      directories: ['src', 'src/main', 'src/renderer', 'src/preload', 'assets', 'build'],
      entryPoint: 'src/main/index.ts'
    },
    goals: [
      { description: 'Set up Electron with React', priority: 'high' },
      { description: 'Configure main and renderer processes', priority: 'high' },
      { description: 'Implement IPC communication', priority: 'high' },
      { description: 'Add native menu and tray', priority: 'medium' },
      { description: 'Set up auto-updater', priority: 'medium' },
      { description: 'Configure build for multiple platforms', priority: 'low' }
    ],
    testing: { framework: 'Jest + Spectron', coverage: 75 },
    architecture: {
      type: 'multi-process',
      components: ['Main Process', 'Renderer Process', 'Preload Scripts', 'IPC Bridge']
    },
    setupTime: '15 minutes',
    popularityScore: 70
  },
  
  'ml-pipeline': {
    id: 'ml-pipeline',
    name: 'Machine Learning Pipeline',
    description: 'End-to-end ML pipeline with training, serving, and monitoring',
    category: 'ml',
    difficulty: 'advanced',
    icon: '🤖',
    techStack: ['Python', 'TensorFlow', 'FastAPI', 'MLflow', 'DVC', 'Docker', 'Prometheus', 'Grafana'],
    structure: {
      directories: ['data', 'models', 'notebooks', 'src', 'tests', 'configs', 'scripts', 'monitoring'],
      entryPoint: 'src/main.py'
    },
    goals: [
      { description: 'Set up data versioning with DVC', priority: 'high' },
      { description: 'Create model training pipeline', priority: 'high' },
      { description: 'Implement model serving API', priority: 'high' },
      { description: 'Set up experiment tracking with MLflow', priority: 'high' },
      { description: 'Add model monitoring', priority: 'medium' },
      { description: 'Implement A/B testing framework', priority: 'medium' },
      { description: 'Create automated retraining pipeline', priority: 'low' }
    ],
    testing: { framework: 'Pytest + Great Expectations', coverage: 80 },
    architecture: {
      type: 'pipeline',
      components: ['Data Pipeline', 'Training Pipeline', 'Serving API', 'Monitoring', 'Model Registry']
    },
    setupTime: '20 minutes',
    popularityScore: 72
  }
};

export const getTemplatesByCategory = (category: string) => {
  return Object.values(PROJECT_TEMPLATES).filter(t => t.category === category);
};

export const getTemplatesByDifficulty = (difficulty: string) => {
  return Object.values(PROJECT_TEMPLATES).filter(t => t.difficulty === difficulty);
};

export const getMostPopularTemplates = (limit = 5) => {
  return Object.values(PROJECT_TEMPLATES)
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, limit);
};
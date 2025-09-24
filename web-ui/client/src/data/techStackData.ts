export interface TechItem {
  name: string;
  category: string;
  description: string;
  popularity: number;
  compatibleWith: string[];
  incompatibleWith: string[];
  requiredBy?: string[];
  alternatives?: string[];
}

export interface TechStackPreset {
  name: string;
  description: string;
  icon: string;
  stack: string[];
  useCase: string;
  popularity: number;
}

export const TECH_CATEGORIES = {
  frontend: {
    label: 'Frontend Frameworks',
    icon: '🎨',
    items: [
      'React', 'Vue.js', 'Angular', 'Svelte', 'Solid.js', 'Next.js', 'Nuxt.js', 
      'Gatsby', 'Remix', 'Astro', 'Alpine.js', 'Preact', 'Lit', 'Qwik'
    ]
  },
  backend: {
    label: 'Backend Frameworks',
    icon: '⚙️',
    items: [
      'Express', 'Fastify', 'NestJS', 'Koa', 'Hapi', 'Django', 'Flask', 'FastAPI',
      'Rails', 'Laravel', 'Spring Boot', 'ASP.NET Core', 'Gin', 'Echo', 'Fiber'
    ]
  },
  database: {
    label: 'Databases',
    icon: '🗄️',
    items: [
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'MariaDB', 'Oracle',
      'Cassandra', 'DynamoDB', 'Firestore', 'Supabase', 'PlanetScale', 'CockroachDB'
    ]
  },
  language: {
    label: 'Programming Languages',
    icon: '💻',
    items: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'Ruby',
      'PHP', 'Swift', 'Kotlin', 'Dart', 'Elixir', 'Scala', 'C++'
    ]
  },
  styling: {
    label: 'Styling & UI',
    icon: '🎨',
    items: [
      'TailwindCSS', 'Bootstrap', 'Material-UI', 'Chakra UI', 'Ant Design', 'Bulma',
      'Sass', 'CSS Modules', 'Styled Components', 'Emotion', 'Stitches', 'UnoCSS'
    ]
  },
  testing: {
    label: 'Testing Frameworks',
    icon: '🧪',
    items: [
      'Jest', 'Vitest', 'Mocha', 'Cypress', 'Playwright', 'Puppeteer', 'Testing Library',
      'Pytest', 'JUnit', 'NUnit', 'RSpec', 'PHPUnit', 'Selenium', 'Enzyme'
    ]
  },
  devops: {
    label: 'DevOps & Tools',
    icon: '🚀',
    items: [
      'Docker', 'Kubernetes', 'GitHub Actions', 'Jenkins', 'CircleCI', 'GitLab CI',
      'Terraform', 'Ansible', 'AWS', 'Azure', 'Google Cloud', 'Vercel', 'Netlify'
    ]
  },
  state: {
    label: 'State Management',
    icon: '📦',
    items: [
      'Redux', 'MobX', 'Zustand', 'Pinia', 'Vuex', 'Recoil', 'Jotai', 'Valtio',
      'XState', 'Effector', 'Redux Toolkit', 'Context API', 'Signals'
    ]
  },
  build: {
    label: 'Build Tools',
    icon: '🛠️',
    items: [
      'Vite', 'Webpack', 'Rollup', 'Parcel', 'esbuild', 'SWC', 'Turbopack',
      'Gulp', 'Grunt', 'Snowpack', 'Rome', 'Bun', 'tsup'
    ]
  },
  mobile: {
    label: 'Mobile Development',
    icon: '📱',
    items: [
      'React Native', 'Flutter', 'Ionic', 'NativeScript', 'Expo', 'Capacitor',
      'Swift', 'Kotlin', 'Xamarin', 'Unity', 'Cordova'
    ]
  },
  realtime: {
    label: 'Real-time & Messaging',
    icon: '⚡',
    items: [
      'Socket.io', 'WebSockets', 'GraphQL Subscriptions', 'Server-Sent Events',
      'Pusher', 'Ably', 'RabbitMQ', 'Kafka', 'Redis Pub/Sub', 'MQTT'
    ]
  },
  auth: {
    label: 'Authentication',
    icon: '🔐',
    items: [
      'JWT', 'OAuth', 'Auth0', 'Firebase Auth', 'Supabase Auth', 'NextAuth',
      'Passport.js', 'Clerk', 'Magic', 'Okta', 'AWS Cognito'
    ]
  }
};

export const TECH_STACK_PRESETS: Record<string, TechStackPreset> = {
  'mern': {
    name: 'MERN Stack',
    description: 'MongoDB, Express, React, Node.js - Popular full-stack JavaScript solution',
    icon: '🟢',
    stack: ['MongoDB', 'Express', 'React', 'Node.js', 'Mongoose', 'JWT', 'Axios'],
    useCase: 'Full-stack web applications with NoSQL database',
    popularity: 95
  },
  'mean': {
    name: 'MEAN Stack',
    description: 'MongoDB, Express, Angular, Node.js - Enterprise JavaScript stack',
    icon: '🔴',
    stack: ['MongoDB', 'Express', 'Angular', 'Node.js', 'TypeScript', 'RxJS'],
    useCase: 'Enterprise applications with Angular',
    popularity: 80
  },
  'pern': {
    name: 'PERN Stack',
    description: 'PostgreSQL, Express, React, Node.js - SQL-based full-stack',
    icon: '🔵',
    stack: ['PostgreSQL', 'Express', 'React', 'Node.js', 'Sequelize', 'JWT'],
    useCase: 'Applications requiring relational database',
    popularity: 85
  },
  't3': {
    name: 'T3 Stack',
    description: 'Next.js, TypeScript, Tailwind, tRPC, Prisma - Modern type-safe stack',
    icon: '▲',
    stack: ['Next.js', 'TypeScript', 'TailwindCSS', 'tRPC', 'Prisma', 'PostgreSQL'],
    useCase: 'Type-safe full-stack applications',
    popularity: 90
  },
  'jamstack': {
    name: 'JAMstack',
    description: 'JavaScript, APIs, Markup - Static site generation with dynamic features',
    icon: '⚡',
    stack: ['Gatsby', 'React', 'GraphQL', 'Netlify CMS', 'Contentful', 'Netlify'],
    useCase: 'High-performance static websites',
    popularity: 82
  },
  'lamp': {
    name: 'LAMP Stack',
    description: 'Linux, Apache, MySQL, PHP - Classic web development stack',
    icon: '🔥',
    stack: ['Linux', 'Apache', 'MySQL', 'PHP', 'phpMyAdmin', 'Composer'],
    useCase: 'Traditional web applications and CMSs',
    popularity: 70
  },
  'django-vue': {
    name: 'Django + Vue',
    description: 'Django REST Framework with Vue.js frontend',
    icon: '🎸',
    stack: ['Django', 'Django REST Framework', 'Vue.js', 'PostgreSQL', 'Vuex', 'Axios'],
    useCase: 'Python backend with reactive frontend',
    popularity: 75
  },
  'rails-react': {
    name: 'Rails + React',
    description: 'Ruby on Rails API with React frontend',
    icon: '💎',
    stack: ['Ruby on Rails', 'React', 'PostgreSQL', 'Redis', 'Sidekiq', 'Action Cable'],
    useCase: 'Rapid development with Rails conventions',
    popularity: 72
  },
  'serverless': {
    name: 'Serverless Stack',
    description: 'AWS Lambda, API Gateway, DynamoDB - Serverless architecture',
    icon: '☁️',
    stack: ['AWS Lambda', 'API Gateway', 'DynamoDB', 'S3', 'CloudFront', 'Cognito'],
    useCase: 'Scalable serverless applications',
    popularity: 78
  },
  'flutter-firebase': {
    name: 'Flutter + Firebase',
    description: 'Cross-platform mobile with Firebase backend',
    icon: '🔷',
    stack: ['Flutter', 'Dart', 'Firebase', 'Firestore', 'Cloud Functions', 'FCM'],
    useCase: 'Rapid mobile app development',
    popularity: 83
  }
};

export const TECH_COMPATIBILITY: Record<string, TechItem> = {
  'React': {
    name: 'React',
    category: 'frontend',
    description: 'A JavaScript library for building user interfaces',
    popularity: 95,
    compatibleWith: ['TypeScript', 'JavaScript', 'Redux', 'MobX', 'Zustand', 'Next.js', 'Vite', 'Webpack'],
    incompatibleWith: ['Angular', 'Vue.js'],
    requiredBy: ['Next.js', 'Gatsby', 'React Native'],
    alternatives: ['Vue.js', 'Angular', 'Svelte']
  },
  'TypeScript': {
    name: 'TypeScript',
    category: 'language',
    description: 'Typed superset of JavaScript',
    popularity: 92,
    compatibleWith: ['React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'NestJS'],
    incompatibleWith: [],
    alternatives: ['JavaScript', 'Flow']
  },
  'PostgreSQL': {
    name: 'PostgreSQL',
    category: 'database',
    description: 'Advanced open-source relational database',
    popularity: 88,
    compatibleWith: ['Prisma', 'TypeORM', 'Sequelize', 'Django', 'Rails', 'Express'],
    incompatibleWith: [],
    alternatives: ['MySQL', 'MariaDB', 'SQLite']
  },
  'MongoDB': {
    name: 'MongoDB',
    category: 'database',
    description: 'Document-oriented NoSQL database',
    popularity: 85,
    compatibleWith: ['Mongoose', 'Express', 'Node.js', 'Prisma'],
    incompatibleWith: [],
    alternatives: ['PostgreSQL', 'DynamoDB', 'Firestore']
  },
  'Express': {
    name: 'Express',
    category: 'backend',
    description: 'Fast, unopinionated web framework for Node.js',
    popularity: 90,
    compatibleWith: ['Node.js', 'TypeScript', 'MongoDB', 'PostgreSQL', 'JWT'],
    incompatibleWith: [],
    requiredBy: [],
    alternatives: ['Fastify', 'Koa', 'NestJS']
  },
  'Next.js': {
    name: 'Next.js',
    category: 'frontend',
    description: 'React framework with SSR/SSG capabilities',
    popularity: 91,
    compatibleWith: ['React', 'TypeScript', 'TailwindCSS', 'Prisma', 'tRPC'],
    incompatibleWith: ['Create React App'],
    alternatives: ['Gatsby', 'Remix', 'Nuxt.js']
  },
  'TailwindCSS': {
    name: 'TailwindCSS',
    category: 'styling',
    description: 'Utility-first CSS framework',
    popularity: 89,
    compatibleWith: ['React', 'Vue.js', 'Angular', 'Next.js', 'Vite'],
    incompatibleWith: [],
    alternatives: ['Bootstrap', 'Material-UI', 'Chakra UI']
  },
  'Jest': {
    name: 'Jest',
    category: 'testing',
    description: 'JavaScript testing framework',
    popularity: 88,
    compatibleWith: ['React', 'Vue.js', 'Node.js', 'TypeScript'],
    incompatibleWith: [],
    alternatives: ['Vitest', 'Mocha', 'Jasmine']
  },
  'Docker': {
    name: 'Docker',
    category: 'devops',
    description: 'Container platform for application deployment',
    popularity: 93,
    compatibleWith: ['Kubernetes', 'Docker Compose', 'Any backend', 'Any database'],
    incompatibleWith: [],
    alternatives: ['Podman', 'Vagrant']
  }
};

export const checkCompatibility = (stack: string[]): {
  compatible: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let compatible = true;

  // Check for incompatible technologies
  stack.forEach(tech => {
    const techData = TECH_COMPATIBILITY[tech];
    if (techData) {
      techData.incompatibleWith.forEach(incompatible => {
        if (stack.includes(incompatible)) {
          warnings.push(`${tech} is incompatible with ${incompatible}`);
          compatible = false;
        }
      });
      
      // Check for required dependencies
      techData.requiredBy?.forEach(required => {
        if (stack.includes(required) && !stack.includes(tech)) {
          suggestions.push(`${required} requires ${tech}`);
        }
      });
    }
  });

  // Suggest commonly paired technologies
  if (stack.includes('React') && !stack.includes('Redux') && !stack.includes('Zustand')) {
    suggestions.push('Consider adding a state management library (Redux, Zustand, or MobX)');
  }
  
  if (stack.includes('Node.js') && !stack.includes('Express') && !stack.includes('Fastify')) {
    suggestions.push('Consider adding a web framework (Express, Fastify, or NestJS)');
  }
  
  if ((stack.includes('PostgreSQL') || stack.includes('MySQL')) && !stack.includes('Prisma') && !stack.includes('TypeORM')) {
    suggestions.push('Consider adding an ORM (Prisma, TypeORM, or Sequelize)');
  }

  return { compatible, warnings, suggestions };
};

export const getSuggestedTechnologies = (
  projectType: string,
  existingStack: string[]
): string[] => {
  const suggestions: string[] = [];
  
  // Type-specific suggestions
  if (projectType === 'web' && !existingStack.some(t => ['React', 'Vue.js', 'Angular'].includes(t))) {
    suggestions.push('React', 'Vue.js', 'Angular');
  }
  
  if (projectType === 'api' && !existingStack.some(t => ['Express', 'FastAPI', 'Django'].includes(t))) {
    suggestions.push('Express', 'FastAPI', 'Django REST Framework');
  }
  
  if (projectType === 'mobile' && !existingStack.some(t => ['React Native', 'Flutter'].includes(t))) {
    suggestions.push('React Native', 'Flutter');
  }
  
  // Always suggest TypeScript if JavaScript is selected
  if (existingStack.includes('JavaScript') && !existingStack.includes('TypeScript')) {
    suggestions.push('TypeScript');
  }
  
  // Suggest testing framework if none selected
  if (!existingStack.some(t => TECH_CATEGORIES.testing.items.includes(t))) {
    if (existingStack.includes('React')) suggestions.push('Jest', 'React Testing Library');
    if (existingStack.includes('Python')) suggestions.push('Pytest');
    if (existingStack.includes('Node.js')) suggestions.push('Jest', 'Mocha');
  }
  
  return suggestions;
};
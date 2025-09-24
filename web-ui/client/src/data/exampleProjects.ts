export interface ExampleProject {
  id: string;
  name: string;
  description: string;
  category: string;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  thumbnail: string;
  features: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningPoints: string[];
  structure: {
    folders: string[];
    keyFiles: string[];
  };
}

export const EXAMPLE_PROJECTS: ExampleProject[] = [
  {
    id: 'task-manager',
    name: 'TaskFlow - Task Management App',
    description: 'A comprehensive task management application with real-time collaboration',
    category: 'web',
    techStack: ['React', 'TypeScript', 'Express', 'PostgreSQL', 'Socket.io', 'Prisma', 'TailwindCSS'],
    githubUrl: 'https://github.com/examples/taskflow',
    demoUrl: 'https://taskflow-demo.example.com',
    thumbnail: '📋',
    features: [
      'User authentication and authorization',
      'Real-time task updates',
      'Drag-and-drop task boards',
      'Team collaboration',
      'File attachments',
      'Activity tracking',
      'Email notifications'
    ],
    difficulty: 'intermediate',
    learningPoints: [
      'Implementing real-time features with WebSockets',
      'Building a RESTful API with Express',
      'State management in React',
      'Database design with PostgreSQL',
      'Authentication with JWT'
    ],
    structure: {
      folders: [
        'client/src/components',
        'client/src/hooks',
        'server/src/controllers',
        'server/src/models',
        'server/src/middleware'
      ],
      keyFiles: [
        'server/src/server.ts',
        'client/src/App.tsx',
        'prisma/schema.prisma'
      ]
    }
  },
  {
    id: 'ecommerce-platform',
    name: 'ShopHub - E-commerce Platform',
    description: 'Full-featured e-commerce platform with admin dashboard',
    category: 'web',
    techStack: ['Next.js', 'TypeScript', 'Stripe', 'PostgreSQL', 'Prisma', 'TailwindCSS', 'Redis'],
    githubUrl: 'https://github.com/examples/shophub',
    demoUrl: 'https://shophub-demo.example.com',
    thumbnail: '🛒',
    features: [
      'Product catalog with search and filters',
      'Shopping cart and checkout',
      'Payment processing with Stripe',
      'Order management',
      'Admin dashboard',
      'Inventory tracking',
      'Customer reviews'
    ],
    difficulty: 'advanced',
    learningPoints: [
      'Building e-commerce with Next.js',
      'Integrating payment gateways',
      'Server-side rendering for SEO',
      'Caching strategies with Redis',
      'Complex state management'
    ],
    structure: {
      folders: [
        'app/(shop)',
        'app/admin',
        'components',
        'lib/api',
        'lib/stripe'
      ],
      keyFiles: [
        'app/layout.tsx',
        'app/api/checkout/route.ts',
        'lib/stripe/client.ts'
      ]
    }
  },
  {
    id: 'social-media-api',
    name: 'ConnectAPI - Social Media Backend',
    description: 'Scalable social media API with GraphQL',
    category: 'api',
    techStack: ['Node.js', 'GraphQL', 'Apollo Server', 'MongoDB', 'Redis', 'Bull', 'Jest'],
    githubUrl: 'https://github.com/examples/connectapi',
    thumbnail: '🌐',
    features: [
      'User profiles and relationships',
      'Post creation and feeds',
      'Real-time notifications',
      'Media upload handling',
      'GraphQL subscriptions',
      'Rate limiting',
      'Background job processing'
    ],
    difficulty: 'advanced',
    learningPoints: [
      'Designing GraphQL schemas',
      'Implementing DataLoader for optimization',
      'Building scalable APIs',
      'Handling file uploads',
      'Queue-based job processing'
    ],
    structure: {
      folders: [
        'src/resolvers',
        'src/models',
        'src/dataloaders',
        'src/services',
        'src/queues'
      ],
      keyFiles: [
        'src/schema.graphql',
        'src/server.ts',
        'src/resolvers/index.ts'
      ]
    }
  },
  {
    id: 'weather-app',
    name: 'WeatherNow - Weather Forecast App',
    description: 'Beautiful weather app with location-based forecasts',
    category: 'web',
    techStack: ['React', 'TypeScript', 'Vite', 'OpenWeather API', 'Chart.js', 'PWA'],
    githubUrl: 'https://github.com/examples/weathernow',
    demoUrl: 'https://weathernow-demo.example.com',
    thumbnail: '☀️',
    features: [
      'Current weather display',
      '7-day forecast',
      'Interactive weather maps',
      'Location search',
      'Weather alerts',
      'Offline support (PWA)',
      'Data visualization'
    ],
    difficulty: 'beginner',
    learningPoints: [
      'Working with external APIs',
      'Building Progressive Web Apps',
      'Data visualization with Chart.js',
      'Responsive design',
      'Service workers for offline support'
    ],
    structure: {
      folders: [
        'src/components',
        'src/services',
        'src/hooks',
        'src/utils',
        'public'
      ],
      keyFiles: [
        'src/App.tsx',
        'src/services/weather.ts',
        'src/sw.ts'
      ]
    }
  },
  {
    id: 'blog-platform',
    name: 'BlogPress - Blogging Platform',
    description: 'Modern blogging platform with markdown support',
    category: 'web',
    techStack: ['Django', 'Python', 'PostgreSQL', 'Django REST Framework', 'React', 'MDX'],
    githubUrl: 'https://github.com/examples/blogpress',
    thumbnail: '📝',
    features: [
      'Markdown editor with preview',
      'Category and tag system',
      'Comment system',
      'Author profiles',
      'RSS feed',
      'SEO optimization',
      'Admin panel'
    ],
    difficulty: 'intermediate',
    learningPoints: [
      'Building with Django',
      'Creating REST APIs with DRF',
      'Markdown processing',
      'SEO best practices',
      'Content management systems'
    ],
    structure: {
      folders: [
        'blog/models',
        'blog/views',
        'blog/serializers',
        'frontend/src',
        'templates'
      ],
      keyFiles: [
        'blog/models.py',
        'blog/urls.py',
        'frontend/src/Editor.tsx'
      ]
    }
  },
  {
    id: 'chat-application',
    name: 'ChatSpace - Real-time Chat',
    description: 'Real-time chat application with rooms and direct messaging',
    category: 'web',
    techStack: ['Vue.js', 'Node.js', 'Socket.io', 'MongoDB', 'Vuetify', 'JWT'],
    githubUrl: 'https://github.com/examples/chatspace',
    demoUrl: 'https://chatspace-demo.example.com',
    thumbnail: '💬',
    features: [
      'Real-time messaging',
      'Chat rooms',
      'Direct messages',
      'File sharing',
      'Emoji support',
      'Message history',
      'Online status'
    ],
    difficulty: 'intermediate',
    learningPoints: [
      'WebSocket communication',
      'Real-time state synchronization',
      'Vue.js composition API',
      'NoSQL data modeling',
      'File upload handling'
    ],
    structure: {
      folders: [
        'client/src/components',
        'client/src/stores',
        'server/src/socket',
        'server/src/models',
        'server/src/middleware'
      ],
      keyFiles: [
        'server/src/socket/index.js',
        'client/src/App.vue',
        'client/src/stores/chat.js'
      ]
    }
  },
  {
    id: 'fitness-tracker',
    name: 'FitTrack - Fitness Tracking App',
    description: 'Mobile-first fitness tracking application',
    category: 'mobile',
    techStack: ['React Native', 'TypeScript', 'Firebase', 'Redux Toolkit', 'React Navigation'],
    githubUrl: 'https://github.com/examples/fittrack',
    thumbnail: '💪',
    features: [
      'Workout logging',
      'Progress tracking',
      'Exercise database',
      'Goal setting',
      'Statistics dashboard',
      'Social features',
      'Push notifications'
    ],
    difficulty: 'intermediate',
    learningPoints: [
      'React Native development',
      'Mobile app architecture',
      'Firebase integration',
      'State management with Redux',
      'Push notifications'
    ],
    structure: {
      folders: [
        'src/screens',
        'src/components',
        'src/navigation',
        'src/store',
        'src/services'
      ],
      keyFiles: [
        'App.tsx',
        'src/navigation/AppNavigator.tsx',
        'src/store/index.ts'
      ]
    }
  },
  {
    id: 'analytics-dashboard',
    name: 'DataViz - Analytics Dashboard',
    description: 'Interactive data visualization dashboard',
    category: 'web',
    techStack: ['React', 'D3.js', 'Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
    githubUrl: 'https://github.com/examples/dataviz',
    thumbnail: '📊',
    features: [
      'Interactive charts',
      'Real-time data updates',
      'Custom dashboards',
      'Data export',
      'User permissions',
      'API rate limiting',
      'Caching layer'
    ],
    difficulty: 'advanced',
    learningPoints: [
      'Data visualization with D3.js',
      'Building dashboards',
      'FastAPI for high-performance APIs',
      'Caching strategies',
      'Docker containerization'
    ],
    structure: {
      folders: [
        'frontend/src/charts',
        'frontend/src/dashboards',
        'backend/app/api',
        'backend/app/models',
        'backend/app/services'
      ],
      keyFiles: [
        'backend/app/main.py',
        'frontend/src/charts/LineChart.tsx',
        'docker-compose.yml'
      ]
    }
  },
  {
    id: 'recipe-sharing',
    name: 'CookBook - Recipe Sharing Platform',
    description: 'Community platform for sharing and discovering recipes',
    category: 'web',
    techStack: ['Nuxt.js', 'Vue.js', 'Strapi', 'PostgreSQL', 'Cloudinary', 'Algolia'],
    githubUrl: 'https://github.com/examples/cookbook',
    demoUrl: 'https://cookbook-demo.example.com',
    thumbnail: '🍳',
    features: [
      'Recipe creation and editing',
      'Image upload and optimization',
      'Search with filters',
      'User collections',
      'Rating system',
      'Meal planning',
      'Shopping lists'
    ],
    difficulty: 'intermediate',
    learningPoints: [
      'Building with Nuxt.js',
      'Headless CMS integration',
      'Image optimization',
      'Search implementation',
      'Server-side rendering'
    ],
    structure: {
      folders: [
        'pages',
        'components',
        'composables',
        'server/api',
        'plugins'
      ],
      keyFiles: [
        'nuxt.config.ts',
        'pages/recipes/[id].vue',
        'composables/useRecipes.ts'
      ]
    }
  },
  {
    id: 'video-streaming',
    name: 'StreamHub - Video Streaming Platform',
    description: 'Video streaming platform with live broadcasting',
    category: 'web',
    techStack: ['Next.js', 'WebRTC', 'HLS.js', 'Node.js', 'FFmpeg', 'AWS S3', 'PostgreSQL'],
    githubUrl: 'https://github.com/examples/streamhub',
    thumbnail: '🎥',
    features: [
      'Video upload and processing',
      'Live streaming',
      'Adaptive bitrate streaming',
      'Comments and reactions',
      'Channel subscriptions',
      'Video analytics',
      'Monetization features'
    ],
    difficulty: 'advanced',
    learningPoints: [
      'Video streaming technologies',
      'WebRTC implementation',
      'Media processing with FFmpeg',
      'CDN integration',
      'Scalable architecture'
    ],
    structure: {
      folders: [
        'app/(platform)',
        'app/studio',
        'lib/streaming',
        'lib/media',
        'workers'
      ],
      keyFiles: [
        'lib/streaming/webrtc.ts',
        'workers/video-processor.js',
        'app/api/upload/route.ts'
      ]
    }
  },
  {
    id: 'dev-portfolio',
    name: 'DevFolio - Developer Portfolio',
    description: 'Modern developer portfolio with blog and project showcase',
    category: 'web',
    techStack: ['Astro', 'React', 'MDX', 'TailwindCSS', 'TypeScript'],
    githubUrl: 'https://github.com/examples/devfolio',
    demoUrl: 'https://devfolio-demo.example.com',
    thumbnail: '👨‍💻',
    features: [
      'Project showcase',
      'Blog with MDX',
      'Dark mode',
      'Contact form',
      'Resume download',
      'GitHub integration',
      'Analytics'
    ],
    difficulty: 'beginner',
    learningPoints: [
      'Static site generation',
      'MDX for content',
      'SEO optimization',
      'Performance optimization',
      'Responsive design'
    ],
    structure: {
      folders: [
        'src/pages',
        'src/components',
        'src/layouts',
        'src/content',
        'public'
      ],
      keyFiles: [
        'astro.config.mjs',
        'src/pages/index.astro',
        'src/content/config.ts'
      ]
    }
  },
  {
    id: 'automation-cli',
    name: 'AutoMate - Automation CLI Tool',
    description: 'CLI tool for automating development workflows',
    category: 'cli',
    techStack: ['Node.js', 'TypeScript', 'Commander.js', 'Inquirer', 'Chalk', 'Jest'],
    githubUrl: 'https://github.com/examples/automate',
    thumbnail: '⚙️',
    features: [
      'Project scaffolding',
      'Git workflow automation',
      'Database migrations',
      'Deployment scripts',
      'Config management',
      'Plugin system',
      'Interactive prompts'
    ],
    difficulty: 'intermediate',
    learningPoints: [
      'Building CLI applications',
      'File system operations',
      'Process management',
      'Plugin architecture',
      'Testing CLI tools'
    ],
    structure: {
      folders: [
        'src/commands',
        'src/utils',
        'src/plugins',
        'templates',
        'tests'
      ],
      keyFiles: [
        'src/index.ts',
        'src/commands/init.ts',
        'src/utils/config.ts'
      ]
    }
  }
];

export const getProjectsByCategory = (category: string): ExampleProject[] => {
  return EXAMPLE_PROJECTS.filter(p => p.category === category);
};

export const getProjectsByDifficulty = (difficulty: string): ExampleProject[] => {
  return EXAMPLE_PROJECTS.filter(p => p.difficulty === difficulty);
};

export const getProjectsByTech = (tech: string): ExampleProject[] => {
  return EXAMPLE_PROJECTS.filter(p => 
    p.techStack.some(t => t.toLowerCase().includes(tech.toLowerCase()))
  );
};

export const getSimilarProjects = (techStack: string[]): ExampleProject[] => {
  return EXAMPLE_PROJECTS
    .map(project => ({
      project,
      score: project.techStack.filter(tech => techStack.includes(tech)).length
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.project);
};
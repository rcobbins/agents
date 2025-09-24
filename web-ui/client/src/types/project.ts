export interface ProjectGoal {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'security' | 'scalability' | 'cost' | 'timeline' | 'custom';
  metrics?: string[];
}

export interface TestingStrategy {
  unitTestCoverage: number;
  integrationTesting: boolean;
  e2eTesting: boolean;
  performanceTesting: boolean;
  securityTesting: boolean;
  accessibilityTesting: boolean;
  cicd: boolean;
  frameworks: string[];
  automationLevel: 'manual' | 'semi-auto' | 'full-auto';
}

export interface Architecture {
  pattern: 'monolithic' | 'microservices' | 'serverless' | 'modular' | 'layered';
  database: 'sql' | 'nosql' | 'hybrid' | 'none';
  deployment: 'cloud' | 'on-premise' | 'hybrid' | 'edge';
  scaling: 'vertical' | 'horizontal' | 'auto';
  apiStyle: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'mixed';
  features: string[];
}

export interface ProjectConfig {
  name: string;
  type: string;
  description: string;
  path: string;
  techStack: string[];
  goals?: ProjectGoal[];
  testingStrategy: TestingStrategy;
  architecture: Architecture;
  teamSize?: number;
  timeframe?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
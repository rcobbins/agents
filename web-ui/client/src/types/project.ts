export interface ProjectGoal {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'security' | 'scalability' | 'cost' | 'timeline' | 'custom';
  status?: 'pending' | 'in-progress' | 'completed';
  acceptanceCriteria?: string[];
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

export interface ProjectVision {
  productType?: string;
  productName?: string;
  tagline?: string;
  problemStatement?: string;
  targetAudience?: string;
  coreFeatures?: string[];
  uniqueValue?: string;
  successMetrics?: string[];
  constraints?: string[];
}

export interface Requirement {
  id: string;
  type: 'functional' | 'non-functional' | 'business' | 'technical';
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  description: string;
  acceptanceCriteria: string[];
  rationale: string;
}

export interface ProjectRequirements {
  problemStatement?: string;
  targetUsers?: string[];
  businessValue?: string;
  successCriteria?: string[];
  requirements?: Requirement[];
  constraints?: string[];
  assumptions?: string[];
  outOfScope?: string[];
}

export interface ProjectConfig {
  name: string;
  type: string;
  description: string;
  path: string;
  techStack: string[];
  goals?: ProjectGoal[];
  vision?: ProjectVision;
  requirements?: ProjectRequirements;
  testingStrategy: TestingStrategy;
  architecture: Architecture;
  teamSize?: number;
  timeframe?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
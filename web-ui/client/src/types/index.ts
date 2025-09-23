export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  agents: string[];
  goals: Goal[];
  created: string;
  updated: string;
  config?: ProjectConfig;
}

export interface Goal {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  metrics?: Record<string, any>;
  updated?: string;
}

export interface Agent {
  id: string;
  projectId: string;
  status: 'running' | 'stopped' | 'error' | 'stopping';
  startTime?: string;
  endTime?: string;
  uptime?: number;
  pid?: number;
  logs?: LogEntry[];
  errors?: ErrorEntry[];
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface ErrorEntry {
  timestamp: string;
  error: string;
}

export interface Message {
  id: string;
  projectId: string;
  from: string;
  to: string;
  type: string;
  content: any;
  timestamp: string;
  status: 'pending' | 'delivered' | 'consumed';
}

export interface ProjectConfig {
  debug?: boolean;
  autoRestart?: boolean;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ProjectValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SystemStatus {
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  nodeVersion: string;
  processUptime: number;
}

export interface ProjectInitData {
  name: string;
  description: string;
  path: string;
  techStack: string[];
  structure: {
    directories: string[];
    entryPoint: string;
  };
  goals: Goal[];
  testing: {
    framework: string;
    coverage: number;
  };
  architecture: {
    type: string;
    components: string[];
  };
}
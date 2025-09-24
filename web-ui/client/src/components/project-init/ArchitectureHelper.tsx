import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  AccountTree,
  Layers,
  Storage,
  Cloud,
  Hub,
  Api,
  ViewModule,
  Architecture,
  Info,
  CheckCircle,
  Warning,
  Help,
  ContentCopy,
} from '@mui/icons-material';

interface ArchitectureConfig {
  pattern: 'monolithic' | 'microservices' | 'serverless' | 'modular' | 'layered';
  database: 'sql' | 'nosql' | 'hybrid' | 'none';
  deployment: 'cloud' | 'on-premise' | 'hybrid' | 'edge';
  scaling: 'vertical' | 'horizontal' | 'auto';
  apiStyle: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'mixed';
  features: string[];
}

interface ArchitectureHelperProps {
  config: ArchitectureConfig;
  onChange: (config: ArchitectureConfig) => void;
  projectType?: string;
  techStack?: string[];
}

const ARCHITECTURE_PATTERNS = {
  monolithic: {
    name: 'Monolithic',
    icon: <ViewModule />,
    description: 'Single deployable unit, simple to develop and deploy',
    pros: ['Simple deployment', 'Easy debugging', 'Low complexity', 'Fast development'],
    cons: ['Scaling limitations', 'Technology lock-in', 'Large codebase'],
    bestFor: ['Small teams', 'MVPs', 'Simple applications'],
  },
  microservices: {
    name: 'Microservices',
    icon: <Hub />,
    description: 'Distributed services that communicate via APIs',
    pros: ['Independent scaling', 'Technology flexibility', 'Fault isolation', 'Team autonomy'],
    cons: ['Complex deployment', 'Network overhead', 'Data consistency challenges'],
    bestFor: ['Large teams', 'Complex domains', 'High-scale applications'],
  },
  serverless: {
    name: 'Serverless',
    icon: <Cloud />,
    description: 'Event-driven functions without server management',
    pros: ['No server management', 'Auto-scaling', 'Pay per use', 'Quick deployment'],
    cons: ['Vendor lock-in', 'Cold starts', 'Limited execution time'],
    bestFor: ['Event-driven apps', 'Variable loads', 'Cost optimization'],
  },
  modular: {
    name: 'Modular Monolith',
    icon: <Layers />,
    description: 'Single deployment with clear module boundaries',
    pros: ['Module isolation', 'Simple deployment', 'Easy refactoring', 'Clear boundaries'],
    cons: ['Shared resources', 'Single point of failure', 'Module coupling risk'],
    bestFor: ['Medium teams', 'Growing applications', 'Future microservices'],
  },
  layered: {
    name: 'Layered (N-Tier)',
    icon: <AccountTree />,
    description: 'Organized in horizontal layers (presentation, business, data)',
    pros: ['Clear separation', 'Reusable components', 'Easy testing', 'Well-understood'],
    cons: ['Performance overhead', 'Rigid structure', 'Cross-cutting concerns'],
    bestFor: ['Enterprise apps', 'Traditional web apps', 'Clear requirements'],
  },
};

const DATABASE_OPTIONS = {
  sql: {
    name: 'SQL (Relational)',
    icon: <Storage />,
    examples: ['PostgreSQL', 'MySQL', 'SQL Server'],
    bestFor: 'Structured data with relationships',
  },
  nosql: {
    name: 'NoSQL',
    icon: <Storage />,
    examples: ['MongoDB', 'DynamoDB', 'Redis'],
    bestFor: 'Flexible schemas, high-volume data',
  },
  hybrid: {
    name: 'Hybrid',
    icon: <Storage />,
    examples: ['PostgreSQL + Redis', 'MySQL + MongoDB'],
    bestFor: 'Mixed data requirements',
  },
  none: {
    name: 'No Database',
    icon: <Storage />,
    examples: ['Static sites', 'Stateless APIs'],
    bestFor: 'Simple applications without persistence',
  },
};

const ARCHITECTURE_FEATURES = [
  'Caching Layer',
  'Message Queue',
  'Load Balancer',
  'API Gateway',
  'Service Mesh',
  'CDN',
  'Event Bus',
  'Search Engine',
  'File Storage',
  'Authentication Service',
  'Monitoring & Logging',
  'Rate Limiting',
];

const ArchitectureHelper: React.FC<ArchitectureHelperProps> = ({
  config,
  onChange,
  projectType,
  techStack = [],
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const getRecommendedArchitecture = () => {
    if (projectType === 'api' && techStack.includes('Node.js')) {
      return 'microservices';
    }
    if (projectType === 'web' && techStack.includes('React')) {
      return 'modular';
    }
    if (projectType === 'cli' || projectType === 'library') {
      return 'monolithic';
    }
    if (techStack.includes('AWS Lambda') || techStack.includes('Vercel')) {
      return 'serverless';
    }
    return 'layered';
  };

  const getArchitectureScore = () => {
    let score = 0;
    let warnings: string[] = [];

    // Check for pattern-database alignment
    if (config.pattern === 'microservices' && config.database === 'sql') {
      warnings.push('Consider NoSQL for microservices to avoid distributed transactions');
    }
    if (config.pattern === 'serverless' && config.deployment === 'on-premise') {
      warnings.push('Serverless typically requires cloud deployment');
    }
    if (config.pattern === 'monolithic' && config.scaling === 'horizontal') {
      warnings.push('Monolithic apps are harder to scale horizontally');
    }

    // Calculate score
    if (config.pattern) score += 25;
    if (config.database !== 'none' || projectType === 'cli') score += 25;
    if (config.deployment) score += 25;
    if (config.features.length >= 3) score += 25;

    return { score, warnings };
  };

  const handlePatternSelect = (pattern: ArchitectureConfig['pattern']) => {
    onChange({ ...config, pattern });
    
    // Auto-adjust related settings
    if (pattern === 'serverless') {
      onChange({
        ...config,
        pattern,
        deployment: 'cloud',
        scaling: 'auto',
      });
    } else if (pattern === 'microservices') {
      onChange({
        ...config,
        pattern,
        scaling: 'horizontal',
        apiStyle: 'rest',
      });
    }
  };

  const generateFolderStructure = () => {
    const structures: Record<string, string[]> = {
      monolithic: [
        'src/',
        '  ├── controllers/',
        '  ├── models/',
        '  ├── services/',
        '  ├── utils/',
        '  └── index.ts',
      ],
      microservices: [
        'services/',
        '  ├── auth/',
        '  ├── users/',
        '  ├── products/',
        '  └── gateway/',
        'shared/',
        '  └── types/',
      ],
      serverless: [
        'functions/',
        '  ├── api/',
        '  ├── events/',
        '  └── scheduled/',
        'shared/',
        '  └── utils/',
      ],
      modular: [
        'src/',
        '  ├── modules/',
        '  │   ├── auth/',
        '  │   ├── users/',
        '  │   └── products/',
        '  ├── shared/',
        '  └── index.ts',
      ],
      layered: [
        'src/',
        '  ├── presentation/',
        '  ├── application/',
        '  ├── domain/',
        '  ├── infrastructure/',
        '  └── index.ts',
      ],
    };

    return structures[config.pattern] || [];
  };

  const architectureScore = getArchitectureScore();
  const recommended = getRecommendedArchitecture();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Design Your Architecture
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose the architectural pattern that best fits your project's needs and constraints.
        </Typography>
      </Box>

      {/* Architecture Score */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Architecture Completeness
            </Typography>
            <Typography variant="body2" color="text.secondary">
              How well-defined is your architecture?
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <Typography variant="h3" color="primary">
                {architectureScore.score}%
              </Typography>
            </Box>
            {architectureScore.warnings.length > 0 && (
              <Tooltip title={architectureScore.warnings.join('\n')}>
                <Warning color="warning" />
              </Tooltip>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Warnings */}
      {architectureScore.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Architecture Considerations
          </Typography>
          <List dense>
            {architectureScore.warnings.map((warning, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemText primary={`• ${warning}`} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Architecture Patterns */}
      <Typography variant="h6" gutterBottom>
        Architecture Pattern
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(ARCHITECTURE_PATTERNS).map(([key, pattern]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <Paper
              elevation={config.pattern === key ? 3 : 1}
              sx={{
                p: 2,
                cursor: 'pointer',
                border: 2,
                borderColor: config.pattern === key ? 'primary.main' : 'transparent',
                position: 'relative',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => handlePatternSelect(key as ArchitectureConfig['pattern'])}
            >
              {recommended === key && (
                <Chip
                  label="Recommended"
                  size="small"
                  color="success"
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                />
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {pattern.icon}
                <Typography variant="subtitle1" fontWeight="bold">
                  {pattern.name}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {pattern.description}
              </Typography>
              <Button
                size="small"
                startIcon={<Info />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPattern(key);
                  setDetailsOpen(true);
                }}
              >
                Details
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Database & Deployment */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Database Strategy
          </Typography>
          <Stack spacing={1}>
            {Object.entries(DATABASE_OPTIONS).map(([key, option]) => (
              <Paper
                key={key}
                elevation={config.database === key ? 2 : 0}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: 1,
                  borderColor: config.database === key ? 'primary.main' : 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => onChange({ ...config, database: key as ArchitectureConfig['database'] })}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.bestFor}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Deployment Target
          </Typography>
          <Stack spacing={1}>
            {['cloud', 'on-premise', 'hybrid', 'edge'].map((deployment) => (
              <Paper
                key={deployment}
                elevation={config.deployment === deployment ? 2 : 0}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: 1,
                  borderColor: config.deployment === deployment ? 'primary.main' : 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => onChange({ ...config, deployment: deployment as ArchitectureConfig['deployment'] })}
              >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                  {deployment.replace('-', ' ')}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Grid>
      </Grid>

      {/* Additional Features */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Architecture Components
        </Typography>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {ARCHITECTURE_FEATURES.map((feature) => (
              <Chip
                key={feature}
                label={feature}
                onClick={() => {
                  const updated = config.features.includes(feature)
                    ? config.features.filter(f => f !== feature)
                    : [...config.features, feature];
                  onChange({ ...config, features: updated });
                }}
                color={config.features.includes(feature) ? 'primary' : 'default'}
                variant={config.features.includes(feature) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Paper>
      </Box>

      {/* Folder Structure Preview */}
      {config.pattern && (
        <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Suggested Folder Structure
            </Typography>
            <IconButton size="small">
              <ContentCopy fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre' }}>
            {generateFolderStructure().map((line, index) => (
              <Typography key={index} variant="body2">
                {line}
              </Typography>
            ))}
          </Box>
        </Paper>
      )}

      {/* Pattern Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        {selectedPattern && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {ARCHITECTURE_PATTERNS[selectedPattern as keyof typeof ARCHITECTURE_PATTERNS].icon}
                {ARCHITECTURE_PATTERNS[selectedPattern as keyof typeof ARCHITECTURE_PATTERNS].name}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" paragraph>
                {ARCHITECTURE_PATTERNS[selectedPattern as keyof typeof ARCHITECTURE_PATTERNS].description}
              </Typography>
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Pros:
              </Typography>
              <List dense>
                {ARCHITECTURE_PATTERNS[selectedPattern as keyof typeof ARCHITECTURE_PATTERNS].pros.map((pro, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={pro} />
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Cons:
              </Typography>
              <List dense>
                {ARCHITECTURE_PATTERNS[selectedPattern as keyof typeof ARCHITECTURE_PATTERNS].cons.map((con, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={con} />
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Best For:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ARCHITECTURE_PATTERNS[selectedPattern as keyof typeof ARCHITECTURE_PATTERNS].bestFor.map((use, index) => (
                  <Chip key={index} label={use} size="small" />
                ))}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  handlePatternSelect(selectedPattern as ArchitectureConfig['pattern']);
                  setDetailsOpen(false);
                }}
              >
                Select This Pattern
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ArchitectureHelper;
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  ExpandMore,
  Edit,
  Code,
  ContentCopy,
  Download,
  PlayArrow,
  BugReport,
  Info,
  Folder,
} from '@mui/icons-material';
import { ProjectConfig } from '../../types/project';
import { ProjectValidator, ValidationResult } from '../../utils/projectValidation';

interface ReviewWithValidationProps {
  config: ProjectConfig;
  onEdit: (section: string) => void;
  onGenerate: () => void;
  onSave?: () => void;
  isGenerating?: boolean;
}

const ReviewWithValidation: React.FC<ReviewWithValidationProps> = ({
  config,
  onEdit,
  onGenerate,
  onSave,
  isGenerating = false,
}) => {
  const [expanded, setExpanded] = useState<string | false>('overview');
  const [showCommands, setShowCommands] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  React.useEffect(() => {
    const validator = new ProjectValidator();
    const result = validator.validateProjectConfig(config);
    setValidation(result);
  }, [config]);

  const getSeverityColor = (severity: 'error' | 'warning' | 'info' | 'critical') => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info' | 'critical') => {
    switch (severity) {
      case 'error': return <Error />;
      case 'warning': return <Warning />;
      case 'info': return <Info />;
      default: return <Info />;
    }
  };

  const generateSetupCommands = () => {
    const commands: string[] = [];
    
    // Create project directory
    commands.push(`mkdir ${config.name}`);
    commands.push(`cd ${config.name}`);
    
    // Initialize git
    commands.push('git init');
    
    // Initialize package manager
    if (config.techStack.includes('Node.js') || config.techStack.includes('React')) {
      commands.push('npm init -y');
    } else if (config.techStack.includes('Python')) {
      commands.push('python -m venv venv');
      commands.push('source venv/bin/activate  # On Windows: venv\\Scripts\\activate');
      commands.push('pip install --upgrade pip');
    }
    
    // Install dependencies
    if (config.techStack.includes('React')) {
      commands.push('npx create-react-app . --template typescript');
    } else if (config.techStack.includes('Vue')) {
      commands.push('npm create vue@latest .');
    } else if (config.techStack.includes('Next.js')) {
      commands.push('npx create-next-app@latest . --typescript');
    }
    
    // Install additional packages
    const packages: string[] = [];
    if (config.techStack.includes('Express')) packages.push('express');
    if (config.techStack.includes('TypeScript')) packages.push('typescript @types/node');
    if (config.testingStrategy?.frameworks.includes('Jest')) packages.push('jest @types/jest');
    if (config.testingStrategy?.frameworks.includes('Cypress')) packages.push('--save-dev cypress');
    
    if (packages.length > 0) {
      commands.push(`npm install ${packages.join(' ')}`);
    }
    
    // Create folder structure
    if (config.architecture?.pattern === 'layered') {
      commands.push('mkdir -p src/{controllers,models,services,utils}');
    } else if (config.architecture?.pattern === 'microservices') {
      commands.push('mkdir -p services/{auth,api,gateway}');
    }
    
    // Setup testing
    if (config.testingStrategy?.frameworks.includes('Jest')) {
      commands.push('npx jest --init');
    }
    
    // Create README
    commands.push('echo "# ' + config.name + '" > README.md');
    
    return commands;
  };

  const getCompletionStatus = () => {
    let completed = 0;
    const total = 9;
    
    if (config.name) completed++;
    if (config.path) completed++;
    if (config.type) completed++;
    if (config.techStack.length > 0) completed++;
    if (config.goals && config.goals.length > 0) completed++;
    if (config.testingStrategy) completed++;
    if (config.architecture) completed++;
    if (config.teamSize) completed++;
    if (validation?.isValid) completed++;
    
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const exportConfiguration = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${config.name || 'project'}-config.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const status = getCompletionStatus();
  const commands = generateSetupCommands();

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Review & Generate Project
      </Typography>

      {/* Completion Status */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {status.completed} of {status.total} sections completed
            </Typography>
          </Box>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={status.percentage}
              size={80}
              thickness={4}
              color={status.percentage === 100 ? 'success' : 'primary'}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5" component="div" color="text.primary">
                {status.percentage}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Validation Results */}
      {validation && !validation.isValid && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Configuration Issues Found
          </Typography>
          <List dense>
            {validation.errors.map((error, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon>
                  {getSeverityIcon(error.severity)}
                </ListItemIcon>
                <ListItemText 
                  primary={error.message}
                  secondary={error.field}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Configuration Sections */}
      <Accordion
        expanded={expanded === 'overview'}
        onChange={(_, isExpanded) => setExpanded(isExpanded ? 'overview' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Project Overview
            </Typography>
            {config.name && config.type && (
              <CheckCircle color="success" fontSize="small" />
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit('overview');
              }}
              sx={{ ml: 'auto', mr: 2 }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body1" fontWeight="bold">{config.name || 'Not set'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Type</Typography>
              <Typography variant="body1" fontWeight="bold">{config.type || 'Not set'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Path</Typography>
              <Typography variant="body1" fontWeight="bold">{config.path || 'Not set'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Description</Typography>
              <Typography variant="body1">{config.description || 'No description provided'}</Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'techstack'}
        onChange={(_, isExpanded) => setExpanded(isExpanded ? 'techstack' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Technology Stack
            </Typography>
            {config.techStack.length > 0 && (
              <Chip label={`${config.techStack.length} technologies`} size="small" />
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit('techstack');
              }}
              sx={{ ml: 'auto', mr: 2 }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {config.techStack.map((tech: string) => (
              <Chip key={tech} label={tech} />
            ))}
            {config.techStack.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No technologies selected
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'goals'}
        onChange={(_, isExpanded) => setExpanded(isExpanded ? 'goals' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Project Goals
            </Typography>
            {config.goals && config.goals.length > 0 && (
              <Chip label={`${config.goals.length} goals`} size="small" />
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit('goals');
              }}
              sx={{ ml: 'auto', mr: 2 }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {config.goals?.map((goal: any, index: number) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <ListItemText
                  primary={goal.text}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip label={goal.priority} size="small" color={
                    goal.priority === 'high' ? 'error' :
                    goal.priority === 'medium' ? 'warning' : 'success'
                  } />
                  <Chip label={goal.category} size="small" variant="outlined" />
                </Stack>
              </ListItem>
            )) || (
              <Typography variant="body2" color="text.secondary">
                No goals defined
              </Typography>
            )}
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'architecture'}
        onChange={(_, isExpanded) => setExpanded(isExpanded ? 'architecture' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Architecture & Testing
            </Typography>
            {config.architecture && config.testingStrategy && (
              <CheckCircle color="success" fontSize="small" />
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit('architecture');
              }}
              sx={{ ml: 'auto', mr: 2 }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Architecture Pattern</Typography>
              <Typography variant="body1" fontWeight="bold">
                {config.architecture?.pattern || 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Database</Typography>
              <Typography variant="body1" fontWeight="bold">
                {config.architecture?.database || 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Test Coverage Target</Typography>
              <Typography variant="body1" fontWeight="bold">
                {config.testingStrategy?.unitTestCoverage || 0}%
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Test Frameworks</Typography>
              <Typography variant="body1" fontWeight="bold">
                {config.testingStrategy?.frameworks.join(', ') || 'None'}
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box sx={{ mt: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Code />}
              onClick={() => setShowCommands(true)}
            >
              View Setup Commands
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportConfiguration}
            >
              Export Config
            </Button>
            {onSave && (
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={onSave}
              >
                Save as Template
              </Button>
            )}
          </Stack>
          <Button
            variant="contained"
            size="large"
            startIcon={isGenerating ? <CircularProgress size={20} /> : <PlayArrow />}
            onClick={onGenerate}
            disabled={!validation?.isValid || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Project'}
          </Button>
        </Stack>
      </Box>

      {/* Setup Commands Dialog */}
      <Dialog open={showCommands} onClose={() => setShowCommands(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Code />
            Setup Commands
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Copy and run these commands to set up your project locally.
            </Typography>
          </Alert>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.900' }}>
            <Box sx={{ fontFamily: 'monospace', fontSize: 14 }}>
              {commands.map((cmd, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ 
                    color: cmd.startsWith('#') ? 'grey.500' : 'grey.100',
                    mb: 0.5
                  }}
                >
                  {cmd}
                </Typography>
              ))}
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommands(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={() => {
              navigator.clipboard.writeText(commands.join('\n'));
            }}
          >
            Copy Commands
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Details */}
      {validation && validation.suggestions.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'info.50' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Suggestions for Improvement
          </Typography>
          <List dense>
            {validation.suggestions.map((suggestion, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon>
                  <Info color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={suggestion} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ReviewWithValidation;
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Web,
  Api,
  PhoneIphone,
  Terminal,
  Code,
  Storage,
  Psychology,
  DesktopMac,
  HelpOutline,
} from '@mui/icons-material';
import VisualCard from '../common/VisualCard';
import InfoTooltip from '../common/InfoTooltip';

interface ProjectType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  recommended?: boolean;
}

interface ProjectTypeSelectorProps {
  selected?: string;
  onSelect: (type: string) => void;
  showHelper?: boolean;
}

const PROJECT_TYPES: ProjectType[] = [
  {
    id: 'web',
    name: 'Web Application',
    description: 'Frontend, backend, or full-stack web apps',
    icon: <Web sx={{ fontSize: 40 }} />,
    examples: ['E-commerce site', 'Social platform', 'Dashboard', 'Blog'],
    recommended: true
  },
  {
    id: 'api',
    name: 'API / Backend Service',
    description: 'REST, GraphQL, or microservices',
    icon: <Api sx={{ fontSize: 40 }} />,
    examples: ['REST API', 'GraphQL server', 'Microservice', 'Auth service']
  },
  {
    id: 'mobile',
    name: 'Mobile Application',
    description: 'iOS, Android, or cross-platform apps',
    icon: <PhoneIphone sx={{ fontSize: 40 }} />,
    examples: ['React Native app', 'Flutter app', 'PWA', 'Hybrid app']
  },
  {
    id: 'cli',
    name: 'CLI Tool',
    description: 'Command-line utilities and scripts',
    icon: <Terminal sx={{ fontSize: 40 }} />,
    examples: ['Dev tool', 'Automation script', 'File processor', 'Task runner']
  },
  {
    id: 'library',
    name: 'Library / Package',
    description: 'Reusable code library or npm package',
    icon: <Code sx={{ fontSize: 40 }} />,
    examples: ['React component library', 'Utility functions', 'SDK', 'Framework']
  },
  {
    id: 'data',
    name: 'Data Pipeline',
    description: 'ETL, data processing, or analytics',
    icon: <Storage sx={{ fontSize: 40 }} />,
    examples: ['ETL pipeline', 'Data warehouse', 'Analytics engine', 'Scraper']
  },
  {
    id: 'ml',
    name: 'Machine Learning',
    description: 'ML models, training pipelines, or AI apps',
    icon: <Psychology sx={{ fontSize: 40 }} />,
    examples: ['Model training', 'Prediction API', 'Computer vision', 'NLP']
  },
  {
    id: 'desktop',
    name: 'Desktop Application',
    description: 'Cross-platform desktop software',
    icon: <DesktopMac sx={{ fontSize: 40 }} />,
    examples: ['Electron app', 'Native app', 'Developer tool', 'Productivity app']
  }
];

const ProjectTypeSelector: React.FC<ProjectTypeSelectorProps> = ({
  selected,
  onSelect,
  showHelper = true
}) => {
  const [helperOpen, setHelperOpen] = useState(false);
  const [requirements, setRequirements] = useState('');

  const handleHelperSubmit = () => {
    // Simple keyword matching for project type detection
    const lower = requirements.toLowerCase();
    let detectedType = 'web'; // default

    if (lower.includes('api') || lower.includes('backend') || lower.includes('server')) {
      detectedType = 'api';
    } else if (lower.includes('mobile') || lower.includes('app') || lower.includes('ios') || lower.includes('android')) {
      detectedType = 'mobile';
    } else if (lower.includes('cli') || lower.includes('command') || lower.includes('terminal')) {
      detectedType = 'cli';
    } else if (lower.includes('desktop') || lower.includes('electron')) {
      detectedType = 'desktop';
    } else if (lower.includes('machine learning') || lower.includes('ml') || lower.includes('ai')) {
      detectedType = 'ml';
    } else if (lower.includes('data') || lower.includes('etl') || lower.includes('pipeline')) {
      detectedType = 'data';
    } else if (lower.includes('library') || lower.includes('package') || lower.includes('npm')) {
      detectedType = 'library';
    }

    onSelect(detectedType);
    setHelperOpen(false);
    setRequirements('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          What are you building?
        </Typography>
        <InfoTooltip 
          title="Project Type"
          content="Choose the type that best matches your project. This helps us suggest the right technologies and structure."
        />
        {showHelper && (
          <Button
            startIcon={<HelpOutline />}
            onClick={() => setHelperOpen(true)}
            sx={{ ml: 'auto' }}
          >
            Not sure? Let me help
          </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {PROJECT_TYPES.map((type) => (
          <Grid item xs={12} sm={6} md={3} key={type.id}>
            <VisualCard
              title={type.name}
              description={type.description}
              icon={type.icon}
              selected={selected === type.id}
              onClick={() => onSelect(type.id)}
              badges={type.examples.slice(0, 2)}
              recommended={type.recommended}
            />
          </Grid>
        ))}
      </Grid>

      <Dialog open={helperOpen} onClose={() => setHelperOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Let me help you choose
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe what you want to build, and I'll suggest the best project type for you.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="I want to build a real-time chat application where users can join rooms and send messages..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelperOpen(false)}>Cancel</Button>
          <Button onClick={handleHelperSubmit} variant="contained" disabled={!requirements.trim()}>
            Get Recommendation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectTypeSelector;
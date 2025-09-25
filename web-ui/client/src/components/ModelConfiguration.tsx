import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert,
  Button,
  CircularProgress,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  SmartToy,
  Psychology,
  Build,
  Code,
  BugReport,
  RateReview,
  Info,
  CheckCircle,
  Error,
  Refresh,
} from '@mui/icons-material';
import { api } from '../services/api';
import toast from 'react-hot-toast';

// Available Claude models
const CLAUDE_MODELS = [
  { value: 'haiku-3-5', label: 'Haiku 3.5', description: 'Fast, efficient for simple tasks' },
  { value: 'sonnet', label: 'Sonnet', description: 'Balanced performance and capability' },
  { value: 'sonnet[1m]', label: 'Sonnet [1M]', description: 'Extended context window (if available)' },
  { value: 'opus', label: 'Opus', description: 'Most capable, best for complex tasks' },
];

// Agent types with their icons and descriptions
const AGENTS = [
  { 
    id: 'assistant', 
    name: 'AI Assistant', 
    icon: <SmartToy />, 
    description: 'Project initialization helper',
    defaultModel: 'haiku-3-5' 
  },
  { 
    id: 'coordinator', 
    name: 'Coordinator', 
    icon: <Psychology />, 
    description: 'Orchestrates work between agents',
    defaultModel: 'sonnet' 
  },
  { 
    id: 'planner', 
    name: 'Planner', 
    icon: <Build />, 
    description: 'Analyzes and creates strategies',
    defaultModel: 'sonnet' 
  },
  { 
    id: 'coder', 
    name: 'Coder', 
    icon: <Code />, 
    description: 'Implements features and fixes',
    defaultModel: 'sonnet' 
  },
  { 
    id: 'tester', 
    name: 'Tester', 
    icon: <BugReport />, 
    description: 'Writes and runs tests',
    defaultModel: 'sonnet' 
  },
  { 
    id: 'reviewer', 
    name: 'Reviewer', 
    icon: <RateReview />, 
    description: 'Reviews code quality',
    defaultModel: 'sonnet' 
  },
];

interface ModelConfig {
  [key: string]: {
    model: string;
    available?: boolean;
    lastChecked?: string;
  };
}

interface ModelConfigurationProps {
  onSave?: (config: ModelConfig) => void;
}

function ModelConfiguration({ onSave }: ModelConfigurationProps) {
  const [modelConfig, setModelConfig] = useState<ModelConfig>({});
  const [availableModels, setAvailableModels] = useState<Set<string>>(
    // Default to assuming all models are available until we check
    new Set(['haiku-3-5', 'sonnet', 'sonnet[1m]', 'opus'])
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved configuration on mount
  useEffect(() => {
    loadConfiguration();
    checkModelAvailability(false); // Don't force refresh on initial load
  }, []);

  const loadConfiguration = () => {
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem('model-configuration');
      if (saved) {
        const config = JSON.parse(saved);
        setModelConfig(config);
      } else {
        // Set default configuration
        const defaultConfig: ModelConfig = {};
        AGENTS.forEach(agent => {
          defaultConfig[agent.id] = {
            model: agent.defaultModel,
            available: true,
          };
        });
        setModelConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to load model configuration:', error);
      // Set defaults on error
      const defaultConfig: ModelConfig = {};
      AGENTS.forEach(agent => {
        defaultConfig[agent.id] = {
          model: agent.defaultModel,
          available: true,
        };
      });
      setModelConfig(defaultConfig);
    }
  };

  const checkModelAvailability = async (forceRefresh = false) => {
    setCheckingAvailability(true);
    try {
      // Call backend to check which models are available
      const response = await api.get('/models/availability', {
        params: { refresh: forceRefresh }
      });
      const available = new Set<string>(response.data.available || []);
      setAvailableModels(available);
      
      // Show if using cached data
      if (response.data.cached && !forceRefresh) {
        console.log('Using cached model availability');
      }
      
      // Update configuration with availability info
      setModelConfig(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(agentId => {
          if (updated[agentId]) {
            updated[agentId].available = available.has(updated[agentId].model);
            updated[agentId].lastChecked = new Date().toISOString();
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to check model availability:', error);
      // Assume all models are available on error to avoid blocking user
      setAvailableModels(new Set(['haiku-3-5', 'sonnet', 'sonnet[1m]', 'opus']));
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleModelChange = (agentId: string, model: string) => {
    setModelConfig(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        model,
        available: availableModels.has(model),
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('model-configuration', JSON.stringify(modelConfig));
      
      // Save to backend
      await api.post('/models/configuration', { configuration: modelConfig });
      
      toast.success('Model configuration saved successfully');
      setHasChanges(false);
      
      if (onSave) {
        onSave(modelConfig);
      }
    } catch (error) {
      console.error('Failed to save model configuration:', error);
      toast.error('Failed to save model configuration');
    }
  };

  const handleReset = () => {
    const defaultConfig: ModelConfig = {};
    AGENTS.forEach(agent => {
      defaultConfig[agent.id] = {
        model: agent.defaultModel,
        available: availableModels.has(agent.defaultModel),
      };
    });
    setModelConfig(defaultConfig);
    setHasChanges(true);
  };

  const getModelStatus = (agentId: string) => {
    const config = modelConfig[agentId];
    if (!config) return null;
    
    if (config.available === false) {
      return <Chip label="Unavailable" color="error" size="small" icon={<Error />} />;
    }
    
    if (config.model === 'sonnet[1m]' && config.available) {
      return <Chip label="Extended" color="secondary" size="small" icon={<CheckCircle />} />;
    }
    
    return <Chip label="Available" color="success" size="small" icon={<CheckCircle />} />;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h6" gutterBottom>
            AI Model Configuration
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh model availability">
              <IconButton 
                onClick={() => checkModelAvailability(true)}
                disabled={checkingAvailability}
                size="small"
              >
                {checkingAvailability ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Information about models">
              <IconButton size="small">
                <Info />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Configure which Claude model each agent should use. The Coordinator will automatically try sonnet[1m] 
          first if available, then fallback to regular sonnet.
        </Alert>

        <Grid container spacing={2}>
          {AGENTS.map((agent) => (
            <Grid item xs={12} md={6} key={agent.id}>
              <Box sx={{ 
                p: 2, 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper'
              }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Box sx={{ color: 'primary.main' }}>{agent.icon}</Box>
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {agent.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {agent.description}
                    </Typography>
                  </Box>
                  {getModelStatus(agent.id)}
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={modelConfig[agent.id]?.model || agent.defaultModel}
                    onChange={(e) => handleModelChange(agent.id, e.target.value)}
                    label="Model"
                  >
                    {CLAUDE_MODELS.map((model) => (
                      <MenuItem 
                        key={model.value} 
                        value={model.value}
                        disabled={model.value === 'sonnet[1m]' && !availableModels.has('sonnet[1m]')}
                      >
                        <Box>
                          <Typography variant="body2">{model.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {model.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {agent.id === 'coordinator' && modelConfig[agent.id]?.model === 'sonnet' && (
                  <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                    Will try sonnet[1m] first if available
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Typography variant="caption" color="text.secondary">
            Models will be used for new agent sessions
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="outlined" onClick={handleReset} disabled={!hasChanges}>
              Reset to Defaults
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Configuration
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ModelConfiguration;
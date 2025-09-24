import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Paper,
  Button,
  Alert,
  Stack,
  Autocomplete,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search,
  Add,
  Warning,
  CheckCircle,
  Info,
  AutoAwesome,
  Speed,
  Close,
} from '@mui/icons-material';
import { TECH_CATEGORIES, TECH_STACK_PRESETS, checkCompatibility } from '../../data/techStackData';
import InfoTooltip from '../common/InfoTooltip';

interface SmartTechStackBuilderProps {
  selectedStack: string[];
  onStackChange: (stack: string[]) => void;
  projectType?: string;
  showSuggestions?: boolean;
}

const SmartTechStackBuilder: React.FC<SmartTechStackBuilderProps> = ({
  selectedStack,
  onStackChange,
  projectType,
  showSuggestions = true
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [customTech, setCustomTech] = useState('');

  const categories = Object.entries(TECH_CATEGORIES);
  const activeCategory = categories[activeTab];

  // Filter tech items based on search
  const filteredTech = useMemo(() => {
    if (!activeCategory) return [];
    const items = activeCategory[1].items;
    if (!searchTerm) return items;
    
    const lower = searchTerm.toLowerCase();
    return items.filter(item => item.toLowerCase().includes(lower));
  }, [activeCategory, searchTerm]);

  // Check compatibility
  const compatibility = useMemo(() => {
    return checkCompatibility(selectedStack);
  }, [selectedStack]);

  const handleAddTech = (tech: string) => {
    if (!selectedStack.includes(tech)) {
      onStackChange([...selectedStack, tech]);
    }
  };

  const handleRemoveTech = (tech: string) => {
    onStackChange(selectedStack.filter(t => t !== tech));
  };

  const handleAddCustom = () => {
    if (customTech.trim() && !selectedStack.includes(customTech.trim())) {
      handleAddTech(customTech.trim());
      setCustomTech('');
    }
  };

  const handlePresetSelect = (preset: string[]) => {
    const uniqueStack = Array.from(new Set([...selectedStack, ...preset]));
    onStackChange(uniqueStack);
  };

  const clearAll = () => {
    onStackChange([]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Build Your Tech Stack
        </Typography>
        <InfoTooltip 
          title="Tech Stack Builder"
          content="Select technologies that work well together. We'll check compatibility and suggest missing pieces."
        />
        <Badge badgeContent={selectedStack.length} color="primary" sx={{ ml: 'auto', mr: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected
          </Typography>
        </Badge>
        {selectedStack.length > 0 && (
          <Button size="small" onClick={clearAll} startIcon={<Close />}>
            Clear All
          </Button>
        )}
      </Box>

      {/* Quick Presets */}
      {showSuggestions && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'info.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Speed sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="subtitle2" fontWeight="bold">
              Quick Presets
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {Object.values(TECH_STACK_PRESETS).slice(0, 5).map(preset => (
              <Chip
                key={preset.name}
                label={`${preset.icon} ${preset.name}`}
                onClick={() => handlePresetSelect(preset.stack)}
                clickable
                color="primary"
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Compatibility Warnings */}
      {!compatibility.compatible && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Compatibility Issues
          </Typography>
          {compatibility.warnings.map((warning, index) => (
            <Typography key={index} variant="body2">
              • {warning}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Suggestions */}
      {compatibility.suggestions.length > 0 && showSuggestions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Suggestions
          </Typography>
          {compatibility.suggestions.slice(0, 3).map((suggestion, index) => (
            <Typography key={index} variant="body2">
              • {suggestion}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Selected Technologies */}
      {selectedStack.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, overflow: 'hidden' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Selected Technologies ({selectedStack.length})
          </Typography>
          <Box sx={{ overflowX: 'auto', pb: 1 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {selectedStack.map(tech => (
                <Chip
                  key={tech}
                  label={tech}
                  onDelete={() => handleRemoveTech(tech)}
                  color="primary"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>
        </Paper>
      )}

      {/* Category Tabs */}
      <Paper elevation={2}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map(([key, category], index) => (
            <Tab
              key={key}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Search */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder={`Search ${activeCategory?.[1].label || 'technologies'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Technology Grid */}
        <Box sx={{ p: 2, maxHeight: 300, overflowY: 'auto' }}>
          <Grid container spacing={1}>
            {filteredTech.map(tech => {
              const isSelected = selectedStack.includes(tech);
              const isIncompatible = compatibility.warnings.some(w => w.includes(tech));
              
              return (
                <Grid item xs={6} sm={4} md={3} key={tech}>
                  <Paper
                    elevation={isSelected ? 3 : 0}
                    sx={{
                      p: 1.5,
                      textAlign: 'center',
                      cursor: isSelected ? 'default' : 'pointer',
                      bgcolor: isSelected ? 'primary.50' : isIncompatible ? 'error.50' : 'background.paper',
                      border: 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.50' : 'action.hover',
                        borderColor: isSelected ? 'primary.main' : 'primary.light',
                      }
                    }}
                    onClick={() => !isSelected && handleAddTech(tech)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                        {tech}
                      </Typography>
                      {isSelected && (
                        <CheckCircle sx={{ ml: 0.5, fontSize: 16, color: 'primary.main' }} />
                      )}
                      {isIncompatible && !isSelected && (
                        <Warning sx={{ ml: 0.5, fontSize: 16, color: 'error.main' }} />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Custom Technology */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                size="small"
                placeholder="Add custom technology..."
                value={customTech}
                onChange={(e) => setCustomTech(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
              />
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                onClick={handleAddCustom}
                disabled={!customTech.trim()}
                startIcon={<Add />}
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* AI Suggestion */}
      {showSuggestions && selectedStack.length > 2 && (
        <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'success.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoAwesome sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="body2">
              <strong>Pro tip:</strong> Your stack looks good! Consider adding a testing framework like {
                selectedStack.includes('React') ? 'Jest' : 'Pytest'
              } for better code quality.
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SmartTechStackBuilder;
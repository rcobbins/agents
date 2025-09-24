import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Stack,
  Alert,
  Collapse,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add,
  Delete,
  Flag,
  TrendingUp,
  Speed,
  Security,
  People,
  AttachMoney,
  CalendarMonth,
  Check,
  DragIndicator,
  Info,
} from '@mui/icons-material';

interface Goal {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'security' | 'scalability' | 'cost' | 'timeline' | 'custom';
  metrics?: string[];
}

interface GoalsWizardProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
  projectType?: string;
  showSuggestions?: boolean;
}

const GOAL_SUGGESTIONS = {
  performance: [
    'Page load time < 2 seconds',
    'API response time < 200ms',
    'Support 1000 concurrent users',
    '60 FPS on mobile devices',
  ],
  security: [
    'OWASP Top 10 compliance',
    'End-to-end encryption',
    'Multi-factor authentication',
    'Regular security audits',
  ],
  scalability: [
    'Horizontal scaling support',
    'Auto-scaling based on load',
    'Database sharding ready',
    'Microservices architecture',
  ],
  cost: [
    'Monthly cloud costs < $500',
    'Pay-per-use pricing model',
    'Optimize for serverless',
    'Minimize third-party services',
  ],
  timeline: [
    'MVP in 4 weeks',
    'Production ready in 3 months',
    'Weekly sprint releases',
    'Continuous deployment',
  ],
};

const GOAL_ICONS = {
  performance: <Speed />,
  security: <Security />,
  scalability: <TrendingUp />,
  cost: <AttachMoney />,
  timeline: <CalendarMonth />,
  custom: <Flag />,
};

const GoalsWizard: React.FC<GoalsWizardProps> = ({
  goals = [],
  onChange,
  projectType,
  showSuggestions = true,
}) => {
  const [newGoalText, setNewGoalText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Goal['category']>('custom');
  const [selectedPriority, setSelectedPriority] = useState<Goal['priority']>('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      text: newGoalText,
      priority: selectedPriority,
      category: selectedCategory,
    };

    onChange([...goals, newGoal]);
    setNewGoalText('');
  };

  const handleRemoveGoal = (id: string) => {
    onChange(goals.filter(g => g.id !== id));
  };

  const handleAddSuggestion = (text: string, category: Goal['category']) => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      text,
      priority: 'medium',
      category,
    };
    onChange([...goals, newGoal]);
  };

  const handlePriorityChange = (id: string, priority: Goal['priority']) => {
    onChange(goals.map(g => g.id === id ? { ...g, priority } : g));
  };

  const getPriorityColor = (priority: Goal['priority']) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getRecommendedGoals = () => {
    // Based on project type, suggest relevant goals
    const recommendations: string[] = [];
    
    if (projectType === 'web') {
      recommendations.push('Page load time < 2 seconds');
      recommendations.push('Mobile responsive design');
      recommendations.push('SEO optimized');
    } else if (projectType === 'api') {
      recommendations.push('API response time < 200ms');
      recommendations.push('Rate limiting implementation');
      recommendations.push('Comprehensive API documentation');
    } else if (projectType === 'mobile') {
      recommendations.push('60 FPS on all devices');
      recommendations.push('Offline functionality');
      recommendations.push('App size < 50MB');
    }

    return recommendations;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Define Your Project Goals
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          sx={{ ml: 2 }}
        >
          <Info />
        </IconButton>
      </Box>

      <Collapse in={showAdvanced}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Why Goals Matter
          </Typography>
          <Typography variant="body2">
            Clear goals help shape your project's architecture, tech stack, and development priorities.
            They also help measure success and keep your team aligned.
          </Typography>
        </Alert>
      </Collapse>

      {/* Quick Recommendations */}
      {showSuggestions && projectType && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Recommended Goals for {projectType} Projects
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ overflow: 'hidden' }}>
            {getRecommendedGoals().map((goal, index) => (
              <Chip
                key={index}
                label={goal}
                onClick={() => handleAddSuggestion(goal, 'custom')}
                clickable
                color="primary"
                variant="outlined"
                size="small"
                icon={<Add />}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Current Goals */}
      {goals.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Your Goals ({goals.length})
          </Typography>
          <List>
            {goals.map((goal) => (
              <ListItem
                key={goal.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveGoal(goal.id)}>
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {GOAL_ICONS[goal.category]}
                </ListItemIcon>
                <ListItemText
                  primary={goal.text}
                  secondary={
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={goal.priority}
                        size="small"
                        color={getPriorityColor(goal.priority)}
                        onClick={() => {
                          const priorities: Goal['priority'][] = ['high', 'medium', 'low'];
                          const currentIndex = priorities.indexOf(goal.priority);
                          const nextPriority = priorities[(currentIndex + 1) % 3];
                          handlePriorityChange(goal.id, nextPriority);
                        }}
                      />
                      <Chip
                        label={goal.category}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Add New Goal */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Add a Goal
        </Typography>

        <Stack spacing={2}>
          {/* Category Selection */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Category
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ overflow: 'hidden' }}>
              {Object.entries(GOAL_ICONS).map(([category, icon]) => (
                <Chip
                  key={category}
                  label={category}
                  icon={icon as React.ReactElement}
                  onClick={() => setSelectedCategory(category as Goal['category'])}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  variant={selectedCategory === category ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>

          {/* Priority Selection */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Priority
            </Typography>
            <Stack direction="row" spacing={1}>
              {(['high', 'medium', 'low'] as Goal['priority'][]).map((priority) => (
                <Chip
                  key={priority}
                  label={priority}
                  onClick={() => setSelectedPriority(priority)}
                  color={selectedPriority === priority ? getPriorityColor(priority) : 'default'}
                  variant={selectedPriority === priority ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>

          {/* Goal Text Input */}
          <TextField
            fullWidth
            placeholder="Enter your goal (e.g., 'Support 10,000 concurrent users')"
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
          />

          <Button
            variant="contained"
            onClick={handleAddGoal}
            disabled={!newGoalText.trim()}
            startIcon={<Add />}
          >
            Add Goal
          </Button>
        </Stack>

        {/* Category Suggestions */}
        {showSuggestions && selectedCategory !== 'custom' && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Suggested {selectedCategory} goals:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ overflow: 'hidden' }}>
              {GOAL_SUGGESTIONS[selectedCategory as keyof typeof GOAL_SUGGESTIONS]?.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  size="small"
                  onClick={() => setNewGoalText(suggestion)}
                  clickable
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Smart Analysis */}
      {goals.length >= 3 && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Great goal setting!</strong> Based on your goals, consider:
            {goals.some(g => g.category === 'performance') && ' Using a CDN for static assets.'}
            {goals.some(g => g.category === 'security') && ' Implementing JWT authentication.'}
            {goals.some(g => g.category === 'scalability') && ' Using containerization with Docker.'}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default GoalsWizard;
import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Timeline,
  Group,
  AttachMoney,
  Warning,
  CheckCircle,
  Schedule,
  TrendingUp,
  Code,
  Build,
  BugReport,
  Info,
} from '@mui/icons-material';

interface ProjectConfig {
  projectType?: string;
  techStack: string[];
  features: string[];
  teamSize?: number;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  architecture?: string;
  testing?: {
    unitTestCoverage: number;
    e2eTesting: boolean;
    integrationTesting: boolean;
  };
  goals?: Array<{
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface ComplexityEstimatorProps {
  config: ProjectConfig;
  onWarning?: (warnings: string[]) => void;
}

interface ComplexityMetrics {
  technical: number;
  organizational: number;
  integration: number;
  maintenance: number;
  overall: number;
  level: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
  color: 'success' | 'info' | 'warning' | 'error';
}

interface TimeEstimate {
  optimistic: number;
  realistic: number;
  pessimistic: number;
  unit: 'days' | 'weeks' | 'months';
}

const ComplexityEstimator: React.FC<ComplexityEstimatorProps> = ({
  config,
  onWarning,
}) => {
  const calculateComplexity = (): ComplexityMetrics => {
    let technical = 0;
    let organizational = 0;
    let integration = 0;
    let maintenance = 0;

    // Technical Complexity
    technical += config.techStack.length * 5;
    if (config.techStack.length > 10) technical += 20;
    if (config.techStack.some(t => ['Kubernetes', 'Docker', 'Terraform'].includes(t))) technical += 15;
    if (config.techStack.some(t => ['React', 'Angular', 'Vue'].includes(t))) technical += 10;
    if (config.techStack.some(t => ['GraphQL', 'gRPC'].includes(t))) technical += 12;

    // Architecture Complexity
    if (config.architecture === 'microservices') technical += 25;
    if (config.architecture === 'serverless') technical += 15;
    if (config.architecture === 'monolithic') technical += 5;

    // Features Complexity
    integration += config.features.length * 3;
    if (config.features.includes('Real-time')) integration += 15;
    if (config.features.includes('AI/ML')) integration += 20;
    if (config.features.includes('Blockchain')) integration += 25;
    if (config.features.includes('Payment Processing')) integration += 15;

    // Organizational Complexity
    const teamSize = config.teamSize || 1;
    if (teamSize > 5) organizational += 15;
    if (teamSize > 10) organizational += 25;
    if (config.experience === 'beginner') organizational += 20;
    if (config.experience === 'intermediate') organizational += 10;

    // Testing Complexity
    if (config.testing) {
      if (config.testing.unitTestCoverage > 80) maintenance += 10;
      if (config.testing.e2eTesting) maintenance += 15;
      if (config.testing.integrationTesting) maintenance += 10;
    }

    // High priority goals add complexity
    const highPriorityGoals = config.goals?.filter(g => g.priority === 'high').length || 0;
    organizational += highPriorityGoals * 5;

    // Cap values at 100
    technical = Math.min(technical, 100);
    organizational = Math.min(organizational, 100);
    integration = Math.min(integration, 100);
    maintenance = Math.min(maintenance, 100);

    const overall = Math.round((technical + organizational + integration + maintenance) / 4);

    let level: ComplexityMetrics['level'];
    let color: ComplexityMetrics['color'];

    if (overall < 25) {
      level = 'Simple';
      color = 'success';
    } else if (overall < 50) {
      level = 'Moderate';
      color = 'info';
    } else if (overall < 75) {
      level = 'Complex';
      color = 'warning';
    } else {
      level = 'Very Complex';
      color = 'error';
    }

    return { technical, organizational, integration, maintenance, overall, level, color };
  };

  const estimateTimeline = (): TimeEstimate => {
    const complexity = calculateComplexity();
    const teamSize = config.teamSize || 1;
    const experienceMultiplier = 
      config.experience === 'beginner' ? 2 :
      config.experience === 'intermediate' ? 1.5 : 1;

    // Base time in developer-days
    let baseDays = 5; // Minimum for any project

    // Add time based on complexity
    baseDays += complexity.overall * 0.5;

    // Add time for features
    baseDays += config.features.length * 2;

    // Add time for tech stack learning curve
    if (config.experience === 'beginner') {
      baseDays += config.techStack.length * 1.5;
    }

    // Adjust for team size (Brooks's Law consideration)
    const teamEfficiency = Math.sqrt(teamSize); // Diminishing returns
    const adjustedDays = baseDays / teamEfficiency * experienceMultiplier;

    // Calculate estimates
    const optimistic = Math.round(adjustedDays * 0.7);
    const realistic = Math.round(adjustedDays);
    const pessimistic = Math.round(adjustedDays * 1.5);

    // Determine unit
    let unit: TimeEstimate['unit'] = 'days';
    if (realistic > 60) {
      unit = 'months';
      return {
        optimistic: Math.round(optimistic / 20),
        realistic: Math.round(realistic / 20),
        pessimistic: Math.round(pessimistic / 20),
        unit,
      };
    } else if (realistic > 10) {
      unit = 'weeks';
      return {
        optimistic: Math.round(optimistic / 5),
        realistic: Math.round(realistic / 5),
        pessimistic: Math.round(pessimistic / 5),
        unit,
      };
    }

    return { optimistic, realistic, pessimistic, unit };
  };

  const generateWarnings = (): string[] => {
    const warnings: string[] = [];
    const complexity = calculateComplexity();

    if (complexity.technical > 70) {
      warnings.push('High technical complexity may require senior developers');
    }

    if (config.techStack.length > 8) {
      warnings.push('Large tech stack may increase learning curve and maintenance');
    }

    if (config.architecture === 'microservices' && (config.teamSize || 1) < 3) {
      warnings.push('Microservices architecture typically requires larger teams');
    }

    if (config.experience === 'beginner' && complexity.overall > 50) {
      warnings.push('Consider simplifying the project or getting mentorship');
    }

    if (config.features.includes('Real-time') && !config.techStack.includes('WebSocket')) {
      warnings.push('Real-time features may require WebSocket or similar technology');
    }

    if (config.testing?.unitTestCoverage && config.testing.unitTestCoverage > 90) {
      warnings.push('Very high test coverage may slow down initial development');
    }

    return warnings;
  };

  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const complexity = calculateComplexity();

    if (complexity.overall > 60) {
      recommendations.push('Start with an MVP and iterate');
      recommendations.push('Consider breaking into phases');
      recommendations.push('Set up CI/CD early');
    }

    if (config.teamSize && config.teamSize > 3) {
      recommendations.push('Establish clear communication channels');
      recommendations.push('Use project management tools');
      recommendations.push('Define code review processes');
    }

    if (config.experience === 'beginner') {
      recommendations.push('Allocate time for learning');
      recommendations.push('Use well-documented technologies');
      recommendations.push('Consider pair programming');
    }

    if (config.techStack.length > 5) {
      recommendations.push('Create a tech stack diagram');
      recommendations.push('Document integration points');
    }

    return recommendations;
  };

  const complexity = calculateComplexity();
  const timeline = estimateTimeline();
  const warnings = generateWarnings();
  const recommendations = getRecommendations();

  React.useEffect(() => {
    if (onWarning && warnings.length > 0) {
      onWarning(warnings);
    }
  }, [warnings, onWarning]);

  const getCostEstimate = () => {
    const baseMonthly = 100; // Base infrastructure cost
    const perFeature = 20;
    const complexityMultiplier = complexity.overall / 100;

    const infrastructureCost = Math.round(
      baseMonthly + (config.features.length * perFeature) + (baseMonthly * complexityMultiplier)
    );

    const developmentHours = timeline.realistic * 8 * (config.teamSize || 1);
    const hourlyRate = 75; // Average developer rate
    const developmentCost = developmentHours * hourlyRate;

    return {
      infrastructure: infrastructureCost,
      development: developmentCost,
      total: infrastructureCost + developmentCost,
    };
  };

  const costs = getCostEstimate();

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Project Complexity Analysis
      </Typography>

      {/* Overall Complexity */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Overall Complexity
            </Typography>
            <Chip
              label={complexity.level}
              color={complexity.color as 'success' | 'info' | 'warning' | 'error'}
              icon={<TrendingUp />}
            />
          </Box>
          <Typography variant="h2" color={`${complexity.color}.main`}>
            {complexity.overall}%
          </Typography>
        </Box>

        {/* Complexity Breakdown */}
        <Grid container spacing={2}>
          {[
            { label: 'Technical', value: complexity.technical, icon: <Code /> },
            { label: 'Organizational', value: complexity.organizational, icon: <Group /> },
            { label: 'Integration', value: complexity.integration, icon: <Build /> },
            { label: 'Maintenance', value: complexity.maintenance, icon: <BugReport /> },
          ].map((metric) => (
            <Grid item xs={12} sm={6} key={metric.label}>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {metric.icon}
                  <Typography variant="body2" fontWeight="bold">
                    {metric.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {metric.value}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={metric.value}
                  sx={{ height: 8, borderRadius: 1 }}
                  color={
                    metric.value < 30 ? 'success' :
                    metric.value < 60 ? 'info' :
                    metric.value < 80 ? 'warning' : 'error'
                  }
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Timeline Estimate */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Schedule />
          <Typography variant="h6">
            Timeline Estimate
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Optimistic
              </Typography>
              <Typography variant="h4" color="success.main">
                {timeline.optimistic}
              </Typography>
              <Typography variant="body2">
                {timeline.unit}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Realistic
              </Typography>
              <Typography variant="h4" color="info.main">
                {timeline.realistic}
              </Typography>
              <Typography variant="body2">
                {timeline.unit}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pessimistic
              </Typography>
              <Typography variant="h4" color="warning.main">
                {timeline.pessimistic}
              </Typography>
              <Typography variant="body2">
                {timeline.unit}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Estimates assume {config.teamSize || 1} developer(s) working full-time with {config.experience || 'intermediate'} experience level.
          </Typography>
        </Alert>
      </Paper>

      {/* Cost Estimate */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AttachMoney />
          <Typography variant="h6">
            Cost Estimate
          </Typography>
        </Box>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Infrastructure (monthly)</Typography>
            <Typography variant="body2" fontWeight="bold">
              ${costs.infrastructure}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Development (one-time)</Typography>
            <Typography variant="body2" fontWeight="bold">
              ${costs.development.toLocaleString()}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight="bold">Total Initial Investment</Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">
              ${costs.total.toLocaleString()}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Potential Challenges
          </Typography>
          <List dense>
            {warnings.map((warning, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon>
                  <Warning color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={warning} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Paper elevation={1} sx={{ p: 3, bgcolor: 'success.50' }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Recommendations
          </Typography>
          <List dense>
            {recommendations.map((rec, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon>
                  <CheckCircle color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rec} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ComplexityEstimator;
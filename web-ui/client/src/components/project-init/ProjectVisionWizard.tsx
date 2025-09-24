import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Stack,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
  Collapse,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Info,
  Business,
  Person,
  TrendingUp,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

interface ProjectVision {
  productType: string;
  productName: string;
  tagline: string;
  problemStatement: string;
  targetAudience: string;
  coreFeatures: string[];
  uniqueValue: string;
  successMetrics: string[];
  constraints: string[];
}

interface ProjectVisionWizardProps {
  vision: Partial<ProjectVision>;
  onChange: (vision: Partial<ProjectVision>) => void;
  projectType?: string;
}

const PRODUCT_TYPES = {
  'e-commerce': {
    label: 'E-commerce Platform',
    examples: ['Online marketplace', 'Product catalog', 'Shopping cart'],
    features: ['Product search', 'Payment processing', 'Order tracking', 'Inventory management']
  },
  'saas': {
    label: 'SaaS Application',
    examples: ['Business tool', 'Productivity app', 'Analytics platform'],
    features: ['User subscriptions', 'Multi-tenancy', 'API access', 'Usage analytics']
  },
  'social': {
    label: 'Social Platform',
    examples: ['Community forum', 'Content sharing', 'Networking app'],
    features: ['User profiles', 'Content feeds', 'Messaging', 'Notifications']
  },
  'marketplace': {
    label: 'Two-sided Marketplace',
    examples: ['Service marketplace', 'Gig economy', 'Rental platform'],
    features: ['Buyer/seller accounts', 'Matching algorithm', 'Reviews', 'Payments']
  },
  'content': {
    label: 'Content Platform',
    examples: ['Blog', 'News site', 'Media streaming', 'Educational'],
    features: ['Content management', 'Publishing workflow', 'Subscriptions', 'Comments']
  },
  'internal': {
    label: 'Internal Tool',
    examples: ['Admin panel', 'Dashboard', 'Workflow automation'],
    features: ['Role-based access', 'Reporting', 'Integrations', 'Audit logs']
  },
  'mobile': {
    label: 'Mobile Application',
    examples: ['iOS/Android app', 'Progressive web app', 'Hybrid app'],
    features: ['Offline mode', 'Push notifications', 'Device features', 'App store deployment']
  },
  'api': {
    label: 'API Service',
    examples: ['REST API', 'GraphQL service', 'Microservice'],
    features: ['Authentication', 'Rate limiting', 'Documentation', 'Webhooks']
  },
};

const SUCCESS_METRICS_SUGGESTIONS = [
  '1000 active users in first month',
  '95% uptime SLA',
  'Page load time < 2 seconds',
  '50+ transactions per day',
  '4.5+ star rating',
  '< 1% error rate',
  '80% user retention',
  '< 5 minute onboarding',
];

const ProjectVisionWizard: React.FC<ProjectVisionWizardProps> = ({
  vision = {},
  onChange,
  projectType,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const [newMetric, setNewMetric] = useState('');
  const [newConstraint, setNewConstraint] = useState('');

  const handleFieldChange = (field: keyof ProjectVision, value: any) => {
    onChange({
      ...vision,
      [field]: value
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      handleFieldChange('coreFeatures', [...(vision.coreFeatures || []), newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const features = [...(vision.coreFeatures || [])];
    features.splice(index, 1);
    handleFieldChange('coreFeatures', features);
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      handleFieldChange('successMetrics', [...(vision.successMetrics || []), newMetric.trim()]);
      setNewMetric('');
    }
  };

  const removeMetric = (index: number) => {
    const metrics = [...(vision.successMetrics || [])];
    metrics.splice(index, 1);
    handleFieldChange('successMetrics', metrics);
  };

  const isVisionComplete = () => {
    return vision.productType && 
           vision.productName && 
           vision.problemStatement && 
           vision.targetAudience && 
           (vision.coreFeatures?.length || 0) >= 3;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Business sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight="bold">
          Define Your Product Vision
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Why Vision Matters
        </Typography>
        <Typography variant="body2">
          A clear product vision ensures your agents understand what you're building, not just how to build it.
          This leads to better architectural decisions and more relevant code generation.
        </Typography>
      </Alert>

      {/* Product Type Selection */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          What are you building?
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Product Type</InputLabel>
          <Select
            value={vision.productType || ''}
            onChange={(e) => handleFieldChange('productType', e.target.value)}
            label="Product Type"
          >
            {Object.entries(PRODUCT_TYPES).map(([key, type]) => (
              <MenuItem key={key} value={key}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {vision.productType && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Examples: {PRODUCT_TYPES[vision.productType as keyof typeof PRODUCT_TYPES].examples.join(', ')}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Basic Product Info */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Product Identity
        </Typography>
        
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Product Name"
            placeholder="e.g., TaskFlow Pro, ShopEasy, DataHub"
            value={vision.productName || ''}
            onChange={(e) => handleFieldChange('productName', e.target.value)}
            helperText="What will users call your product?"
          />
          
          <TextField
            fullWidth
            label="Tagline"
            placeholder="e.g., 'Simplify your workflow', 'Shop smarter, not harder'"
            value={vision.tagline || ''}
            onChange={(e) => handleFieldChange('tagline', e.target.value)}
            helperText="A short, memorable description"
          />
        </Stack>
      </Paper>

      {/* Problem & Audience */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Problem & Audience
        </Typography>
        
        <Stack spacing={2}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Problem Statement"
            placeholder="What problem does your product solve? Be specific about pain points."
            value={vision.problemStatement || ''}
            onChange={(e) => handleFieldChange('problemStatement', e.target.value)}
            helperText="Describe the specific problem you're solving"
          />
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Target Audience"
            placeholder="Who will use this? e.g., 'Small business owners', 'Software developers', 'Students'"
            value={vision.targetAudience || ''}
            onChange={(e) => handleFieldChange('targetAudience', e.target.value)}
            helperText="Define your primary users"
          />
        </Stack>
      </Paper>

      {/* Core Features */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Core Features
        </Typography>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          List 3-5 essential features that define your MVP
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {vision.productType && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Suggested features:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {PRODUCT_TYPES[vision.productType as keyof typeof PRODUCT_TYPES].features.map((feature) => (
                  <Chip
                    key={feature}
                    label={feature}
                    size="small"
                    onClick={() => {
                      if (!vision.coreFeatures?.includes(feature)) {
                        handleFieldChange('coreFeatures', [...(vision.coreFeatures || []), feature]);
                      }
                    }}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
          
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Enter a core feature"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button variant="contained" onClick={addFeature}>Add</Button>
            </Box>
            
            {vision.coreFeatures && vision.coreFeatures.length > 0 && (
              <Box>
                {vision.coreFeatures.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    onDelete={() => removeFeature(index)}
                    sx={{ m: 0.5 }}
                    color="primary"
                  />
                ))}
              </Box>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Unique Value Proposition */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Unique Value Proposition
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="What makes your product different from existing solutions?"
          value={vision.uniqueValue || ''}
          onChange={(e) => handleFieldChange('uniqueValue', e.target.value)}
          helperText="Explain your competitive advantage"
        />
      </Paper>

      {/* Success Metrics */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Success Metrics
        </Typography>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          How will you measure success?
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {SUCCESS_METRICS_SUGGESTIONS.map((metric) => (
              <Chip
                key={metric}
                label={metric}
                size="small"
                onClick={() => {
                  if (!vision.successMetrics?.includes(metric)) {
                    handleFieldChange('successMetrics', [...(vision.successMetrics || []), metric]);
                  }
                }}
                variant="outlined"
              />
            ))}
          </Stack>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Enter a success metric"
              value={newMetric}
              onChange={(e) => setNewMetric(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMetric()}
            />
            <Button variant="contained" onClick={addMetric}>Add</Button>
          </Box>
          
          {vision.successMetrics && vision.successMetrics.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {vision.successMetrics.map((metric, index) => (
                <Chip
                  key={index}
                  label={metric}
                  onDelete={() => removeMetric(index)}
                  sx={{ m: 0.5 }}
                  color="success"
                />
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Vision Completeness Check */}
      {isVisionComplete() ? (
        <Alert severity="success" icon={<CheckCircle />}>
          <Typography variant="body2">
            <strong>Vision Complete!</strong> Your product vision is well-defined and ready to guide development.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" icon={<Warning />}>
          <Typography variant="body2">
            <strong>Incomplete Vision</strong> - Please complete all required fields:
            {!vision.productType && ' Product Type,'}
            {!vision.productName && ' Product Name,'}
            {!vision.problemStatement && ' Problem Statement,'}
            {!vision.targetAudience && ' Target Audience,'}
            {(vision.coreFeatures?.length || 0) < 3 && ` ${3 - (vision.coreFeatures?.length || 0)} more core features`}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ProjectVisionWizard;
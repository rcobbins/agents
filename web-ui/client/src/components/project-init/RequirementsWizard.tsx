import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Stack,
  Button,
  Chip,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Lightbulb,
  QuestionMark,
  People,
  Business,
  TrendingUp,
  Security,
  Speed,
  AttachMoney,
} from '@mui/icons-material';

interface Requirement {
  id: string;
  type: 'functional' | 'non-functional' | 'business' | 'technical';
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  description: string;
  acceptanceCriteria: string[];
  rationale: string;
}

interface ProjectRequirements {
  problemStatement: string;
  targetUsers: string[];
  businessValue: string;
  successCriteria: string[];
  requirements: Requirement[];
  constraints: string[];
  assumptions: string[];
  outOfScope: string[];
}

interface RequirementsWizardProps {
  requirements: Partial<ProjectRequirements>;
  onChange: (requirements: Partial<ProjectRequirements>) => void;
  projectType?: string;
}

const REQUIREMENT_TYPES = {
  functional: {
    label: 'Functional',
    icon: <CheckCircle />,
    color: '#4caf50',
    description: 'What the system should do',
  },
  'non-functional': {
    label: 'Non-Functional',
    icon: <Speed />,
    color: '#ff9800',
    description: 'How the system should perform',
  },
  business: {
    label: 'Business',
    icon: <Business />,
    color: '#2196f3',
    description: 'Business needs and goals',
  },
  technical: {
    label: 'Technical',
    icon: <Security />,
    color: '#9c27b0',
    description: 'Technical constraints and needs',
  },
};

const PRIORITY_LEVELS = {
  'must-have': { label: 'Must Have', color: '#f44336' },
  'should-have': { label: 'Should Have', color: '#ff9800' },
  'nice-to-have': { label: 'Nice to Have', color: '#4caf50' },
};

const REQUIREMENT_TEMPLATES = {
  functional: [
    {
      description: 'User authentication and authorization',
      acceptanceCriteria: [
        'Users can register with email and password',
        'Users can log in and log out',
        'Password reset functionality exists',
        'Sessions expire after inactivity',
      ],
      rationale: 'Secure user access is fundamental for protecting user data',
    },
    {
      description: 'Data CRUD operations',
      acceptanceCriteria: [
        'Users can create new records',
        'Users can read/view existing records',
        'Users can update their own records',
        'Users can delete their own records',
      ],
      rationale: 'Core functionality for data management',
    },
  ],
  'non-functional': [
    {
      description: 'Page load time under 2 seconds',
      acceptanceCriteria: [
        '95th percentile page load < 2s',
        'API responses < 200ms',
        'Assets are optimized and cached',
      ],
      rationale: 'User experience degrades significantly with slow load times',
    },
    {
      description: '99.9% uptime availability',
      acceptanceCriteria: [
        'System available 99.9% of the time',
        'Automated health checks every minute',
        'Failover mechanisms in place',
      ],
      rationale: 'High availability ensures business continuity',
    },
  ],
  business: [
    {
      description: 'Support 1000 concurrent users',
      acceptanceCriteria: [
        'System handles 1000 simultaneous connections',
        'Response times remain consistent under load',
        'No data loss under peak load',
      ],
      rationale: 'Expected user base requires this scale',
    },
  ],
  technical: [
    {
      description: 'GDPR compliance for data handling',
      acceptanceCriteria: [
        'User data can be exported on request',
        'User data can be deleted on request',
        'Data privacy policies are implemented',
        'Consent mechanisms are in place',
      ],
      rationale: 'Legal requirement for handling EU user data',
    },
  ],
};

const RequirementsWizard: React.FC<RequirementsWizardProps> = ({
  requirements = {},
  onChange,
  projectType,
}) => {
  const [newRequirement, setNewRequirement] = useState<Partial<Requirement>>({
    type: 'functional',
    priority: 'should-have',
    description: '',
    acceptanceCriteria: [],
    rationale: '',
  });
  const [newCriterion, setNewCriterion] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newSuccessCriterion, setNewSuccessCriterion] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const [newAssumption, setNewAssumption] = useState('');
  const [newOutOfScope, setNewOutOfScope] = useState('');

  const handleFieldChange = (field: keyof ProjectRequirements, value: any) => {
    onChange({
      ...requirements,
      [field]: value,
    });
  };

  const addRequirement = () => {
    if (newRequirement.description?.trim()) {
      const requirement: Requirement = {
        id: `req-${Date.now()}`,
        type: newRequirement.type || 'functional',
        priority: newRequirement.priority || 'should-have',
        description: newRequirement.description.trim(),
        acceptanceCriteria: newRequirement.acceptanceCriteria || [],
        rationale: newRequirement.rationale?.trim() || '',
      };
      handleFieldChange('requirements', [
        ...(requirements.requirements || []),
        requirement,
      ]);
      setNewRequirement({
        type: 'functional',
        priority: 'should-have',
        description: '',
        acceptanceCriteria: [],
        rationale: '',
      });
    }
  };

  const removeRequirement = (id: string) => {
    handleFieldChange(
      'requirements',
      (requirements.requirements || []).filter(r => r.id !== id)
    );
  };

  const addAcceptanceCriterion = () => {
    if (newCriterion.trim()) {
      setNewRequirement({
        ...newRequirement,
        acceptanceCriteria: [
          ...(newRequirement.acceptanceCriteria || []),
          newCriterion.trim(),
        ],
      });
      setNewCriterion('');
    }
  };

  const applyTemplate = (template: any) => {
    setNewRequirement({
      ...newRequirement,
      ...template,
      acceptanceCriteria: [...template.acceptanceCriteria],
    });
  };

  const addTargetUser = () => {
    if (newUser.trim()) {
      handleFieldChange('targetUsers', [
        ...(requirements.targetUsers || []),
        newUser.trim(),
      ]);
      setNewUser('');
    }
  };

  const addSuccessCriterion = () => {
    if (newSuccessCriterion.trim()) {
      handleFieldChange('successCriteria', [
        ...(requirements.successCriteria || []),
        newSuccessCriterion.trim(),
      ]);
      setNewSuccessCriterion('');
    }
  };

  const isRequirementsComplete = () => {
    return (
      requirements.problemStatement &&
      (requirements.targetUsers?.length || 0) > 0 &&
      requirements.businessValue &&
      (requirements.successCriteria?.length || 0) > 0 &&
      (requirements.requirements?.length || 0) > 0
    );
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Requirements-First Approach</strong>
        </Typography>
        <Typography variant="body2">
          Focus on <strong>what</strong> needs to be built and <strong>why</strong> it matters,
          before deciding <strong>how</strong> to build it. This helps agents understand the true
          goals and make better implementation decisions.
        </Typography>
      </Alert>

      {/* Problem Statement */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <QuestionMark sx={{ mr: 1, verticalAlign: 'middle' }} />
          What Problem Are We Solving?
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Describe the problem this project will solve..."
          value={requirements.problemStatement || ''}
          onChange={(e) => handleFieldChange('problemStatement', e.target.value)}
          helperText="Be specific about the pain points and challenges"
        />
      </Paper>

      {/* Target Users */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <People sx={{ mr: 1, verticalAlign: 'middle' }} />
          Who Are The Target Users?
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="e.g., Small business owners, Students, Healthcare professionals..."
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTargetUser()}
            />
            <Button variant="contained" onClick={addTargetUser}>
              Add
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(requirements.targetUsers || []).map((user, index) => (
              <Chip
                key={index}
                label={user}
                onDelete={() => {
                  const users = [...(requirements.targetUsers || [])];
                  users.splice(index, 1);
                  handleFieldChange('targetUsers', users);
                }}
              />
            ))}
          </Box>
        </Stack>
      </Paper>

      {/* Business Value */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
          Why Is This Worth Building?
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Describe the business value and expected impact..."
          value={requirements.businessValue || ''}
          onChange={(e) => handleFieldChange('businessValue', e.target.value)}
          helperText="What value does this bring to users or the business?"
        />
      </Paper>

      {/* Success Criteria */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
          How Will We Know It's Successful?
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="e.g., 1000 active users, 95% uptime, < 2s load time..."
              value={newSuccessCriterion}
              onChange={(e) => setNewSuccessCriterion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSuccessCriterion()}
            />
            <Button variant="contained" onClick={addSuccessCriterion}>
              Add
            </Button>
          </Box>
          <List dense>
            {(requirements.successCriteria || []).map((criterion, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => {
                      const criteria = [...(requirements.successCriteria || [])];
                      criteria.splice(index, 1);
                      handleFieldChange('successCriteria', criteria);
                    }}
                  >
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText primary={criterion} />
              </ListItem>
            ))}
          </List>
        </Stack>
      </Paper>

      {/* Detailed Requirements */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Detailed Requirements
        </Typography>
        
        {/* Requirement Templates */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>
              <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
              Use a Template
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {Object.entries(REQUIREMENT_TEMPLATES).map(([type, templates]) => (
                <Grid item xs={12} md={6} key={type}>
                  <Typography variant="subtitle2" gutterBottom>
                    {REQUIREMENT_TYPES[type as keyof typeof REQUIREMENT_TYPES].label}
                  </Typography>
                  <Stack spacing={1}>
                    {templates.map((template, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                        onClick={() => applyTemplate({ ...template, type })}
                      >
                        {template.description.substring(0, 40)}...
                      </Button>
                    ))}
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Add New Requirement */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={newRequirement.type || 'functional'}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, type: e.target.value as any })
                  }
                  label="Type"
                >
                  {Object.entries(REQUIREMENT_TYPES).map(([key, type]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newRequirement.priority || 'should-have'}
                  onChange={(e) =>
                    setNewRequirement({ ...newRequirement, priority: e.target.value as any })
                  }
                  label="Priority"
                >
                  {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                    <MenuItem key={key} value={key}>
                      <Chip
                        label={priority.label}
                        size="small"
                        sx={{ bgcolor: priority.color, color: 'white' }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Requirement Description"
            placeholder="What specifically needs to be built or achieved?"
            value={newRequirement.description || ''}
            onChange={(e) =>
              setNewRequirement({ ...newRequirement, description: e.target.value })
            }
          />
          
          <TextField
            fullWidth
            label="Rationale"
            placeholder="Why is this requirement important?"
            value={newRequirement.rationale || ''}
            onChange={(e) =>
              setNewRequirement({ ...newRequirement, rationale: e.target.value })
            }
          />
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Acceptance Criteria
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="How will we know this requirement is met?"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAcceptanceCriterion()}
              />
              <Button size="small" onClick={addAcceptanceCriterion}>
                Add
              </Button>
            </Box>
            <List dense>
              {(newRequirement.acceptanceCriteria || []).map((criterion, index) => (
                <ListItem
                  key={index}
                  dense
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => {
                        const criteria = [...(newRequirement.acceptanceCriteria || [])];
                        criteria.splice(index, 1);
                        setNewRequirement({ ...newRequirement, acceptanceCriteria: criteria });
                      }}
                    >
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemText primary={criterion} />
                </ListItem>
              ))}
            </List>
          </Box>
          
          <Button
            variant="contained"
            onClick={addRequirement}
            disabled={!newRequirement.description?.trim()}
            startIcon={<Add />}
          >
            Add Requirement
          </Button>
        </Stack>

        {/* Requirements List */}
        <List>
          {(requirements.requirements || []).map((req) => (
            <React.Fragment key={req.id}>
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeRequirement(req.id)}>
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {REQUIREMENT_TYPES[req.type].icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">{req.description}</Typography>
                      <Chip
                        label={PRIORITY_LEVELS[req.priority].label}
                        size="small"
                        sx={{
                          bgcolor: PRIORITY_LEVELS[req.priority].color,
                          color: 'white',
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      {req.rationale && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Rationale:</strong> {req.rationale}
                        </Typography>
                      )}
                      {req.acceptanceCriteria.length > 0 && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Acceptance Criteria:</strong>
                          </Typography>
                          <List dense sx={{ ml: 2 }}>
                            {req.acceptanceCriteria.map((criterion, index) => (
                              <ListItem key={index} dense sx={{ py: 0 }}>
                                <ListItemText
                                  primary={`• ${criterion}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Constraints and Assumptions */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>
            Constraints, Assumptions & Out of Scope
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Constraints
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g., Budget limit, Timeline..."
                  value={newConstraint}
                  onChange={(e) => setNewConstraint(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newConstraint.trim()) {
                      handleFieldChange('constraints', [
                        ...(requirements.constraints || []),
                        newConstraint.trim(),
                      ]);
                      setNewConstraint('');
                    }
                  }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (newConstraint.trim()) {
                      handleFieldChange('constraints', [
                        ...(requirements.constraints || []),
                        newConstraint.trim(),
                      ]);
                      setNewConstraint('');
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
              <Stack spacing={1}>
                {(requirements.constraints || []).map((constraint, index) => (
                  <Chip
                    key={index}
                    label={constraint}
                    size="small"
                    onDelete={() => {
                      const items = [...(requirements.constraints || [])];
                      items.splice(index, 1);
                      handleFieldChange('constraints', items);
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Assumptions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g., Users have internet access..."
                  value={newAssumption}
                  onChange={(e) => setNewAssumption(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newAssumption.trim()) {
                      handleFieldChange('assumptions', [
                        ...(requirements.assumptions || []),
                        newAssumption.trim(),
                      ]);
                      setNewAssumption('');
                    }
                  }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (newAssumption.trim()) {
                      handleFieldChange('assumptions', [
                        ...(requirements.assumptions || []),
                        newAssumption.trim(),
                      ]);
                      setNewAssumption('');
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
              <Stack spacing={1}>
                {(requirements.assumptions || []).map((assumption, index) => (
                  <Chip
                    key={index}
                    label={assumption}
                    size="small"
                    onDelete={() => {
                      const items = [...(requirements.assumptions || [])];
                      items.splice(index, 1);
                      handleFieldChange('assumptions', items);
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Out of Scope
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g., Mobile app, Payment processing..."
                  value={newOutOfScope}
                  onChange={(e) => setNewOutOfScope(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newOutOfScope.trim()) {
                      handleFieldChange('outOfScope', [
                        ...(requirements.outOfScope || []),
                        newOutOfScope.trim(),
                      ]);
                      setNewOutOfScope('');
                    }
                  }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (newOutOfScope.trim()) {
                      handleFieldChange('outOfScope', [
                        ...(requirements.outOfScope || []),
                        newOutOfScope.trim(),
                      ]);
                      setNewOutOfScope('');
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
              <Stack spacing={1}>
                {(requirements.outOfScope || []).map((item, index) => (
                  <Chip
                    key={index}
                    label={item}
                    size="small"
                    onDelete={() => {
                      const items = [...(requirements.outOfScope || [])];
                      items.splice(index, 1);
                      handleFieldChange('outOfScope', items);
                    }}
                  />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Completion Status */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mt: 3,
          bgcolor: isRequirementsComplete() ? 'success.light' : 'warning.light',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isRequirementsComplete() ? (
            <>
              <CheckCircle color="success" />
              <Typography>
                Requirements are complete! Agents will have clear understanding of what to build.
              </Typography>
            </>
          ) : (
            <>
              <Warning color="warning" />
              <Typography>
                Please complete all required sections to help agents understand the project requirements.
              </Typography>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default RequirementsWizard;
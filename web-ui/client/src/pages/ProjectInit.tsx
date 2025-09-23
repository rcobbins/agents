import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
  Box,
  Typography,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const steps = [
  'Basic Information',
  'Technology Stack',
  'Project Structure',
  'Goals & Objectives',
  'Testing Strategy',
  'Architecture',
  'Review & Create',
];

function ProjectInit() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [projectData, setProjectData] = useState<any>({
    name: '',
    description: '',
    path: '',
    techStack: [],
    structure: {
      directories: [],
      entryPoint: '',
    },
    goals: [],
    testing: {
      framework: '',
      coverage: 80,
    },
    architecture: {
      type: 'monolithic',
      components: [],
    },
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const handleCreateProject = async () => {
    try {
      const response = await api.post('/projects', projectData);
      toast.success('Project created successfully!');
      navigate(`/project/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create project');
    }
  };

  const updateProjectData = (field: string, value: any) => {
    setProjectData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Basic Information
        return (
          <Box>
            <TextField
              fullWidth
              label="Project Name"
              value={projectData.name}
              onChange={(e) => updateProjectData('name', e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={projectData.description}
              onChange={(e) => updateProjectData('description', e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Project Path"
              value={projectData.path}
              onChange={(e) => updateProjectData('path', e.target.value)}
              margin="normal"
              required
              helperText="Absolute path to your project directory"
            />
          </Box>
        );

      case 1: // Technology Stack
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Add technologies used in your project
            </Typography>
            <TextField
              fullWidth
              label="Add Technology"
              margin="normal"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) {
                    updateProjectData('techStack', [...projectData.techStack, value]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              helperText="Press Enter to add"
            />
            <Box mt={2}>
              {projectData.techStack.map((tech: string, index: number) => (
                <Chip
                  key={index}
                  label={tech}
                  onDelete={() => {
                    const newStack = projectData.techStack.filter((_: any, i: number) => i !== index);
                    updateProjectData('techStack', newStack);
                  }}
                  style={{ margin: 4 }}
                />
              ))}
            </Box>
          </Box>
        );

      case 2: // Project Structure
        return (
          <Box>
            <TextField
              fullWidth
              label="Entry Point"
              value={projectData.structure.entryPoint}
              onChange={(e) =>
                updateProjectData('structure', {
                  ...projectData.structure,
                  entryPoint: e.target.value,
                })
              }
              margin="normal"
              helperText="e.g., src/index.js, main.py"
            />
            <TextField
              fullWidth
              label="Add Directory"
              margin="normal"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) {
                    updateProjectData('structure', {
                      ...projectData.structure,
                      directories: [...projectData.structure.directories, value],
                    });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              helperText="Press Enter to add important directories"
            />
            <Box mt={2}>
              {projectData.structure.directories.map((dir: string, index: number) => (
                <Chip
                  key={index}
                  label={dir}
                  onDelete={() => {
                    const newDirs = projectData.structure.directories.filter(
                      (_: any, i: number) => i !== index
                    );
                    updateProjectData('structure', {
                      ...projectData.structure,
                      directories: newDirs,
                    });
                  }}
                  style={{ margin: 4 }}
                />
              ))}
            </Box>
          </Box>
        );

      case 3: // Goals & Objectives
        return (
          <Box>
            <Typography variant="body2" gutterBottom>
              Define project goals for agents to work towards
            </Typography>
            <TextField
              fullWidth
              label="Add Goal"
              margin="normal"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) {
                    const newGoal = {
                      id: `goal-${Date.now()}`,
                      description: value,
                      status: 'pending',
                      priority: 'medium',
                    };
                    updateProjectData('goals', [...projectData.goals, newGoal]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              helperText="Press Enter to add a goal"
            />
            <Box mt={2}>
              {projectData.goals.map((goal: any) => (
                <Card key={goal.id} style={{ marginBottom: 8 }}>
                  <CardContent>
                    <Typography variant="body1">{goal.description}</Typography>
                    <Chip
                      label={goal.priority}
                      size="small"
                      color="primary"
                      style={{ marginTop: 8 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        );

      case 4: // Testing Strategy
        return (
          <Box>
            <TextField
              fullWidth
              label="Testing Framework"
              value={projectData.testing.framework}
              onChange={(e) =>
                updateProjectData('testing', {
                  ...projectData.testing,
                  framework: e.target.value,
                })
              }
              margin="normal"
              helperText="e.g., Jest, Pytest, Mocha"
            />
            <TextField
              fullWidth
              label="Coverage Target (%)"
              type="number"
              value={projectData.testing.coverage}
              onChange={(e) =>
                updateProjectData('testing', {
                  ...projectData.testing,
                  coverage: parseInt(e.target.value),
                })
              }
              margin="normal"
              inputProps={{ min: 0, max: 100 }}
            />
          </Box>
        );

      case 5: // Architecture
        return (
          <Box>
            <FormControl fullWidth margin="normal">
              <InputLabel>Architecture Type</InputLabel>
              <Select
                value={projectData.architecture.type}
                onChange={(e) =>
                  updateProjectData('architecture', {
                    ...projectData.architecture,
                    type: e.target.value,
                  })
                }
              >
                <MenuItem value="monolithic">Monolithic</MenuItem>
                <MenuItem value="microservices">Microservices</MenuItem>
                <MenuItem value="serverless">Serverless</MenuItem>
                <MenuItem value="modular">Modular</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Add Component"
              margin="normal"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) {
                    updateProjectData('architecture', {
                      ...projectData.architecture,
                      components: [...projectData.architecture.components, value],
                    });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              helperText="Press Enter to add architectural components"
            />
            <Box mt={2}>
              {projectData.architecture.components.map((comp: string, index: number) => (
                <Chip key={index} label={comp} style={{ margin: 4 }} />
              ))}
            </Box>
          </Box>
        );

      case 6: // Review
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Basic Info</Typography>
                <Typography variant="body2">Name: {projectData.name}</Typography>
                <Typography variant="body2">Path: {projectData.path}</Typography>
                <Typography variant="body2">Description: {projectData.description}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Technology Stack</Typography>
                <Box>
                  {projectData.techStack.map((tech: string) => (
                    <Chip key={tech} label={tech} size="small" style={{ margin: 2 }} />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1">Goals ({projectData.goals.length})</Typography>
                {projectData.goals.map((goal: any) => (
                  <Typography key={goal.id} variant="body2">
                    • {goal.description}
                  </Typography>
                ))}
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Initialize New Project
      </Typography>
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleCreateProject : handleNext}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Create Project' : 'Continue'}
                  </Button>
                  <Button disabled={index === 0} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
}

export default ProjectInit;
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  Collapse,
  LinearProgress,
  Stack,
  Fade,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  Save,
  HelpOutline,
  AutoAwesome,
  Engineering,
} from '@mui/icons-material';
import { api } from '../services/api';
import toast from 'react-hot-toast';

// Import all the new components
import ModeSelector from '../components/project-init/ModeSelector';
import ProjectBasicInfo from '../components/project-init/ProjectBasicInfo';
import ProjectTypeSelector from '../components/project-init/ProjectTypeSelector';
import TemplateChooser from '../components/project-init/TemplateChooser';
import SmartTechStackBuilder from '../components/project-init/SmartTechStackBuilder';
import GoalsWizard from '../components/project-init/GoalsWizard';
import TestingStrategyGuide from '../components/project-init/TestingStrategyGuide';
import ArchitectureHelper from '../components/project-init/ArchitectureHelper';
import ComplexityEstimator from '../components/project-init/ComplexityEstimator';
import ReviewWithValidation from '../components/project-init/ReviewWithValidation';
import ProjectVisionWizard from '../components/project-init/ProjectVisionWizard';
import RequirementsWizard from '../components/project-init/RequirementsWizard';
import CustomStepper from '../components/project-init/CustomStepper';

// Import types
import { ProjectConfig } from '../types/project';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../data/projectTemplates';

const STEPS_GUIDED = [
  { label: 'Setup Mode', id: 'mode' },
  { label: 'Project Vision', id: 'vision' },
  { label: 'Requirements', id: 'requirements' },
  { label: 'Basic Info', id: 'info' },
  { label: 'Project Type', id: 'type' },
  { label: 'Choose Template', id: 'template' },
  { label: 'Project Goals', id: 'goals' },
  { label: 'Technology Stack', id: 'techstack' },
  { label: 'Testing Strategy', id: 'testing' },
  { label: 'Architecture', id: 'architecture' },
  { label: 'Complexity Analysis', id: 'complexity' },
  { label: 'Review & Generate', id: 'review' },
];

const STEPS_EXPERT = [
  { label: 'Configuration', id: 'config' },
  { label: 'Review & Generate', id: 'review' },
];

function ProjectInit() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'guided' | 'expert'>('guided');
  const [activeStep, setActiveStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskCustomizationStatus, setTaskCustomizationStatus] = useState<{
    status: 'idle' | 'starting' | 'completed' | 'error';
    message: string;
    taskCount?: number;
    distribution?: Record<string, number>;
  }>({ status: 'idle', message: '' });
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const { socket } = useSocket();
  
  // Project configuration state
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    name: '',
    type: '',
    description: '',
    path: '',
    techStack: [],
    goals: [],
    vision: {},
    requirements: {},
    testingStrategy: {
      unitTestCoverage: 70,
      integrationTesting: false,
      e2eTesting: false,
      performanceTesting: false,
      securityTesting: false,
      accessibilityTesting: false,
      cicd: false,
      frameworks: [],
      automationLevel: 'semi-auto',
    },
    architecture: {
      pattern: 'monolithic',
      database: 'sql',
      deployment: 'cloud',
      scaling: 'vertical',
      apiStyle: 'rest',
      features: [],
    },
    teamSize: 1,
    timeframe: '3 months',
  });

  const steps = mode === 'guided' ? STEPS_GUIDED : STEPS_EXPERT;

  const handleNext = useCallback(() => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeStep, steps.length]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeStep]);

  const handleStepClick = useCallback((stepIndex: number) => {
    setActiveStep(stepIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleProjectTypeSelect = useCallback((type: string) => {
    setProjectConfig(prev => ({ ...prev, type }));
    
    // Auto-advance in guided mode
    if (mode === 'guided') {
      setTimeout(handleNext, 500);
    }
  }, [mode, handleNext]);

  const handleTemplateSelect = useCallback((template: ProjectTemplate) => {
    setProjectConfig(prev => ({
      ...prev,
      name: template.name,
      type: template.category, // Set project type from template category
      description: template.description,
      techStack: template.techStack,
      vision: template.vision || {},
      requirements: template.requirements || {},
      goals: template.goals.map((goal, index) => ({
        id: `goal-${index}`,
        description: goal.description,
        priority: goal.priority,
        status: goal.status || 'pending',
        acceptanceCriteria: goal.acceptanceCriteria || [],
        category: 'custom' as const,
        metrics: [],
      })),
      architecture: {
        ...prev.architecture,
        pattern: (template.architecture as any).type || (template.architecture as any).pattern || 'monolithic',
        components: template.architecture.components || [],
      },
      testingStrategy: {
        ...prev.testingStrategy,
        unitTestCoverage: template.testing.coverage,
        frameworks: template.testing.framework ? [template.testing.framework] : [],
      },
    }));
    
    // Auto-advance
    setTimeout(handleNext, 500);
  }, [handleNext]);

  const handleSkipTemplate = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const handleEditSection = useCallback((section: string) => {
    const stepIndex = steps.findIndex(s => s.id === section);
    if (stepIndex >= 0) {
      setActiveStep(stepIndex);
    }
  }, [steps]);

  const handleGenerateProject = async () => {
    setIsGenerating(true);
    setTaskCustomizationStatus({ status: 'idle', message: 'Initializing project...' });
    
    try {
      // Prepare the project data
      const projectData = {
        ...projectConfig,
        mode,
        createdAt: new Date().toISOString(),
      };

      // Call the API to create the project
      const response = await api.post('/projects', projectData);
      const projectId = response.data.id;
      
      // Set up listener for task customization events
      const handleTaskCustomization = (data: any) => {
        if (data.projectId === projectId) {
          setTaskCustomizationStatus({
            status: data.status,
            message: data.message,
            taskCount: data.taskCount,
            distribution: data.distribution,
          });
          
          // Show toast notifications for key events
          if (data.status === 'completed') {
            toast.success(`Generated ${data.taskCount} customized tasks!`);
            // Navigate after tasks are ready
            setTimeout(() => {
              navigate(`/project/${projectId}`);
            }, 2000);
          } else if (data.status === 'error') {
            toast.warning('Using default tasks - customization failed');
            // Still navigate but with warning
            setTimeout(() => {
              navigate(`/project/${projectId}`);
            }, 2000);
          }
        }
      };
      
      // Listen for task customization events
      if (socket) {
        socket.on('project:taskCustomization', handleTaskCustomization);
      }
      
      toast.success('Project created! Customizing tasks... 🎯');
      
      // Clean up listener after navigation
      return () => {
        if (socket) {
          socket.off('project:taskCustomization', handleTaskCustomization);
        }
      };
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.error || 'Failed to create project');
      setIsGenerating(false);
    }
  };

  const handleSaveAsTemplate = useCallback(() => {
    try {
      const templateData = {
        ...projectConfig,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(`project-template-${Date.now()}`, JSON.stringify(templateData));
      toast.success('Template saved successfully!');
    } catch (error) {
      toast.error('Failed to save template');
    }
  }, [projectConfig]);

  const getStepContent = useCallback((step: number) => {
    const stepId = steps[step].id;

    switch (stepId) {
      case 'mode':
        return (
          <ModeSelector
            mode={mode}
            onChange={setMode}
            experience={experience}
          />
        );

      case 'vision':
        return (
          <ProjectVisionWizard
            vision={projectConfig.vision || {}}
            onChange={(vision) => 
              setProjectConfig(prev => ({ ...prev, vision }))
            }
            projectType={projectConfig.type}
          />
        );

      case 'requirements':
        return (
          <RequirementsWizard
            requirements={projectConfig.requirements || {}}
            onChange={(requirements) => 
              setProjectConfig(prev => ({ ...prev, requirements }))
            }
            projectType={projectConfig.type}
          />
        );

      case 'info':
        return (
          <ProjectBasicInfo
            name={projectConfig.name}
            path={projectConfig.path}
            description={projectConfig.description}
            onChange={(field, value) => 
              setProjectConfig(prev => ({ ...prev, [field]: value }))
            }
          />
        );

      case 'type':
        return (
          <ProjectTypeSelector
            selected={projectConfig.type}
            onSelect={handleProjectTypeSelect}
            showHelper={mode === 'guided'}
          />
        );

      case 'template':
        return (
          <TemplateChooser
            projectType={projectConfig.type}
            onSelect={handleTemplateSelect}
            onSkip={handleSkipTemplate}
          />
        );

      case 'techstack':
        return (
          <SmartTechStackBuilder
            selectedStack={projectConfig.techStack}
            onStackChange={(stack) => setProjectConfig(prev => ({ ...prev, techStack: stack }))}
            projectType={projectConfig.type}
            showSuggestions={mode === 'guided'}
          />
        );

      case 'goals':
        return (
          <GoalsWizard
            goals={projectConfig.goals || []}
            onChange={(goals) => setProjectConfig(prev => ({ ...prev, goals }))}
            projectType={projectConfig.type}
            showSuggestions={mode === 'guided'}
          />
        );

      case 'testing':
        return (
          <TestingStrategyGuide
            config={projectConfig.testingStrategy}
            onChange={(testingStrategy) => setProjectConfig(prev => ({ ...prev, testingStrategy }))}
            projectType={projectConfig.type}
            techStack={projectConfig.techStack}
          />
        );

      case 'architecture':
        return (
          <ArchitectureHelper
            config={projectConfig.architecture}
            onChange={(architecture) => setProjectConfig(prev => ({ ...prev, architecture }))}
            projectType={projectConfig.type}
            techStack={projectConfig.techStack}
          />
        );

      case 'complexity':
        return (
          <ComplexityEstimator
            config={{
              projectType: projectConfig.type,
              techStack: projectConfig.techStack,
              features: projectConfig.architecture.features,
              teamSize: projectConfig.teamSize,
              experience,
              architecture: projectConfig.architecture.pattern,
              testing: {
                unitTestCoverage: projectConfig.testingStrategy.unitTestCoverage,
                e2eTesting: projectConfig.testingStrategy.e2eTesting,
                integrationTesting: projectConfig.testingStrategy.integrationTesting,
              },
              goals: projectConfig.goals,
            }}
          />
        );

      case 'config':
        // Expert mode: show all configurations in one page
        return (
          <Stack spacing={4}>
            <ProjectBasicInfo
              name={projectConfig.name}
              path={projectConfig.path}
              description={projectConfig.description}
              onChange={(field, value) => 
                setProjectConfig(prev => ({ ...prev, [field]: value }))
              }
            />
            <ProjectTypeSelector
              selected={projectConfig.type}
              onSelect={(type) => setProjectConfig(prev => ({ ...prev, type }))}
              showHelper={false}
            />
            <SmartTechStackBuilder
              selectedStack={projectConfig.techStack}
              onStackChange={(stack) => setProjectConfig(prev => ({ ...prev, techStack: stack }))}
              projectType={projectConfig.type}
              showSuggestions={false}
            />
            <GoalsWizard
              goals={projectConfig.goals || []}
              onChange={(goals) => setProjectConfig(prev => ({ ...prev, goals }))}
              projectType={projectConfig.type}
              showSuggestions={false}
            />
            <TestingStrategyGuide
              config={projectConfig.testingStrategy}
              onChange={(testingStrategy) => setProjectConfig(prev => ({ ...prev, testingStrategy }))}
              projectType={projectConfig.type}
              techStack={projectConfig.techStack}
            />
            <ArchitectureHelper
              config={projectConfig.architecture}
              onChange={(architecture) => setProjectConfig(prev => ({ ...prev, architecture }))}
              projectType={projectConfig.type}
              techStack={projectConfig.techStack}
            />
          </Stack>
        );

      case 'review':
        return (
          <ReviewWithValidation
            config={projectConfig}
            onEdit={handleEditSection}
            onGenerate={handleGenerateProject}
            onSave={handleSaveAsTemplate}
            isGenerating={isGenerating}
            taskCustomizationStatus={taskCustomizationStatus}
          />
        );

      default:
        return null;
    }
  }, [
    steps,
    mode,
    experience,
    projectConfig,
    isGenerating,
    handleProjectTypeSelect,
    handleTemplateSelect,
    handleSkipTemplate,
    handleEditSection,
    handleGenerateProject,
    handleSaveAsTemplate,
  ]);

  const isStepCompleted = useCallback((stepId: string): boolean => {
    switch (stepId) {
      case 'mode': return true;
      case 'info': return !!projectConfig.name && !!projectConfig.path;
      case 'type': return !!projectConfig.type;
      case 'template': return true; // Optional step
      case 'techstack': return projectConfig.techStack.length > 0;
      case 'goals': return (projectConfig.goals?.length || 0) > 0;
      case 'testing': return !!projectConfig.testingStrategy;
      case 'architecture': return !!projectConfig.architecture;
      case 'complexity': return true; // View-only step
      case 'config': return !!projectConfig.type && projectConfig.techStack.length > 0;
      case 'review': return true;
      default: return false;
    }
  }, [projectConfig]);

  const canProceed = useMemo(() => {
    if (!steps[activeStep]) return false;
    const currentStepId = steps[activeStep].id;
    return isStepCompleted(currentStepId) || currentStepId === 'template' || currentStepId === 'complexity';
  }, [steps, activeStep, isStepCompleted]);

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, overflowX: 'hidden' }}>
      <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            gap: 2,
            mb: 2 
          }}>
            <Typography 
              variant="h3" 
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}
            >
              Create New Project
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AutoAwesome />}
              onClick={() => {
                // Load the demo template
                const demoTemplate = PROJECT_TEMPLATES['init-demo'];
                // Set the project config with ALL fields from demo
                setProjectConfig(prev => ({
                  ...prev,
                  name: demoTemplate.name,
                  type: demoTemplate.category, // Set the project type from template category
                  path: `~/projects/${demoTemplate.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
                  description: demoTemplate.description,
                  techStack: demoTemplate.techStack,
                  // Copy vision if it exists
                  vision: demoTemplate.vision || {},
                  // Copy requirements if they exist
                  requirements: demoTemplate.requirements || {},
                  // Map goals with correct field names and all properties
                  goals: demoTemplate.goals.map((goal, index) => ({
                    id: `goal-${index}`,
                    description: goal.description, // Use 'description' not 'text'
                    priority: goal.priority,
                    status: goal.status || 'pending',
                    acceptanceCriteria: goal.acceptanceCriteria || [],
                    category: 'custom' as const,
                    metrics: [],
                  })),
                  architecture: {
                    ...prev.architecture,
                    pattern: (demoTemplate.architecture as any).type || (demoTemplate.architecture as any).pattern || 'monolithic',
                    components: demoTemplate.architecture.components || [],
                  },
                  testingStrategy: {
                    ...prev.testingStrategy,
                    unitTestCoverage: demoTemplate.testing.coverage,
                    frameworks: demoTemplate.testing.framework ? [demoTemplate.testing.framework] : [],
                  },
                }));
                toast.success('Demo project loaded! All fields populated including vision and requirements.');
                // Jump directly to review step
                setActiveStep(steps.length - 1);
              }}
            >
              Load Demo Project
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Let's set up your project with the right architecture, technologies, and best practices.
          </Typography>
        </Box>

        <Box>
          {/* Main Content */}
          <Box sx={{ width: '100%' }}>
            {/* Progress Indicator with Label */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: 'var(--font-sm)' }}
                >
                  {steps[activeStep]?.label || 'Step'}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: 'var(--font-sm)' }}
                >
                  {activeStep + 1} of {steps.length}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(activeStep / (steps.length - 1)) * 100}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>

            {/* Custom Stepper */}
            {mode === 'guided' && (
              <Paper elevation={1} sx={{ 
                mb: { xs: 2, sm: 3 },
                bgcolor: 'background.paper',
                overflow: 'visible'
              }}>
                <CustomStepper
                  steps={steps}
                  activeStep={activeStep}
                  isStepCompleted={isStepCompleted}
                  onStepClick={handleStepClick}
                />
              </Paper>
            )}

            {/* Step Content */}
            <Fade in key={activeStep}>
              <Paper elevation={2} sx={{ 
                p: { xs: 2, sm: 3, md: 4 },
                overflow: 'hidden'
              }}>
                {getStepContent(activeStep)}
              </Paper>
            </Fade>

            {/* Navigation */}
            <Box sx={{ 
              mt: 3, 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              gap: 2
            }}>
              <Button
                startIcon={<NavigateBefore />}
                onClick={handleBack}
                disabled={activeStep === 0}
                size="large"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Back
              </Button>

              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                justifyContent: { xs: 'space-between', sm: 'flex-end' },
                width: { xs: '100%', sm: 'auto' }
              }}>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGenerateProject}
                    disabled={isGenerating}
                    startIcon={isGenerating ? null : <AutoAwesome />}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Project'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    endIcon={<NavigateNext />}
                    onClick={handleNext}
                    disabled={!canProceed}
                    size="large"
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Continue
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

        </Box>
      </Box>
    </Box>
  );
}

export default ProjectInit;
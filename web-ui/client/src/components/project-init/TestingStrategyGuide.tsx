import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Slider,
  Stack,
  Chip,
  Alert,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  ExpandMore,
  BugReport,
  Speed,
  Security,
  Timeline,
  Code,
  IntegrationInstructions,
  CloudDone,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';

interface TestingConfig {
  unitTestCoverage: number;
  integrationTesting: boolean;
  e2eTesting: boolean;
  performanceTesting: boolean;
  securityTesting: boolean;
  accessibilityTesting: boolean;
  cicd: boolean;
  frameworks: string[];
  automationLevel: 'manual' | 'semi-auto' | 'full-auto';
}

interface TestingStrategyGuideProps {
  config: TestingConfig;
  onChange: (config: TestingConfig) => void;
  projectType?: string;
  techStack?: string[];
}

const TESTING_FRAMEWORKS = {
  javascript: {
    unit: ['Jest', 'Vitest', 'Mocha', 'Jasmine'],
    e2e: ['Cypress', 'Playwright', 'Selenium', 'Puppeteer'],
    integration: ['Supertest', 'Testing Library'],
  },
  python: {
    unit: ['pytest', 'unittest', 'nose2'],
    e2e: ['Selenium', 'Playwright'],
    integration: ['pytest-django', 'FastAPI TestClient'],
  },
  java: {
    unit: ['JUnit', 'TestNG', 'Mockito'],
    e2e: ['Selenium', 'Cucumber'],
    integration: ['Spring Boot Test', 'REST Assured'],
  },
};

const TestingStrategyGuide: React.FC<TestingStrategyGuideProps> = ({
  config,
  onChange,
  projectType,
  techStack = [],
}) => {
  const [expandedSection, setExpandedSection] = useState<string | false>('coverage');

  const getRecommendedFrameworks = () => {
    const language = techStack.find(tech => 
      ['JavaScript', 'TypeScript', 'Python', 'Java'].includes(tech)
    )?.toLowerCase() || 'javascript';

    const frameworks = TESTING_FRAMEWORKS[language as keyof typeof TESTING_FRAMEWORKS];
    return frameworks || TESTING_FRAMEWORKS.javascript;
  };

  const getCoverageRecommendation = () => {
    if (projectType === 'library') return 90;
    if (projectType === 'api') return 80;
    if (projectType === 'web') return 70;
    return 75;
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'success';
    if (coverage >= 60) return 'warning';
    return 'error';
  };

  const getTestingMaturityLevel = () => {
    let score = 0;
    if (config.unitTestCoverage >= 70) score += 2;
    else if (config.unitTestCoverage >= 50) score += 1;
    
    if (config.integrationTesting) score += 1;
    if (config.e2eTesting) score += 1;
    if (config.performanceTesting) score += 1;
    if (config.securityTesting) score += 1;
    if (config.accessibilityTesting) score += 1;
    if (config.cicd) score += 2;
    if (config.automationLevel === 'full-auto') score += 2;
    else if (config.automationLevel === 'semi-auto') score += 1;

    if (score >= 9) return { level: 'Elite', color: 'success' };
    if (score >= 6) return { level: 'Advanced', color: 'info' };
    if (score >= 3) return { level: 'Intermediate', color: 'warning' };
    return { level: 'Basic', color: 'error' };
  };

  const maturity = getTestingMaturityLevel();
  const recommendedFrameworks = getRecommendedFrameworks();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Configure Testing Strategy
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Set up a comprehensive testing approach tailored to your project needs.
        </Typography>
      </Box>

      {/* Testing Maturity Score */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Testing Maturity Level
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Based on your current configuration
            </Typography>
          </Box>
          <Chip
            label={maturity.level}
            color={maturity.color as any}
            icon={<CheckCircle />}
          />
        </Box>
      </Paper>

      {/* Quick Recommendations */}
      {projectType && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Recommended for {projectType} projects:
          </Typography>
          <Typography variant="body2">
            • Unit test coverage: {getCoverageRecommendation()}%<br />
            • Integration testing: {['api', 'web'].includes(projectType) ? 'Essential' : 'Recommended'}<br />
            • E2E testing: {['web', 'mobile'].includes(projectType) ? 'Essential' : 'Optional'}<br />
            • CI/CD: Always recommended for team projects
          </Typography>
        </Alert>
      )}

      <Accordion 
        expanded={expandedSection === 'coverage'}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? 'coverage' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <BugReport />
            <Typography variant="subtitle1" fontWeight="bold">
              Unit Test Coverage Target
            </Typography>
            <Chip 
              label={`${config.unitTestCoverage}%`}
              color={getCoverageColor(config.unitTestCoverage)}
              size="small"
              sx={{ ml: 'auto', mr: 2 }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Set your target code coverage percentage
            </Typography>
            <Slider
              value={config.unitTestCoverage}
              onChange={(_, value) => onChange({ ...config, unitTestCoverage: value as number })}
              valueLabelDisplay="on"
              step={5}
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 80, label: '80%' },
                { value: 100, label: '100%' },
              ]}
              min={0}
              max={100}
            />
            <Typography variant="caption" color="text.secondary">
              Industry standard: 70-80% for production applications
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expandedSection === 'types'}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? 'types' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IntegrationInstructions />
            <Typography variant="subtitle1" fontWeight="bold">
              Testing Types
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.integrationTesting}
                    onChange={(e) => onChange({ ...config, integrationTesting: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Integration Testing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Test component interactions
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.e2eTesting}
                    onChange={(e) => onChange({ ...config, e2eTesting: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      End-to-End Testing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Test complete user flows
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.performanceTesting}
                    onChange={(e) => onChange({ ...config, performanceTesting: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Performance Testing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Load and stress testing
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.securityTesting}
                    onChange={(e) => onChange({ ...config, securityTesting: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Security Testing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vulnerability scanning
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.accessibilityTesting}
                    onChange={(e) => onChange({ ...config, accessibilityTesting: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Accessibility Testing
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      WCAG compliance checks
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.cicd}
                    onChange={(e) => onChange({ ...config, cicd: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      CI/CD Integration
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Automated test runs
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expandedSection === 'frameworks'}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? 'frameworks' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Code />
            <Typography variant="subtitle1" fontWeight="bold">
              Testing Frameworks
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Unit Testing
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {recommendedFrameworks.unit.map(framework => (
                  <Chip
                    key={framework}
                    label={framework}
                    onClick={() => {
                      const updated = config.frameworks.includes(framework)
                        ? config.frameworks.filter(f => f !== framework)
                        : [...config.frameworks, framework];
                      onChange({ ...config, frameworks: updated });
                    }}
                    color={config.frameworks.includes(framework) ? 'primary' : 'default'}
                    variant={config.frameworks.includes(framework) ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Box>

            {config.e2eTesting && (
              <Box>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  E2E Testing
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {recommendedFrameworks.e2e.map(framework => (
                    <Chip
                      key={framework}
                      label={framework}
                      onClick={() => {
                        const updated = config.frameworks.includes(framework)
                          ? config.frameworks.filter(f => f !== framework)
                          : [...config.frameworks, framework];
                        onChange({ ...config, frameworks: updated });
                      }}
                      color={config.frameworks.includes(framework) ? 'primary' : 'default'}
                      variant={config.frameworks.includes(framework) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expandedSection === 'automation'}
        onChange={(_, isExpanded) => setExpandedSection(isExpanded ? 'automation' : false)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Speed />
            <Typography variant="subtitle1" fontWeight="bold">
              Automation Level
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {[
              { value: 'manual', label: 'Manual', desc: 'Tests run manually by developers' },
              { value: 'semi-auto', label: 'Semi-Automated', desc: 'Mix of manual and automated' },
              { value: 'full-auto', label: 'Fully Automated', desc: 'All tests run automatically' },
            ].map(option => (
              <Grid item xs={12} md={4} key={option.value}>
                <Paper
                  elevation={config.automationLevel === option.value ? 3 : 0}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: 2,
                    borderColor: config.automationLevel === option.value ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => onChange({ ...config, automationLevel: option.value as any })}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {option.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Testing Command Preview */}
      <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Your Testing Commands
        </Typography>
        <Box sx={{ fontFamily: 'monospace', fontSize: 14 }}>
          <Typography variant="body2" color="text.secondary">
            npm test -- --coverage {config.unitTestCoverage > 0 && `--coverageThreshold=${config.unitTestCoverage}`}
          </Typography>
          {config.e2eTesting && (
            <Typography variant="body2" color="text.secondary">
              npm run test:e2e
            </Typography>
          )}
          {config.integrationTesting && (
            <Typography variant="body2" color="text.secondary">
              npm run test:integration
            </Typography>
          )}
          {config.cicd && (
            <Typography variant="body2" color="text.secondary">
              # Added to CI/CD pipeline
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TestingStrategyGuide;
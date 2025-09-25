import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Button,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Check as PassIcon,
  Close as FailIcon,
  SkipNext as SkipIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Terminal as OutputIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BugReport as BugIcon,
  Speed as SpeedIcon,
  Assessment as CoverageIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface TestRun {
  id: string;
  projectId: string;
  agentId: string;
  suite: string;
  command: string;
  status: 'running' | 'passed' | 'failed' | 'error' | 'skipped';
  startTime: string;
  endTime: string | null;
  duration: number;
  results: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  } | null;
  failures: Array<{
    testName: string;
    errorMessage: string;
    stack: string;
    file: { path: string; line: number } | null;
  }>;
  output: string;
  error: string | null;
}

interface TestStats {
  global: {
    totalRuns: number;
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    averageDuration: number;
    averageCoverage: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
  };
  project?: {
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
    successRate: number;
    averageDuration: number;
    lastRun: string | null;
  };
  failurePatterns: Array<{
    type: string;
    count: number;
    tests: string[];
    files: string[];
    firstSeen: string;
    lastSeen: string;
  }>;
}

interface CoverageTrends {
  timestamps: string[];
  lines: number[];
  branches: number[];
  functions: number[];
  statements: number[];
}

function TestResultsDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [stats, setStats] = useState<TestStats | null>(null);
  const [coverageTrends, setCoverageTrends] = useState<CoverageTrends | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [testCommand, setTestCommand] = useState('npm test');
  const [testSuite, setTestSuite] = useState('default');
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testOutput, setTestOutput] = useState<Map<string, string>>(new Map());
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (projectId) {
      loadTestRuns();
      loadStats();
      loadCoverageTrends();
      connectWebSocket();
      
      const interval = setInterval(() => {
        loadStats();
      }, 30000);
      
      return () => {
        clearInterval(interval);
        disconnectWebSocket();
      };
    }
  }, [projectId]);

  const loadTestRuns = async () => {
    try {
      const response = await api.get(`/tests/project/${projectId}?limit=50`);
      setTestRuns(response.data.runs);
    } catch (error) {
      console.error('Failed to load test runs:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/tests/stats/${projectId}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadCoverageTrends = async () => {
    try {
      const response = await api.get(`/tests/coverage/${projectId}?limit=20`);
      setCoverageTrends(response.data);
    } catch (error) {
      console.error('Failed to load coverage trends:', error);
    }
  };

  const connectWebSocket = () => {
    socketService.connect();
    
    socketService.on('test:started', (testRun: TestRun) => {
      if (testRun.projectId === projectId) {
        setRunningTests(prev => new Set(prev).add(testRun.id));
        setTestRuns(prev => [testRun, ...prev]);
        toast(`Test run started: ${testRun.suite}`, { icon: '🧪' });
      }
    });
    
    socketService.on('test:completed', (testRun: TestRun) => {
      if (testRun.projectId === projectId) {
        setRunningTests(prev => {
          const newSet = new Set(prev);
          newSet.delete(testRun.id);
          return newSet;
        });
        setTestRuns(prev => prev.map(run => 
          run.id === testRun.id ? testRun : run
        ));
        
        const icon = testRun.status === 'passed' ? '✅' : 
                     testRun.status === 'failed' ? '❌' : '⚠️';
        toast(`Test run ${testRun.status}: ${testRun.suite}`, { icon });
        
        loadStats();
        loadCoverageTrends();
      }
    });
    
    socketService.on('test:output', (data: any) => {
      setTestOutput(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(data.testRunId) || '';
        newMap.set(data.testRunId, current + data.data);
        return newMap;
      });
      
      // Auto-scroll output if viewing this test
      if (selectedRun?.id === data.testRunId && outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    });
    
    socketService.on('test:error', (data: any) => {
      if (data.testRun.projectId === projectId) {
        toast.error(`Test error: ${data.error}`);
      }
    });
  };

  const disconnectWebSocket = () => {
    socketService.off('test:started');
    socketService.off('test:completed');
    socketService.off('test:output');
    socketService.off('test:error');
  };

  const handleRunTests = async () => {
    try {
      await api.post('/tests/run', {
        projectId,
        testCommand,
        suite: testSuite,
        agentId: 'manual',
        workingDir: process.cwd()
      });
      setShowRunDialog(false);
      toast.success('Test run started');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start test run');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <PassIcon color="success" />;
      case 'failed':
        return <FailIcon color="error" />;
      case 'skipped':
        return <SkipIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'warning';
      case 'error':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getCoverageChartData = () => {
    if (!coverageTrends) return null;
    
    return {
      labels: coverageTrends.timestamps.map(t => 
        new Date(t).toLocaleDateString()
      ),
      datasets: [
        {
          label: 'Lines',
          data: coverageTrends.lines,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        },
        {
          label: 'Branches',
          data: coverageTrends.branches,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
        },
        {
          label: 'Functions',
          data: coverageTrends.functions,
          borderColor: 'rgb(255, 206, 86)',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          fill: true,
        },
        {
          label: 'Statements',
          data: coverageTrends.statements,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Coverage Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Typography variant="h5" display="flex" alignItems="center" gap={1}>
              <BugIcon />
              Test Results Dashboard
              {runningTests.size > 0 && (
                <Chip 
                  label={`${runningTests.size} running`} 
                  color="info" 
                  size="small"
                />
              )}
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<RunIcon />}
                onClick={() => setShowRunDialog(true)}
              >
                Run Tests
              </Button>
              <IconButton onClick={loadTestRuns}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        {stats && (
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h6" display="flex" alignItems="center" gap={0.5}>
                    {stats.project?.successRate.toFixed(1)}%
                    {stats.project && stats.project.successRate > 80 ? (
                      <TrendingUpIcon color="success" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="error" fontSize="small" />
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Runs
                  </Typography>
                  <Typography variant="h6">
                    {stats.project?.totalRuns || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Passed
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {stats.project?.passedRuns || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Failed
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {stats.project?.failedRuns || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Avg Duration
                  </Typography>
                  <Typography variant="h6" display="flex" alignItems="center" gap={0.5}>
                    <SpeedIcon fontSize="small" />
                    {formatDuration(stats.project?.averageDuration || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Avg Coverage
                  </Typography>
                  <Typography variant="h6" display="flex" alignItems="center" gap={0.5}>
                    <CoverageIcon fontSize="small" />
                    {stats.global.averageCoverage.lines.toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        <Paper sx={{ width: 400, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
            <Tab label="Recent Runs" />
            <Tab label="Failures" />
            <Tab label="Coverage" />
          </Tabs>
          
          {tabValue === 0 && (
            <List>
              {testRuns.map(run => (
                <ListItem
                  key={run.id}
                  button
                  selected={selectedRun?.id === run.id}
                  onClick={() => setSelectedRun(run)}
                >
                  <ListItemIcon>
                    {getStatusIcon(run.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">
                          {run.suite}
                        </Typography>
                        <Chip
                          label={run.status}
                          size="small"
                          color={getStatusColor(run.status) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {run.results.passed}/{run.results.total} passed • {formatDuration(run.duration)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(run.startTime).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  {run.coverage && (
                    <Chip
                      label={`${run.coverage.lines.toFixed(0)}%`}
                      size="small"
                      variant="outlined"
                      icon={<CoverageIcon />}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          )}
          
          {tabValue === 1 && stats && (
            <Box p={2}>
              <Typography variant="subtitle2" gutterBottom>
                Common Failure Patterns
              </Typography>
              {stats.failurePatterns.map((pattern, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1} width="100%">
                      <Typography variant="body2">{pattern.type}</Typography>
                      <Chip label={`${pattern.count} times`} size="small" color="error" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        First seen: {new Date(pattern.firstSeen).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}
                      </Typography>
                      <Box mt={1}>
                        <Typography variant="caption" fontWeight="bold">
                          Affected tests:
                        </Typography>
                        {pattern.tests.slice(0, 5).map((test, i) => (
                          <Typography key={i} variant="caption" display="block">
                            • {test}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
          
          {tabValue === 2 && coverageTrends && (
            <Box p={2} height={400}>
              <Line data={getCoverageChartData()!} options={chartOptions} />
            </Box>
          )}
        </Paper>
        
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {selectedRun ? (
            <Box>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs>
                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(selectedRun.status)}
                      Test Run: {selectedRun.suite}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedRun.command}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Chip
                      label={selectedRun.status}
                      color={getStatusColor(selectedRun.status) as any}
                    />
                  </Grid>
                </Grid>
                
                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Passed
                          </Typography>
                          <Typography variant="h4" color="success.main">
                            {selectedRun.results.passed}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Failed
                          </Typography>
                          <Typography variant="h4" color="error.main">
                            {selectedRun.results.failed}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Skipped
                          </Typography>
                          <Typography variant="h4" color="warning.main">
                            {selectedRun.results.skipped}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            Duration
                          </Typography>
                          <Typography variant="h4">
                            {formatDuration(selectedRun.duration)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
                
                {selectedRun.coverage && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Coverage
                    </Typography>
                    <Grid container spacing={1}>
                      {Object.entries(selectedRun.coverage).map(([key, value]) => (
                        <Grid item xs={3} key={key}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={value}
                              sx={{ height: 8, borderRadius: 1, mt: 0.5 }}
                              color={value > 80 ? 'success' : value > 60 ? 'warning' : 'error'}
                            />
                            <Typography variant="caption">
                              {value.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Paper>
              
              {selectedRun.failures.length > 0 && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Failures ({selectedRun.failures.length})
                  </Typography>
                  {selectedRun.failures.map((failure, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <ErrorIcon color="error" />
                          <Typography variant="body2">{failure.testName}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          {failure.file && (
                            <Typography variant="caption" color="primary">
                              {failure.file.path}:{failure.file.line}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: 'background.default',
                              borderRadius: 1,
                              mt: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              overflow: 'auto'
                            }}
                          >
                            <pre>{failure.errorMessage}</pre>
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Paper>
              )}
              
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <OutputIcon />
                  Test Output
                </Typography>
                <Box
                  ref={outputRef}
                  sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    maxHeight: 400,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  <pre>
                    {runningTests.has(selectedRun.id) 
                      ? testOutput.get(selectedRun.id) || 'Waiting for output...'
                      : selectedRun.output || 'No output available'}
                  </pre>
                </Box>
              </Paper>
            </Box>
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <Typography variant="h6" color="text.secondary">
                Select a test run to view details
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      <Dialog open={showRunDialog} onClose={() => setShowRunDialog(false)}>
        <DialogTitle>Run Tests</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 400, pt: 2 }}>
            <TextField
              fullWidth
              label="Test Command"
              value={testCommand}
              onChange={(e) => setTestCommand(e.target.value)}
              margin="normal"
              helperText="e.g., npm test, pytest, jest"
            />
            <TextField
              fullWidth
              label="Test Suite"
              value={testSuite}
              onChange={(e) => setTestSuite(e.target.value)}
              margin="normal"
              helperText="Name for this test run"
            />
          </Box>
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setShowRunDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<RunIcon />}
            onClick={handleRunTests}
          >
            Run Tests
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}

export default TestResultsDashboard;
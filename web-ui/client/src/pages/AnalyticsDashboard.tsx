import React, { useEffect, useState } from 'react';
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
  Alert,
  LinearProgress,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Refresh as RefreshIcon,
  Speed as PerformanceIcon,
  BugReport as BugIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Psychology as AgentIcon,
  Assignment as TaskIcon,
  Code as CodeIcon,
  Mail as MessageIcon,
  Assessment as AssessmentIcon,
  Lightbulb as InsightIcon,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface MetricsSnapshot {
  id: string;
  timestamp: string;
  agents: {
    totalAgents: number;
    runningAgents: number;
    stoppedAgents: number;
    errorAgents: number;
    totalMemoryUsage: number;
    totalCpuUsage: number;
    claudeTokensUsed: number;
  };
  tasks: {
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    blockedTasks: number;
    averageCompletionTime: number;
    throughput: number;
  };
  tests: {
    totalRuns: number;
    totalPassed: number;
    totalFailed: number;
    successRate: number;
    averageDuration: number;
    averageCoverage: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
  };
  changes: {
    totalChanges: number;
    appliedChanges: number;
    pendingChanges: number;
    revertedChanges: number;
    changeVelocity: number;
  };
  messages: {
    totalMessagesSent: number;
    totalMessagesDelivered: number;
    totalMessagesDropped: number;
    activeConnections: number;
    throughput: number;
  };
  system: {
    cpuUsage: any;
    memoryUsage: any;
    uptime: number;
    loadAverage: number[];
    freeMemory: number;
    totalMemory: number;
  };
}

interface Insight {
  type: 'critical' | 'warning' | 'info' | 'success';
  category: string;
  message: string;
  timestamp: string;
  data?: any;
}

interface Pattern {
  type: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'warning' | 'critical' | 'unknown';
  issues: string[];
  timestamp: string;
}

function AnalyticsDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [currentMetrics, setCurrentMetrics] = useState<MetricsSnapshot | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsSnapshot[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [patterns, setPatterns] = useState<any>({});
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadInsights();
    loadPatterns();
    checkHealth();
    connectWebSocket();
    
    const interval = autoRefresh ? setInterval(() => {
      loadMetrics();
      checkHealth();
    }, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
      disconnectWebSocket();
    };
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      const [current, history] = await Promise.all([
        api.get('/analytics/metrics/current'),
        api.get('/analytics/metrics/history?limit=50')
      ]);
      
      setCurrentMetrics(current.data);
      setMetricsHistory(history.data.history);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await api.get('/analytics/insights');
      setInsights(response.data.insights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  };

  const loadPatterns = async () => {
    try {
      const response = await api.get('/analytics/patterns');
      setPatterns(response.data);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await api.get('/analytics/health');
      setHealthStatus(response.data);
    } catch (error) {
      console.error('Failed to check health:', error);
    }
  };

  const connectWebSocket = () => {
    socketService.connect();
    
    socketService.on('metrics:snapshot', (snapshot: MetricsSnapshot) => {
      setCurrentMetrics(snapshot);
      setMetricsHistory(prev => [...prev.slice(-49), snapshot]);
    });
    
    socketService.on('insight:generated', (insight: Insight) => {
      setInsights(prev => [...prev, insight].slice(-50));
      
      const icon = insight.type === 'critical' ? '🚨' :
                   insight.type === 'warning' ? '⚠️' :
                   insight.type === 'info' ? 'ℹ️' : '✅';
      toast(insight.message, { icon });
    });
  };

  const disconnectWebSocket = () => {
    socketService.off('metrics:snapshot');
    socketService.off('insight:generated');
  };

  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      case 'success':
        return <SuccessIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous * 1.1) return <TrendingUp color="success" />;
    if (current < previous * 0.9) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  const getAgentChartData = () => {
    const recent = metricsHistory.slice(-20);
    return {
      labels: recent.map(m => new Date(m.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'Running',
          data: recent.map(m => m.agents?.runningAgents || 0),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
        {
          label: 'Error',
          data: recent.map(m => m.agents?.errorAgents || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
        },
      ],
    };
  };

  const getTaskChartData = () => {
    if (!currentMetrics?.tasks) return null;
    
    return {
      labels: ['Pending', 'In Progress', 'Completed', 'Blocked'],
      datasets: [{
        data: [
          currentMetrics.tasks.pendingTasks,
          currentMetrics.tasks.inProgressTasks,
          currentMetrics.tasks.completedTasks,
          currentMetrics.tasks.blockedTasks
        ],
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
      }],
    };
  };

  const getThroughputChartData = () => {
    const recent = metricsHistory.slice(-20);
    return {
      labels: recent.map(m => new Date(m.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'Task Throughput',
          data: recent.map(m => m.tasks?.throughput || 0),
          borderColor: 'rgb(54, 162, 235)',
          yAxisID: 'y',
        },
        {
          label: 'Message Throughput',
          data: recent.map(m => m.messages?.throughput || 0),
          borderColor: 'rgb(255, 206, 86)',
          yAxisID: 'y1',
        },
      ],
    };
  };

  const getMemoryChartData = () => {
    const recent = metricsHistory.slice(-20);
    return {
      labels: recent.map(m => new Date(m.timestamp).toLocaleTimeString()),
      datasets: [{
        label: 'Heap Used (MB)',
        data: recent.map(m => m.system?.memoryUsage?.heapUsed 
          ? m.system.memoryUsage.heapUsed / 1048576 : 0),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
      }],
    };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Typography variant="h4" display="flex" alignItems="center" gap={1}>
              <AssessmentIcon />
              Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              System-wide metrics and insights
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1} alignItems="center">
              {healthStatus && (
                <Chip
                  label={healthStatus.status}
                  color={getHealthColor(healthStatus.status) as any}
                  icon={healthStatus.status === 'healthy' ? <SuccessIcon /> : <WarningIcon />}
                />
              )}
              <Button
                variant={autoRefresh ? 'contained' : 'outlined'}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <IconButton onClick={loadMetrics}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Health Issues Alert */}
      {healthStatus && healthStatus.issues.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">System Issues Detected:</Typography>
          <ul>
            {healthStatus.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AgentIcon color="primary" />
                <Typography variant="h6">
                  {currentMetrics?.agents?.runningAgents || 0}/
                  {currentMetrics?.agents?.totalAgents || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Active Agents
              </Typography>
              {currentMetrics?.agents?.errorAgents ? (
                <Chip 
                  label={`${currentMetrics.agents.errorAgents} errors`} 
                  color="error" 
                  size="small" 
                />
              ) : null}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TaskIcon color="primary" />
                <Typography variant="h6">
                  {currentMetrics?.tasks?.inProgressTasks || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tasks In Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={
                  currentMetrics?.tasks?.totalTasks 
                    ? (currentMetrics.tasks.completedTasks / currentMetrics.tasks.totalTasks) * 100
                    : 0
                }
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <BugIcon color="primary" />
                <Typography variant="h6">
                  {currentMetrics?.tests?.successRate?.toFixed(1) || 0}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Test Success Rate
              </Typography>
              <Typography variant="caption">
                Coverage: {currentMetrics?.tests?.averageCoverage?.lines?.toFixed(1) || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <MemoryIcon color="primary" />
                <Typography variant="h6">
                  {currentMetrics?.system?.memoryUsage?.heapUsed 
                    ? formatBytes(currentMetrics.system.memoryUsage.heapUsed)
                    : '0 MB'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Memory Usage
              </Typography>
              <Typography variant="caption">
                Uptime: {formatUptime(currentMetrics?.system?.uptime || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Overview" />
          <Tab label="Performance" />
          <Tab label="Insights" />
          <Tab label="Patterns" />
        </Tabs>
        
        <Box p={3}>
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Agent Activity
                </Typography>
                <Box height={300}>
                  <Line 
                    data={getAgentChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }} 
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Task Distribution
                </Typography>
                <Box height={300}>
                  {currentMetrics?.tasks && (
                    <Doughnut 
                      data={getTaskChartData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Messages/sec
                        </Typography>
                        <Typography variant="h5">
                          {currentMetrics?.messages?.throughput?.toFixed(2) || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Tasks/sec
                        </Typography>
                        <Typography variant="h5">
                          {currentMetrics?.tasks?.throughput?.toFixed(2) || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Changes/hr
                        </Typography>
                        <Typography variant="h5">
                          {currentMetrics?.changes?.changeVelocity || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Claude Tokens
                        </Typography>
                        <Typography variant="h5">
                          {currentMetrics?.agents?.claudeTokensUsed || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
          
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Throughput Trends
                </Typography>
                <Box height={300}>
                  <Line 
                    data={getThroughputChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          grid: {
                            drawOnChartArea: false,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Memory Usage
                </Typography>
                <Box height={300}>
                  <Line 
                    data={getMemoryChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  System Load
                </Typography>
                <Grid container spacing={2}>
                  {currentMetrics?.system?.loadAverage?.map((load, index) => (
                    <Grid item xs={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            {index === 0 ? '1 min' : index === 1 ? '5 min' : '15 min'} Load
                          </Typography>
                          <Typography variant="h5">
                            {load.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          )}
          
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                System Insights
              </Typography>
              <List>
                {insights.map((insight, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getInsightIcon(insight.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={insight.message}
                      secondary={
                        <Box>
                          <Chip 
                            label={insight.category} 
                            size="small" 
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="caption" component="span">
                            {new Date(insight.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              {insights.length === 0 && (
                <Typography color="text.secondary">
                  No insights generated yet
                </Typography>
              )}
            </Box>
          )}
          
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Error Patterns
                </Typography>
                <List dense>
                  {patterns.errorPatterns?.map((pattern: Pattern, index: number) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={pattern.type}
                        secondary={`${pattern.count} occurrences`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Performance Patterns
                </Typography>
                <List dense>
                  {patterns.performancePatterns?.map((pattern: Pattern, index: number) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={pattern.type}
                        secondary={`Last: ${new Date(pattern.lastSeen).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Success Patterns
                </Typography>
                <List dense>
                  {patterns.successPatterns?.map((pattern: Pattern, index: number) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={pattern.type}
                        secondary={`${pattern.count} times`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default AnalyticsDashboard;
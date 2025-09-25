import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Psychology as ThoughtIcon,
  Code as CodeIcon,
  BugReport as TestIcon,
  Analytics as AnalyticsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { Agent } from '../types';
import toast from 'react-hot-toast';
import DirectMessagePanel from '../components/DirectMessagePanel';

const AGENT_TYPES = ['coordinator', 'planner', 'tester', 'coder', 'reviewer'];

function AgentMonitor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | false>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (projectId) {
      loadAgents();
      connectWebSocket();
      
      // Set up periodic refresh every 10 seconds
      const interval = setInterval(() => {
        loadAgents();
      }, 10000);

      return () => {
        clearInterval(interval);
        if (projectId) {
          socketService.leaveProject(projectId);
        }
      };
    }

    return () => {
      if (projectId) {
        socketService.leaveProject(projectId);
      }
    };
  }, [projectId]);

  // Load existing logs after agents are loaded
  useEffect(() => {
    if (Object.keys(agents).length > 0) {
      loadExistingLogs();
    }
  }, [agents]);

  const loadAgents = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/agents`);
      const agentMap: Record<string, Agent> = {};
      response.data.agents.forEach((agent: Agent) => {
        agentMap[agent.id] = agent;
      });
      setAgents(agentMap);
    } catch (error) {
      toast.error('Failed to load agents');
    }
  };

  const loadExistingLogs = async () => {
    try {
      const logPromises = Object.keys(agents).map(async (agentId) => {
        if (agents[agentId].status === 'running') {
          const response = await api.get(`/agents/${projectId}/${agentId}/logs?lines=50`);
          return { agentId, logs: response.data.logs || [] };
        }
        return { agentId, logs: [] };
      });

      const results = await Promise.all(logPromises);
      const newLogs: Record<string, string[]> = {};
      
      results.forEach(({ agentId, logs: agentLogs }) => {
        if (agentLogs.length > 0) {
          newLogs[agentId] = agentLogs;
        }
      });

      setLogs(prev => ({ ...prev, ...newLogs }));
    } catch (error) {
      console.error('Failed to load existing logs:', error);
    }
  };

  const connectWebSocket = () => {
    socketService.connect();
    socketService.joinProject(projectId!);

    socketService.on('agent:status', (data) => {
      setAgents((prev) => ({
        ...prev,
        [data.agentId]: {
          ...prev[data.agentId],
          // Extract string status from object if needed
          status: typeof data.status === 'object' ? data.status.status : data.status,
        },
      }));
    });

    socketService.on('agent:log', (data) => {
      setLogs((prev) => ({
        ...prev,
        [data.agentId]: [...(prev[data.agentId] || []), data.message].slice(-50),
      }));
    });
  };

  const handleLaunchAgent = async (agentType: string) => {
    try {
      await api.post(`/projects/${projectId}/agents/${agentType}/launch`, {
        debug: true,
      });
      toast.success(`${agentType} agent launched`);
      loadAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to launch agent');
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      await api.post(`/projects/${projectId}/agents/${agentId}/stop`);
      toast.success(`${agentId} agent stopped`);
      loadAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to stop agent');
    }
  };

  const handleRestartAgent = async (agentId: string) => {
    try {
      await api.post(`/agents/${projectId}/${agentId}/restart`);
      toast.success(`${agentId} agent restarted`);
      loadAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to restart agent');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'default';
      case 'error':
        return 'error';
      case 'stopping':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
          Agent Monitor
        </Typography>
        <Stack 
          direction={isMobile ? 'column' : 'row'}
          spacing={1}
          sx={{ 
            overflowX: isMobile ? 'hidden' : 'visible',
            width: '100%'
          }}
        >
          <Button
            component={Link}
            to={`/queue/${projectId}`}
            variant="outlined"
            color="secondary"
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          >
            Work Queue
          </Button>
          <Button
            component={Link}
            to={`/flows/${projectId}`}
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          >
            Message Flows
          </Button>
          <Button
            component={Link}
            to={`/changes/${projectId}`}
            variant="outlined"
            startIcon={!isMobile && <CodeIcon />}
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          >
            Code Changes
          </Button>
          <Button
            component={Link}
            to={`/tests/${projectId}`}
            variant="outlined"
            startIcon={!isMobile && <TestIcon />}
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          >
            Test Results
          </Button>
          <Button
            component={Link}
            to={`/analytics/${projectId}`}
            variant="contained"
            color="secondary"
            startIcon={!isMobile && <AnalyticsIcon />}
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          >
            Analytics
          </Button>
          <Button
            component={Link}
            to={`/thoughts/${projectId}`}
            variant="outlined"
            startIcon={!isMobile && <ThoughtIcon />}
            size={isMobile ? 'small' : 'medium'}
            fullWidth={isMobile}
          >
            {isMobile ? 'Thoughts' : 'Stream of Consciousness'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={isMobile ? 1 : 3}>
        {AGENT_TYPES.map((agentType) => {
          const agent = agents[agentType];
          const isRunning = agent?.status === 'running';

          // Mobile layout: single column with accordions
          if (isMobile) {
            return (
              <Grid item xs={12} key={agentType}>
                <Accordion
                  expanded={expandedAgent === agentType}
                  onChange={(_, expanded) => setExpandedAgent(expanded ? agentType : false)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Typography variant="h6">
                        {agentType.charAt(0).toUpperCase() + agentType.slice(1)}
                      </Typography>
                      <Chip
                        label={agent?.status || 'not running'}
                        color={getStatusColor(agent?.status) as any}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Card sx={{ width: '100%' }}>
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={2}>
                            {isRunning && agent.pid && (
                              <Typography variant="caption" color="text.secondary">
                                PID: {agent.pid}
                              </Typography>
                            )}
                          </Box>
                          {isRunning && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Uptime: {formatUptime(agent.uptime)}
                              </Typography>
                              {agent.startTime && (
                                <Typography variant="body2" color="text.secondary">
                                  Started: {new Date(agent.startTime).toLocaleTimeString()}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </CardContent>
                        <CardActions>
                          {!isRunning ? (
                            <Button
                              size="small"
                              startIcon={<PlayIcon />}
                              onClick={() => handleLaunchAgent(agentType)}
                            >
                              Launch
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="small"
                                startIcon={<StopIcon />}
                                onClick={() => handleStopAgent(agentType)}
                              >
                                Stop
                              </Button>
                              <IconButton
                                size="small"
                                onClick={() => handleRestartAgent(agentType)}
                              >
                                <RefreshIcon />
                              </IconButton>
                            </>
                          )}
                        </CardActions>
                      </Card>
                      <DirectMessagePanel
                        projectId={projectId!}
                        agentId={agentType}
                        agentStatus={agent?.status}
                      />
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            );
          }

          // Desktop/Tablet layout: existing grid layout
          return (
            <Grid item xs={12} md={isTablet ? 12 : 6} lg={6} key={agentType}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={isTablet ? 6 : 12} lg={6}>
                  <Card>
                    <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {agentType.charAt(0).toUpperCase() + agentType.slice(1)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Chip
                      label={agent?.status || 'not running'}
                      color={getStatusColor(agent?.status) as any}
                      size="small"
                    />
                    {isRunning && agent.pid && (
                      <Typography variant="caption" color="text.secondary">
                        PID: {agent.pid}
                      </Typography>
                    )}
                  </Box>
                  {isRunning && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Uptime: {formatUptime(agent.uptime)}
                      </Typography>
                      {agent.startTime && (
                        <Typography variant="body2" color="text.secondary">
                          Started: {new Date(agent.startTime).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  {!isRunning ? (
                    <Button
                      size="small"
                      startIcon={<PlayIcon />}
                      onClick={() => handleLaunchAgent(agentType)}
                    >
                      Launch
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={() => handleStopAgent(agentType)}
                      >
                        Stop
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleRestartAgent(agentType)}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </>
                  )}
                </CardActions>
              </Card>
                </Grid>
                <Grid item xs={12} md={isTablet ? 6 : 12} lg={6}>
                  <DirectMessagePanel
                    projectId={projectId!}
                    agentId={agentType}
                    agentStatus={agent?.status}
                  />
                </Grid>
              </Grid>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Logs
        </Typography>
        <Box sx={{ maxHeight: 400, overflow: 'auto', bgcolor: 'background.default', p: 2 }}>
          {Object.entries(logs).map(([agentId, agentLogs]) => (
            <Box key={agentId} mb={2}>
              <Typography variant="subtitle2" color="primary">
                {agentId}:
              </Typography>
              {agentLogs.slice(-5).map((log, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  component="pre"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                  {log}
                </Typography>
              ))}
            </Box>
          ))}
          {Object.keys(logs).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No logs available
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default AgentMonitor;
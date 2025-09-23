import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { Agent } from '../types';
import toast from 'react-hot-toast';

const AGENT_TYPES = ['coordinator', 'planner', 'tester', 'coder', 'reviewer'];

function AgentMonitor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (projectId) {
      loadAgents();
      connectWebSocket();
    }

    return () => {
      if (projectId) {
        socketService.leaveProject(projectId);
      }
    };
  }, [projectId]);

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

  const connectWebSocket = () => {
    socketService.connect();
    socketService.joinProject(projectId!);

    socketService.on('agent:status', (data) => {
      setAgents((prev) => ({
        ...prev,
        [data.agentId]: {
          ...prev[data.agentId],
          status: data.status,
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
      <Typography variant="h4" gutterBottom>
        Agent Monitor
      </Typography>

      <Grid container spacing={3}>
        {AGENT_TYPES.map((agentType) => {
          const agent = agents[agentType];
          const isRunning = agent?.status === 'running';

          return (
            <Grid item xs={12} sm={6} md={4} key={agentType}>
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
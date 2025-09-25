import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CompleteIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
  Timeline as TimelineIcon,
  BugReport as BugIcon,
  Code as CodeIcon,
  RateReview as ReviewIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  goalId?: string;
  projectId: string;
  status: 'pending' | 'planning' | 'in_progress' | 'review' | 'testing' | 'completed' | 'blocked' | 'failed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  assignedAgent: string | null;
  dependencies: string[];
  estimatedTime: number | null;
  actualTime: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  blockers: Array<{
    id: string;
    description: string;
    type: string;
    createdAt: string;
  }>;
  metadata?: any;
  history?: Array<{
    timestamp: string;
    action: string;
    details: any;
  }>;
}

interface TaskColumn {
  id: Task['status'];
  title: string;
  color: string;
  tasks: Task[];
}

const AGENT_TYPES = ['coordinator', 'planner', 'tester', 'coder', 'reviewer'];

function WorkQueueDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileTabValue, setMobileTabValue] = useState<number>(0);
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [columns, setColumns] = useState<TaskColumn[]>([
    { id: 'pending', title: 'Pending', color: '#757575', tasks: [] },
    { id: 'planning', title: 'Planning', color: '#9c27b0', tasks: [] },
    { id: 'in_progress', title: 'In Progress', color: '#2196f3', tasks: [] },
    { id: 'review', title: 'Review', color: '#ff9800', tasks: [] },
    { id: 'testing', title: 'Testing', color: '#00bcd4', tasks: [] },
    { id: 'completed', title: 'Completed', color: '#4caf50', tasks: [] },
    { id: 'blocked', title: 'Blocked', color: '#f44336', tasks: [] },
  ]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as Task['priority'],
    estimatedTime: 0,
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      loadTasks();
      loadMetrics();
      connectWebSocket();
      
      const interval = setInterval(() => {
        loadMetrics();
      }, 30000); // Update metrics every 30 seconds

      return () => {
        clearInterval(interval);
        if (projectId) {
          socketService.leaveProject(projectId);
        }
      };
    }
  }, [projectId]);

  useEffect(() => {
    // Organize tasks into columns
    const newColumns = columns.map(col => ({
      ...col,
      tasks: Array.from(tasks.values()).filter(task => task.status === col.id)
        .sort((a, b) => {
          // Sort by priority then by creation date
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    }));
    setColumns(newColumns);
  }, [tasks]);

  const loadTasks = async () => {
    try {
      const response = await api.get(`/tasks/project/${projectId}`);
      const taskMap = new Map<string, Task>();
      response.data.tasks.forEach((task: Task) => {
        taskMap.set(task.id, task);
      });
      setTasks(taskMap);
    } catch (error) {
      toast.error('Failed to load tasks');
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await api.get(`/tasks/metrics/${projectId}`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const connectWebSocket = () => {
    socketService.connect();
    socketService.joinProject(projectId!);

    socketService.on('task:created', (task: Task) => {
      setTasks(prev => new Map(prev).set(task.id, task));
      toast.success(`New task created: ${task.title}`);
    });

    socketService.on('task:statusChanged', (data: any) => {
      setTasks(prev => {
        const newTasks = new Map(prev);
        if (newTasks.has(data.taskId)) {
          newTasks.set(data.taskId, data.task);
        }
        return newTasks;
      });
    });

    socketService.on('task:assigned', (data: any) => {
      setTasks(prev => {
        const newTasks = new Map(prev);
        if (newTasks.has(data.taskId)) {
          newTasks.set(data.taskId, data.task);
        }
        return newTasks;
      });
    });

    socketService.on('task:blocked', (data: any) => {
      setTasks(prev => {
        const newTasks = new Map(prev);
        if (newTasks.has(data.taskId)) {
          newTasks.set(data.taskId, data.task);
        }
        return newTasks;
      });
      toast.error(`Task blocked: ${data.task.title}`);
    });

    socketService.on('task:unblocked', (data: any) => {
      setTasks(prev => {
        const newTasks = new Map(prev);
        if (newTasks.has(data.taskId)) {
          newTasks.set(data.taskId, data.task);
        }
        return newTasks;
      });
      toast.success(`Task unblocked: ${data.task.title}`);
    });
  };

  const handleCreateTask = async () => {
    try {
      await api.post('/tasks', {
        ...newTask,
        projectId,
      });
      setCreateDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'normal',
        estimatedTime: 0,
      });
      loadTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      await api.put(`/tasks/${draggedTask.id}/status`, {
        status: newStatus,
      });
      loadTasks();
      toast.success(`Task moved to ${newStatus}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update task status');
    }
    setDraggedTask(null);
  };

  const handleAssignTask = async (taskId: string, agentId: string) => {
    try {
      await api.put(`/tasks/${taskId}/assign`, { agentId });
      loadTasks();
      toast.success(`Task assigned to ${agentId}`);
    } catch (error) {
      toast.error('Failed to assign task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.delete(`/tasks/${taskId}`);
      loadTasks();
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getAgentIcon = (agent: string | null) => {
    if (!agent) return <PersonIcon />;
    switch (agent) {
      case 'coder': return <CodeIcon />;
      case 'tester': return <BugIcon />;
      case 'reviewer': return <ReviewIcon />;
      default: return <PersonIcon />;
    }
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return '-';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Work Queue Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Task
        </Button>
      </Box>

      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">{metrics.totalCreated}</Typography>
              <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">{metrics.totalCompleted}</Typography>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="error.main">{metrics.totalFailed}</Typography>
              <Typography variant="body2" color="text.secondary">Failed</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">{formatTime(metrics.averageCompletionTime)}</Typography>
              <Typography variant="body2" color="text.secondary">Avg Completion</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {isMobile ? (
        // Mobile Layout with Tabs
        <Box>
          <Tabs
            value={mobileTabValue}
            onChange={(_, newValue) => setMobileTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            {columns.map((column, index) => (
              <Tab
                key={column.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 16,
                        bgcolor: column.color,
                        borderRadius: 1,
                      }}
                    />
                    <Typography variant="body2">
                      {column.title}
                    </Typography>
                    <Chip label={column.tasks.length} size="small" />
                  </Box>
                }
              />
            ))}
          </Tabs>
          {columns[mobileTabValue] && (
            <Paper
              sx={{
                bgcolor: 'background.default',
                p: 2,
                minHeight: 400,
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, columns[mobileTabValue].id)}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {columns[mobileTabValue].tasks.map((task) => (
                  <Card
                    key={task.id}
                    sx={{ width: '100%' }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {task.title}
                        </Typography>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                      </Box>
                      
                      {task.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {task.description}
                        </Typography>
                      )}

                      {task.blockers.length > 0 && (
                        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                          <Typography variant="caption">
                            {task.blockers.length} blocker(s)
                          </Typography>
                        </Alert>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1, flexWrap: 'wrap' }}>
                        {task.assignedAgent && (
                          <Chip
                            icon={getAgentIcon(task.assignedAgent)}
                            label={task.assignedAgent}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {task.estimatedTime && (
                          <Tooltip title="Estimated time">
                            <Chip
                              icon={<ScheduleIcon />}
                              label={formatTime(task.estimatedTime)}
                              size="small"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ py: 0 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          handleUpdateTaskStatus(task.id, 'blocked');
                        }}
                      >
                        <BlockIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      ) : (
        // Desktop/Tablet Layout with Horizontal Columns
        <Box sx={{ display: 'flex', gap: isTablet ? 1 : 2, overflowX: 'auto', pb: 2 }}>
          {columns.map((column) => (
            <Paper
              key={column.id}
              sx={{
                minWidth: isTablet ? 250 : 300,
                maxWidth: isTablet ? 300 : 350,
                bgcolor: 'background.default',
                p: isTablet ? 1 : 2,
                height: 'fit-content',
                minHeight: 400,
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 24,
                    bgcolor: column.color,
                    mr: 1,
                    borderRadius: 1,
                  }}
                />
                <Typography variant={isTablet ? "body1" : "h6"}>{column.title}</Typography>
                <Chip
                  label={column.tasks.length}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {column.tasks.map((task) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  sx={{
                    cursor: 'move',
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {task.title}
                      </Typography>
                      <Chip
                        label={task.priority}
                        size="small"
                        color={getPriorityColor(task.priority) as any}
                      />
                    </Box>
                    
                    {task.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}

                    {task.blockers.length > 0 && (
                      <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                        <Typography variant="caption">
                          {task.blockers.length} blocker(s)
                        </Typography>
                      </Alert>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                      {task.assignedAgent && (
                        <Chip
                          icon={getAgentIcon(task.assignedAgent)}
                          label={task.assignedAgent}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {task.estimatedTime && (
                        <Tooltip title="Estimated time">
                          <Chip
                            icon={<ScheduleIcon />}
                            label={formatTime(task.estimatedTime)}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ py: 0.5, px: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTask(task);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <InfoIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Estimated Time (hours)"
            value={newTask.estimatedTime / (1000 * 60 * 60)}
            onChange={(e) => setNewTask({ ...newTask, estimatedTime: parseFloat(e.target.value) * 1000 * 60 * 60 })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{selectedTask.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              {selectedTask.description}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip label={selectedTask.status} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Priority:</Typography>
                <Chip label={selectedTask.priority} color={getPriorityColor(selectedTask.priority) as any} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Assigned to:</Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={selectedTask.assignedAgent || ''}
                    onChange={(e) => handleAssignTask(selectedTask.id, e.target.value)}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {AGENT_TYPES.map(agent => (
                      <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Time:</Typography>
                <Typography variant="body2">
                  Est: {formatTime(selectedTask.estimatedTime)} | 
                  Act: {formatTime(selectedTask.actualTime)}
                </Typography>
              </Grid>
            </Grid>

            {selectedTask.blockers.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Blockers:</Typography>
                <List dense>
                  {selectedTask.blockers.map(blocker => (
                    <ListItem key={blocker.id}>
                      <ListItemIcon>
                        <BlockIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={blocker.description}
                        secondary={new Date(blocker.createdAt).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {selectedTask.history && selectedTask.history.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">History:</Typography>
                <List dense>
                  {selectedTask.history.slice(-5).map((entry, idx) => (
                    <ListItem key={idx}>
                      <ListItemText
                        primary={entry.action}
                        secondary={new Date(entry.timestamp).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default WorkQueueDashboard;
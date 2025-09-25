import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactDiffViewer from 'react-diff-viewer-continued';
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
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Undo as UndoIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  FolderOpen as FolderIcon,
  InsertDriveFile as FileIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface CodeChange {
  id: string;
  agentId: string;
  taskId: string | null;
  filePath: string;
  fileName: string;
  directory: string;
  operation: 'create' | 'modify' | 'delete';
  before: string | null;
  after: string | null;
  diff: string | null;
  status: 'pending' | 'applied' | 'reverted' | 'failed';
  timestamp: string;
  appliedAt: string | null;
  metadata: any;
}

interface ChangeStats {
  totalChanges: number;
  appliedChanges: number;
  revertedChanges: number;
  pendingChanges: number;
  byType: {
    create: number;
    modify: number;
    delete: number;
  };
  recentChanges: any[];
}

function CodeChangeMonitor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [changes, setChanges] = useState<CodeChange[]>([]);
  const [selectedChange, setSelectedChange] = useState<CodeChange | null>(null);
  const [stats, setStats] = useState<ChangeStats | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [searchPath, setSearchPath] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [revertingChangeId, setRevertingChangeId] = useState<string | null>(null);
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    loadChanges();
    loadStats();
    connectWebSocket();
    
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    
    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, [projectId]);

  useEffect(() => {
    // Extract unique agent IDs from changes
    const uniqueAgents = [...new Set(changes.map(c => c.agentId))];
    setAgents(uniqueAgents);
  }, [changes]);

  const loadChanges = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterOperation) params.append('operation', filterOperation);
      if (filterAgent) params.append('agentId', filterAgent);
      params.append('limit', '200');
      
      const response = await api.get(`/changes?${params.toString()}`);
      setChanges(response.data.changes);
    } catch (error) {
      toast.error('Failed to load changes');
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/changes/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const connectWebSocket = () => {
    socketService.connect();
    
    socketService.on('change:tracked', (change: CodeChange) => {
      setChanges(prev => [change, ...prev]);
      toast(`New ${change.operation}: ${change.fileName}`, { icon: '📝' });
    });
    
    socketService.on('change:completed', (change: CodeChange) => {
      setChanges(prev => prev.map(c => c.id === change.id ? change : c));
      toast.success(`Change applied: ${change.fileName}`);
    });
    
    socketService.on('change:reverted', (change: CodeChange) => {
      setChanges(prev => prev.map(c => c.id === change.id ? change : c));
      toast.success(`Change reverted: ${change.fileName}`);
    });
    
    socketService.on('change:failed', (change: CodeChange) => {
      setChanges(prev => prev.map(c => c.id === change.id ? change : c));
      toast.error(`Change failed: ${change.fileName}`);
    });
  };

  const disconnectWebSocket = () => {
    socketService.off('change:tracked');
    socketService.off('change:completed');
    socketService.off('change:reverted');
    socketService.off('change:failed');
  };

  const handleRevertChange = async () => {
    if (!revertingChangeId) return;
    
    try {
      await api.post(`/changes/${revertingChangeId}/revert`);
      setShowRevertDialog(false);
      setRevertingChangeId(null);
      loadChanges();
      toast.success('Change reverted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revert change');
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create':
        return <AddIcon color="success" />;
      case 'modify':
        return <EditIcon color="primary" />;
      case 'delete':
        return <DeleteIcon color="error" />;
      default:
        return <CodeIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'success';
      case 'pending':
        return 'warning';
      case 'reverted':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getFileLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'c':
        return 'cpp';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  const filteredChanges = changes.filter(change => {
    if (searchPath && !change.filePath.toLowerCase().includes(searchPath.toLowerCase())) {
      return false;
    }
    return true;
  });

  const pendingChanges = filteredChanges.filter(c => c.status === 'pending');
  const appliedChanges = filteredChanges.filter(c => c.status === 'applied');
  const revertedChanges = filteredChanges.filter(c => c.status === 'reverted');

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Typography variant="h5" display="flex" alignItems="center" gap={1}>
              <CodeIcon />
              Code Change Monitor
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <IconButton onClick={loadChanges}>
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={() => setTabValue(3)}>
                <FilterIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        {stats && (
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Changes
                  </Typography>
                  <Typography variant="h6">{stats.totalChanges}</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Applied
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {stats.appliedChanges}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {stats.pendingChanges}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Reverted
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {stats.revertedChanges}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box mt={1} display="flex" gap={1}>
              <Chip
                label={`Created: ${stats.byType.create}`}
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Modified: ${stats.byType.modify}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Deleted: ${stats.byType.delete}`}
                size="small"
                color="error"
                variant="outlined"
              />
            </Box>
          </Box>
        )}
      </Paper>

      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        <Paper sx={{ width: 400, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
            <Tab label={`Pending (${pendingChanges.length})`} />
            <Tab label={`Applied (${appliedChanges.length})`} />
            <Tab label={`Reverted (${revertedChanges.length})`} />
            <Tab label="Filters" />
          </Tabs>
          
          {tabValue === 3 ? (
            <Box p={2}>
              <TextField
                fullWidth
                label="Search by path"
                value={searchPath}
                onChange={(e) => setSearchPath(e.target.value)}
                margin="normal"
                size="small"
              />
              
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    loadChanges();
                  }}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="applied">Applied</MenuItem>
                  <MenuItem value="reverted">Reverted</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Operation</InputLabel>
                <Select
                  value={filterOperation}
                  onChange={(e) => {
                    setFilterOperation(e.target.value);
                    loadChanges();
                  }}
                  label="Operation"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="create">Create</MenuItem>
                  <MenuItem value="modify">Modify</MenuItem>
                  <MenuItem value="delete">Delete</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Agent</InputLabel>
                <Select
                  value={filterAgent}
                  onChange={(e) => {
                    setFilterAgent(e.target.value);
                    loadChanges();
                  }}
                  label="Agent"
                >
                  <MenuItem value="">All</MenuItem>
                  {agents.map(agent => (
                    <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setFilterStatus('');
                  setFilterOperation('');
                  setFilterAgent('');
                  setSearchPath('');
                  loadChanges();
                }}
                sx={{ mt: 2 }}
              >
                Clear Filters
              </Button>
            </Box>
          ) : (
            <List>
              {(tabValue === 0 ? pendingChanges : 
                tabValue === 1 ? appliedChanges : 
                revertedChanges).map(change => (
                <ListItem
                  key={change.id}
                  button
                  selected={selectedChange?.id === change.id}
                  onClick={() => setSelectedChange(change)}
                >
                  <ListItemIcon>
                    {getOperationIcon(change.operation)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" noWrap>
                          {change.fileName}
                        </Typography>
                        <Chip
                          label={change.status}
                          size="small"
                          color={getStatusColor(change.status) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {change.directory}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {change.agentId} • {new Date(change.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                  {change.status === 'applied' && (
                    <ListItemSecondaryAction>
                      <Tooltip title="Revert this change">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevertingChangeId(change.id);
                            setShowRevertDialog(true);
                          }}
                        >
                          <UndoIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
        
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {selectedChange ? (
            <Box>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs>
                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                      {getOperationIcon(selectedChange.operation)}
                      {selectedChange.fileName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedChange.filePath}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        variant={viewMode === 'split' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('split')}
                      >
                        Split View
                      </Button>
                      <Button
                        size="small"
                        variant={viewMode === 'unified' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('unified')}
                      >
                        Unified View
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                
                <Box mt={2} display="flex" gap={1}>
                  <Chip
                    label={selectedChange.operation}
                    size="small"
                    color={
                      selectedChange.operation === 'create' ? 'success' :
                      selectedChange.operation === 'modify' ? 'primary' : 'error'
                    }
                  />
                  <Chip
                    label={selectedChange.status}
                    size="small"
                    color={getStatusColor(selectedChange.status) as any}
                  />
                  <Chip
                    label={selectedChange.agentId}
                    size="small"
                    icon={<FolderIcon />}
                  />
                  {selectedChange.taskId && (
                    <Chip
                      label={`Task: ${selectedChange.taskId.slice(0, 8)}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  <Chip
                    label={new Date(selectedChange.timestamp).toLocaleString()}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                {selectedChange.status === 'failed' && selectedChange.metadata?.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {selectedChange.metadata.error}
                  </Alert>
                )}
              </Paper>
              
              <Paper sx={{ p: 2 }}>
                {selectedChange.operation === 'delete' ? (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      This file was deleted
                    </Alert>
                    {selectedChange.before && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Deleted Content:
                        </Typography>
                        <Box
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            p: 2,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            overflow: 'auto'
                          }}
                        >
                          <pre>{selectedChange.before}</pre>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : selectedChange.operation === 'create' ? (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      This file was created
                    </Alert>
                    {selectedChange.after && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Created Content:
                        </Typography>
                        <Box
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            p: 2,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            overflow: 'auto'
                          }}
                        >
                          <pre>{selectedChange.after}</pre>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <ReactDiffViewer
                    oldValue={selectedChange.before || ''}
                    newValue={selectedChange.after || ''}
                    splitView={viewMode === 'split'}
                    useDarkTheme={true}
                    leftTitle="Before"
                    rightTitle="After"
                    compareMethod="diffLines"
                    hideLineNumbers={false}
                    showDiffOnly={false}
                    extraLinesSurroundingDiff={3}
                  />
                )}
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
                Select a change to view details
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      <Dialog
        open={showRevertDialog}
        onClose={() => setShowRevertDialog(false)}
      >
        <DialogTitle>Confirm Revert</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Are you sure you want to revert this change? This will restore the file to its previous state.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRevertDialog(false)}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={handleRevertChange}
          >
            Revert Change
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CodeChangeMonitor;
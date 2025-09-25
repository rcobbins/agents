import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Psychology as ThoughtIcon,
  Code as CodeIcon,
  Analytics as AnalysisIcon,
  Build as PlanIcon,
  CheckCircle as DecisionIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { socketService } from '../services/socket';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface Thought {
  id: string;
  agentId: string;
  type: 'claude_query' | 'claude_response' | 'claude_error' | 'claude_stream' | 'planning' | 'decision' | 'analysis' | 'progress';
  phase: string;
  timestamp: string;
  prompt?: string;
  response?: string;
  error?: string;
  plan?: any;
  decision?: any;
  contextLength?: number;
  responseLength?: number;
  streamType?: 'stdout' | 'stderr';
  content?: string;
  [key: string]: any;
}

const AGENT_TYPES = ['coordinator', 'planner', 'tester', 'coder', 'reviewer'];

function AgentThoughts() {
  const { projectId } = useParams<{ projectId: string }>();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [thoughtTypeFilter, setThoughtTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const thoughtIdCounter = useRef(0);

  useEffect(() => {
    if (projectId) {
      connectWebSocket();
      
      return () => {
        if (projectId) {
          socketService.leaveProject(projectId);
        }
      };
    }
  }, [projectId]);

  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts, autoScroll, isPaused]);

  const connectWebSocket = () => {
    socketService.connect();
    socketService.joinProject(projectId!);

    // Listen for thought events
    socketService.on('agent:thought', (data: any) => {
      if (!isPaused) {
        const thought: Thought = {
          ...data,
          id: `thought-${thoughtIdCounter.current++}`,
        };
        setThoughts((prev) => [...prev.slice(-499), thought]); // Keep last 500
      }
    });

    // Listen for decision events
    socketService.on('agent:decision', (data: any) => {
      if (!isPaused) {
        const thought: Thought = {
          ...data,
          id: `decision-${thoughtIdCounter.current++}`,
          type: 'decision',
        };
        setThoughts((prev) => [...prev.slice(-499), thought]);
      }
    });

    // Listen for planning events
    socketService.on('agent:planning', (data: any) => {
      if (!isPaused) {
        const thought: Thought = {
          ...data,
          id: `plan-${thoughtIdCounter.current++}`,
          type: 'planning',
        };
        setThoughts((prev) => [...prev.slice(-499), thought]);
      }
    });
  };

  const toggleThoughtExpansion = (thoughtId: string) => {
    setExpandedThoughts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(thoughtId)) {
        newSet.delete(thoughtId);
      } else {
        newSet.add(thoughtId);
      }
      return newSet;
    });
  };

  const getThoughtIcon = (type: string) => {
    switch (type) {
      case 'claude_query':
      case 'claude_response':
      case 'claude_stream':
        return <ThoughtIcon />;
      case 'claude_error':
        return <ErrorIcon />;
      case 'planning':
        return <PlanIcon />;
      case 'decision':
        return <DecisionIcon />;
      case 'analysis':
        return <AnalysisIcon />;
      case 'progress':
        return <CodeIcon />;
      default:
        return <ThoughtIcon />;
    }
  };

  const getThoughtColor = (type: string) => {
    switch (type) {
      case 'claude_query':
        return 'primary';
      case 'claude_response':
        return 'success';
      case 'claude_stream':
        return 'info';
      case 'claude_error':
        return 'error';
      case 'planning':
        return 'warning';
      case 'decision':
        return 'info';
      case 'analysis':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const formatThoughtContent = (thought: Thought) => {
    const isExpanded = expandedThoughts.has(thought.id);

    if (thought.type === 'claude_query') {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            Query to Claude:
          </Typography>
          <Typography
            variant="body2"
            component="pre"
            sx={{
              fontFamily: 'monospace',
              whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
              overflow: isExpanded ? 'visible' : 'hidden',
              textOverflow: isExpanded ? 'clip' : 'ellipsis',
              maxHeight: isExpanded ? 'none' : '100px',
            }}
          >
            {thought.prompt}
          </Typography>
          {thought.contextLength && (
            <Typography variant="caption" color="text.secondary">
              Context: {thought.contextLength} chars
            </Typography>
          )}
        </Box>
      );
    }

    if (thought.type === 'claude_stream') {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" color={thought.streamType === 'stderr' ? 'error' : 'inherit'}>
            Claude {thought.streamType === 'stderr' ? 'Error' : 'Stream'}:
          </Typography>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: thought.streamType === 'stderr' ? 'error.main' : 'divider',
              borderRadius: 1,
              p: 1,
              maxHeight: isExpanded ? 'none' : '100px',
              overflow: isExpanded ? 'visible' : 'hidden',
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                fontSize: '0.85rem',
                color: thought.streamType === 'stderr' ? 'error.main' : 'text.primary',
              }}
            >
              {thought.content}
            </Typography>
          </Box>
        </Box>
      );
    }

    if (thought.type === 'claude_response') {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            Claude Response:
          </Typography>
          {isExpanded && thought.response ? (
            <SyntaxHighlighter
              language="markdown"
              style={atomOneDark}
              customStyle={{
                maxHeight: '400px',
                overflow: 'auto',
              }}
            >
              {thought.response}
            </SyntaxHighlighter>
          ) : (
            <Typography
              variant="body2"
              component="pre"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {thought.response?.substring(0, 200)}...
            </Typography>
          )}
          {thought.responseLength && (
            <Typography variant="caption" color="text.secondary">
              Response: {thought.responseLength} chars
            </Typography>
          )}
        </Box>
      );
    }

    if (thought.type === 'planning') {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            Planning:
          </Typography>
          <Typography variant="body2">
            {JSON.stringify(thought.plan, null, 2).substring(0, isExpanded ? undefined : 200)}
          </Typography>
        </Box>
      );
    }

    if (thought.type === 'decision') {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            Decision:
          </Typography>
          <Typography variant="body2">
            {JSON.stringify(thought.decision, null, 2).substring(0, isExpanded ? undefined : 200)}
          </Typography>
        </Box>
      );
    }

    // Default format
    return (
      <Typography variant="body2">
        {JSON.stringify(thought, null, 2).substring(0, isExpanded ? undefined : 200)}
      </Typography>
    );
  };

  const filteredThoughts = thoughts.filter((thought) => {
    if (selectedAgent !== 'all' && thought.agentId !== selectedAgent) {
      return false;
    }
    if (thoughtTypeFilter !== 'all' && thought.type !== thoughtTypeFilter) {
      return false;
    }
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        thought.prompt?.toLowerCase().includes(searchLower) ||
        thought.response?.toLowerCase().includes(searchLower) ||
        JSON.stringify(thought).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" gutterBottom>
          Agent Stream of Consciousness
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Agent</InputLabel>
            <Select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              label="Agent"
            >
              <MenuItem value="all">All Agents</MenuItem>
              {AGENT_TYPES.map((agent) => (
                <MenuItem key={agent} value={agent}>
                  {agent.charAt(0).toUpperCase() + agent.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={thoughtTypeFilter}
              onChange={(e) => setThoughtTypeFilter(e.target.value)}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="claude_query">Claude Query</MenuItem>
              <MenuItem value="claude_stream">Claude Stream</MenuItem>
              <MenuItem value="claude_response">Claude Response</MenuItem>
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="decision">Decision</MenuItem>
              <MenuItem value="analysis">Analysis</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search thoughts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon />,
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
            }
            label="Auto-scroll"
          />

          <IconButton
            onClick={() => setIsPaused(!isPaused)}
            color={isPaused ? 'error' : 'primary'}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>

          <IconButton onClick={() => setThoughts([])}>
            <ClearIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <List>
          {filteredThoughts.map((thought) => (
            <Paper
              key={thought.id}
              sx={{ mb: 1, p: 2 }}
              elevation={1}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getThoughtIcon(thought.type)}
                </ListItemIcon>
                <Chip
                  label={thought.agentId}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={thought.type}
                  size="small"
                  color={getThoughtColor(thought.type) as any}
                  sx={{ mr: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(thought.timestamp).toLocaleTimeString()}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  size="small"
                  onClick={() => toggleThoughtExpansion(thought.id)}
                >
                  {expandedThoughts.has(thought.id) ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </Box>

              <Box sx={{ pl: 4 }}>
                {formatThoughtContent(thought)}
              </Box>
            </Paper>
          ))}
        </List>

        {filteredThoughts.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {isPaused ? 'Paused - Click play to resume' : 'No thoughts to display'}
            </Typography>
          </Box>
        )}
      </Box>

      {isPaused && (
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            p: 2,
            zIndex: 1000,
            bgcolor: 'error.main',
            color: 'error.contrastText',
          }}
        >
          <Typography variant="h6">PAUSED</Typography>
        </Paper>
      )}
    </Box>
  );
}

export default AgentThoughts;
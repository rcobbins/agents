import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  NodeChange,
  EdgeChange,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  Grid,
  List,
  ListItem,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Timeline as TimelineIcon,
  Hub as HubIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface FlowNode extends Node {
  data: {
    label: string;
    status: 'active' | 'idle' | 'error';
    sent: number;
    received: number;
    lastActive: string | null;
  };
}

interface FlowEdge extends Edge {
  data?: {
    count: number;
    totalSize: number;
    types: [string, number][];
    priorities: [string, number][];
    averageSize: number;
    lastMessage: string;
  };
}

interface MessageFlow {
  from: string;
  to: string;
  type: string;
  priority: string;
  timestamp: string;
}

interface MessageDetail {
  id: string;
  from: string;
  to: string;
  type: string;
  priority: string;
  content: any;
  timestamp: string;
}

function MessageFlowVisualizer() {
  const { projectId } = useParams<{ projectId: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [flowData, setFlowData] = useState<any>(null);
  const [recentFlows, setRecentFlows] = useState<MessageFlow[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<FlowEdge | null>(null);
  const [messageHistory, setMessageHistory] = useState<MessageDetail[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [flowStats, setFlowStats] = useState<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const flowAnimationsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    loadFlowData();
    if (isLive) {
      connectWebSocket();
      const interval = setInterval(loadFlowStats, 10000);
      return () => {
        clearInterval(interval);
        disconnectWebSocket();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
    return () => {
      disconnectWebSocket();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLive]);

  const loadFlowData = async () => {
    try {
      const response = await api.get('/flows');
      processFlowData(response.data);
    } catch (error) {
      console.error('Failed to load flow data:', error);
    }
  };

  const loadFlowStats = async () => {
    try {
      const response = await api.get('/flows/stats');
      setFlowStats(response.data);
    } catch (error) {
      console.error('Failed to load flow stats:', error);
    }
  };

  const loadMessageHistory = async (from?: string, to?: string) => {
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (filterType) params.append('type', filterType);
      params.append('limit', '50');
      
      const response = await api.get(`/flows/history?${params.toString()}`);
      setMessageHistory(response.data.messages);
    } catch (error) {
      console.error('Failed to load message history:', error);
    }
  };

  const processFlowData = (data: any) => {
    setFlowData(data);
    
    // Create nodes with positions
    const newNodes: FlowNode[] = data.nodes.map((node: any, index: number) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      const radius = 250;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);
      
      return {
        id: node.id,
        type: 'default',
        position: { x, y },
        data: {
          label: node.label,
          status: node.status,
          sent: node.sent,
          received: node.received,
          lastActive: node.lastActive,
        },
        style: {
          background: getNodeColor(node.status),
          color: '#fff',
          border: '2px solid #333',
          borderRadius: '8px',
          fontSize: '12px',
          width: 150,
          padding: '10px',
        },
      };
    });
    
    // Create edges with data
    const newEdges: FlowEdge[] = data.edges.map((edge: any, index: number) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edge.count > 0,
      data: edge,
      style: {
        stroke: getEdgeColor(edge.priorities),
        strokeWidth: Math.min(edge.count / 10 + 1, 5),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: getEdgeColor(edge.priorities),
      },
      label: `${edge.count} msgs`,
      labelStyle: {
        fontSize: '10px',
        fontWeight: 600,
      },
    }));
    
    setNodes(newNodes);
    setEdges(newEdges);
    
    // Set recent flows
    if (data.recentFlows) {
      setRecentFlows(data.recentFlows);
      animateRecentFlows(data.recentFlows, newEdges);
    }
  };

  const animateRecentFlows = (flows: MessageFlow[], edges: FlowEdge[]) => {
    // Cancel previous animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Animate message particles along edges
    const animate = () => {
      const now = Date.now();
      
      flows.slice(-10).forEach((flow) => {
        const edgeId = `${flow.from}-${flow.to}`;
        const lastAnimation = flowAnimationsRef.current.get(edgeId) || 0;
        
        if (now - lastAnimation > 2000) { // Animate every 2 seconds
          flowAnimationsRef.current.set(edgeId, now);
          
          // Update edge animation
          setEdges((eds) =>
            eds.map((edge) => {
              if (edge.id === edgeId) {
                return {
                  ...edge,
                  animated: true,
                  style: {
                    ...edge.style,
                    stroke: getPriorityColor(flow.priority),
                    strokeWidth: 3,
                  },
                };
              }
              return edge;
            })
          );
          
          // Reset animation after 1 second
          setTimeout(() => {
            setEdges((eds) =>
              eds.map((edge) => {
                if (edge.id === edgeId) {
                  return {
                    ...edge,
                    animated: false,
                    style: {
                      ...edge.style,
                      strokeWidth: Math.min((edge.data?.count || 0) / 10 + 1, 5),
                    },
                  };
                }
                return edge;
              })
            );
          }, 1000);
        }
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const connectWebSocket = () => {
    socketService.connect();
    
    socketService.on('flow:update', (data: MessageFlow) => {
      // Add to recent flows
      setRecentFlows(prev => [...prev.slice(-49), data]);
      
      // Update edge animation
      const edgeId = `${data.from}-${data.to}`;
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const updatedData = edge.data ? {
              ...edge.data,
              count: edge.data.count + 1,
              lastMessage: data.timestamp,
            } : undefined;
            
            return {
              ...edge,
              data: updatedData,
              label: `${updatedData?.count || 1} msgs`,
              animated: true,
              style: {
                ...edge.style,
                stroke: getPriorityColor(data.priority),
                strokeWidth: Math.min((updatedData?.count || 0) / 10 + 1, 5),
              },
            };
          }
          return edge;
        })
      );
      
      // Update node status
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === data.from) {
            return {
              ...node,
              data: {
                ...node.data,
                sent: node.data.sent + 1,
                status: 'active' as const,
                lastActive: data.timestamp,
              },
              style: {
                ...node.style,
                background: getNodeColor('active'),
              },
            };
          }
          if (node.id === data.to) {
            return {
              ...node,
              data: {
                ...node.data,
                received: node.data.received + 1,
                status: 'active' as const,
                lastActive: data.timestamp,
              },
              style: {
                ...node.style,
                background: getNodeColor('active'),
              },
            };
          }
          return node;
        })
      );
    });
    
    socketService.on('agent:activity', (data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === data.agentName) {
            return {
              ...node,
              data: {
                ...node.data,
                status: data.status,
              },
              style: {
                ...node.style,
                background: getNodeColor(data.status),
              },
            };
          }
          return node;
        })
      );
    });
  };

  const disconnectWebSocket = () => {
    socketService.off('flow:update');
    socketService.off('agent:activity');
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4caf50';
      case 'idle':
        return '#2196f3';
      case 'error':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getEdgeColor = (priorities: [string, number][] = []) => {
    const hasCritical = priorities.some(([p]) => p === 'critical');
    const hasHigh = priorities.some(([p]) => p === 'high');
    
    if (hasCritical) return '#f44336';
    if (hasHigh) return '#ff9800';
    return '#2196f3';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#f44336';
      case 'high':
        return '#ff9800';
      case 'normal':
        return '#2196f3';
      case 'low':
        return '#9e9e9e';
      default:
        return '#2196f3';
    }
  };

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge as FlowEdge);
    const [from, to] = edge.id.split('-');
    loadMessageHistory(from, to);
  }, []);

  const handleClearFlows = async () => {
    try {
      await api.delete('/flows');
      toast.success('Flow data cleared');
      loadFlowData();
    } catch (error) {
      toast.error('Failed to clear flow data');
    }
  };

  const nodeTypes = {
    default: ({ data }: { data: FlowNode['data'] }) => (
      <Card sx={{ minWidth: 150 }}>
        <CardContent sx={{ p: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {data.label}
          </Typography>
          <Box display="flex" justifyContent="space-between">
            <Chip
              label={data.status}
              size="small"
              color={
                data.status === 'active'
                  ? 'success'
                  : data.status === 'error'
                  ? 'error'
                  : 'default'
              }
            />
          </Box>
          <Typography variant="caption" display="block" mt={1}>
            Sent: {data.sent} | Recv: {data.received}
          </Typography>
          {data.lastActive && (
            <Typography variant="caption" color="text.secondary">
              Last: {new Date(data.lastActive).toLocaleTimeString()}
            </Typography>
          )}
        </CardContent>
      </Card>
    ),
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Typography variant="h5" display="flex" alignItems="center" gap={1}>
              <HubIcon />
              Message Flow Visualizer
            </Typography>
          </Grid>
          <Grid item>
            <Box display="flex" gap={1}>
              <Button
                startIcon={isLive ? <PauseIcon /> : <PlayIcon />}
                onClick={() => setIsLive(!isLive)}
                variant={isLive ? 'contained' : 'outlined'}
              >
                {isLive ? 'Live' : 'Paused'}
              </Button>
              <IconButton onClick={loadFlowData}>
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                <FilterIcon />
              </IconButton>
              <IconButton onClick={handleClearFlows} color="error">
                <ClearIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        {showFilters && (
          <Box mt={2} display="flex" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="task">Task</MenuItem>
                <MenuItem value="result">Result</MenuItem>
                <MenuItem value="query">Query</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                label="Priority"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="top-right"
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </Box>

      {flowStats && (
        <Paper sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">
                Total Messages
              </Typography>
              <Typography variant="h6">
                {flowData?.stats?.totalMessages || 0}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">
                Delivered
              </Typography>
              <Typography variant="h6">
                {flowData?.stats?.totalDelivered || 0}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">
                Active Agents
              </Typography>
              <Typography variant="h6">
                {flowData?.stats?.activeAgents || 0}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">
                Message Rate
              </Typography>
              <Typography variant="h6">
                {flowStats?.messageCount || 0}/hr
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Dialog
        open={!!selectedEdge}
        onClose={() => setSelectedEdge(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedEdge && (
          <>
            <DialogTitle>
              Message Flow: {selectedEdge.source} → {selectedEdge.target}
            </DialogTitle>
            <DialogContent>
              {selectedEdge.data && (
                <Box mb={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Total Messages
                      </Typography>
                      <Typography variant="h6">{selectedEdge.data.count}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Average Size
                      </Typography>
                      <Typography variant="h6">
                        {selectedEdge.data.averageSize} bytes
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Message Types
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedEdge.data.types.map(([type, count]) => (
                        <Chip
                          key={type}
                          label={`${type}: ${count}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Priorities
                    </Typography>
                    <Box display="flex" gap={1}>
                      {selectedEdge.data.priorities.map(([priority, count]) => (
                        <Chip
                          key={priority}
                          label={`${priority}: ${count}`}
                          size="small"
                          color={
                            priority === 'critical'
                              ? 'error'
                              : priority === 'high'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Recent Messages
              </Typography>
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {messageHistory.map((msg) => (
                  <ListItem key={msg.id}>
                    <ListItemText
                      primary={
                        <Box display="flex" gap={1} alignItems="center">
                          <Chip label={msg.type} size="small" />
                          <Chip
                            label={msg.priority}
                            size="small"
                            color={
                              msg.priority === 'critical'
                                ? 'error'
                                : msg.priority === 'high'
                                ? 'warning'
                                : 'default'
                            }
                          />
                          <Typography variant="caption">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {typeof msg.content === 'object'
                            ? JSON.stringify(msg.content, null, 2)
                            : msg.content}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default MessageFlowVisualizer;
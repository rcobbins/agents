import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as DeliveredIcon,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface DirectMessage {
  id: string;
  to: string;
  from: 'user';
  type: 'interrupt' | 'suggestion' | 'correction' | 'info' | 'user_intervention';
  priority: 'critical' | 'high' | 'normal' | 'low';
  content: string;
  timestamp: Date;
  delivered: boolean;
  acknowledged?: boolean;
  response?: string;
}

interface DirectMessagePanelProps {
  projectId: string;
  agentId: string;
  agentStatus?: string;
}

const DirectMessagePanel: React.FC<DirectMessagePanelProps> = ({
  projectId,
  agentId,
  agentStatus,
}) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<DirectMessage['type']>('info');
  const [priority, setPriority] = useState<DirectMessage['priority']>('normal');
  const [messageHistory, setMessageHistory] = useState<DirectMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Listen for message acknowledgments
    socketService.on('message:acknowledged', (data: any) => {
      if (data.originalMessageId) {
        setMessageHistory((prev) =>
          prev.map((msg) =>
            msg.id === data.originalMessageId
              ? { ...msg, acknowledged: true, response: data.response }
              : msg
          )
        );
      }
    });

    return () => {
      socketService.off('message:acknowledged');
    };
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/agents/${projectId}/${agentId}/message`, {
        content: message,
        type: messageType,
        priority,
      });

      const newMessage: DirectMessage = {
        id: response.data.messageId,
        to: agentId,
        from: 'user',
        type: messageType,
        priority,
        content: message,
        timestamp: new Date(),
        delivered: response.data.delivered,
      };

      setMessageHistory((prev) => [newMessage, ...prev].slice(0, 50)); // Keep last 50
      setMessage('');
      
      toast.success(`Message sent to ${agentId} with ${priority} priority`);
      
      // Reset to defaults after critical/high priority messages
      if (priority === 'critical' || priority === 'high') {
        setPriority('normal');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getTypeIcon = (type: DirectMessage['type']) => {
    switch (type) {
      case 'interrupt':
        return <ErrorIcon color="error" />;
      case 'suggestion':
        return <InfoIcon color="info" />;
      case 'correction':
        return <WarningIcon color="warning" />;
      case 'info':
      default:
        return <InfoIcon color="primary" />;
    }
  };

  const getPriorityColor = (priority: DirectMessage['priority']) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'primary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const isAgentRunning = agentStatus === 'running';

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Direct Message to {agentId}
        </Typography>
        <Chip
          label={isAgentRunning ? 'Online' : 'Offline'}
          color={isAgentRunning ? 'success' : 'default'}
          size="small"
        />
      </Box>

      {!isAgentRunning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Agent is not running. Messages will be queued for delivery.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as DirectMessage['type'])}
            label="Type"
          >
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="suggestion">Suggestion</MenuItem>
            <MenuItem value="correction">Correction</MenuItem>
            <MenuItem value="interrupt">Interrupt</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as DirectMessage['priority'])}
            label="Priority"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TextField
        fullWidth
        multiline
        rows={4}
        placeholder={`Enter your ${messageType} message for ${agentId}...`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            sendMessage();
          }
        }}
        sx={{ mb: 2 }}
        disabled={sending}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={sendMessage}
          disabled={sending || !message.trim()}
          color={priority === 'critical' ? 'error' : priority === 'high' ? 'warning' : 'primary'}
        >
          Send {priority !== 'normal' && `(${priority})`}
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide' : 'Show'} History ({messageHistory.length})
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
        Tip: Use Ctrl+Enter to send message quickly
      </Typography>

      <Collapse in={showHistory}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Message History
        </Typography>
        
        {messageHistory.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No messages sent yet
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {messageHistory.map((msg) => (
              <ListItem key={msg.id}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {msg.delivered ? (
                    msg.acknowledged ? (
                      <CheckCircle color="success" />
                    ) : (
                      <DeliveredIcon color="primary" />
                    )
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {getTypeIcon(msg.type)}
                      <Chip
                        label={msg.priority}
                        size="small"
                        color={getPriorityColor(msg.priority) as any}
                      />
                      <Typography variant="caption">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="div">
                        {msg.content}
                      </Typography>
                      {msg.response && (
                        <Typography
                          variant="caption"
                          component="div"
                          color="success.main"
                          sx={{ mt: 0.5 }}
                        >
                          Agent response: {msg.response}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};

export default DirectMessagePanel;
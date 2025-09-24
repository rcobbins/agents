import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Chip,
  Stack,
  CircularProgress,
  Button,
  Collapse,
  Fab,
  Badge,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Send,
  SmartToy,
  ExpandMore,
  ExpandLess,
  Lightbulb,
  Help,
  AutoAwesome,
  Close,
  Chat,
} from '@mui/icons-material';
import { ProjectAssistant, AssistantMessage } from '../../utils/aiAssistant';

interface ProjectAssistantPanelProps {
  projectType?: string;
  techStack: string[];
  currentStep: string;
}

const ProjectAssistantPanel: React.FC<ProjectAssistantPanelProps> = ({
  projectType,
  techStack,
  currentStep
}) => {
  const [assistant] = useState(() => new ProjectAssistant());
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const quickPrompts = [
    "What's the best tech stack?",
    "Explain this architecture",
    "Suggest project goals",
    "Help with testing strategy",
    "What template should I use?"
  ];

  useEffect(() => {
    // Update assistant context
    assistant.updateContext({
      projectType,
      techStack,
      currentStep,
      experience: 'beginner' // Could be dynamic
    });
  }, [projectType, techStack, currentStep, assistant]);

  useEffect(() => {
    // Scroll to bottom when messages update
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Reset unread count when expanded
    if (expanded) {
      setUnreadCount(0);
    }
  }, [messages, expanded]);

  useEffect(() => {
    // Track unread messages when panel is collapsed
    if (!expanded && messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages, expanded]);

  useEffect(() => {
    // Initial greeting
    const greeting: AssistantMessage = {
      role: 'assistant',
      content: "👋 Hi! I'm here to help you set up your project. Ask me anything about technologies, templates, or best practices!",
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: AssistantMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await assistant.processMessage(input);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      const errorMessage: AssistantMessage = {
        role: 'assistant',
        content: "Sorry, I couldn't process that request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSend();
  };

  // Mobile floating toggle button
  const FloatingToggle = () => (
    <Fab
      color="primary"
      aria-label="toggle assistant"
      onClick={() => setExpanded(!expanded)}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: expanded ? 'none' : { xs: 'flex', sm: 'none' },
        zIndex: 1100,
      }}
    >
      <Badge badgeContent={unreadCount} color="error">
        <Chat />
      </Badge>
    </Fab>
  );

  return (
    <>
    <Paper 
      elevation={6} 
      sx={{ 
        position: 'fixed',
        bottom: { xs: 0, sm: 20 },
        right: { xs: 0, sm: 20 },
        width: { xs: '100%', sm: 380, md: 420 },
        height: expanded ? { xs: '60vh', sm: '50vh', md: '60vh' } : 60,
        maxHeight: expanded ? { xs: '60vh', sm: '500px', md: '600px' } : 60,
        minHeight: expanded ? 300 : 60,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        overflow: 'hidden',
        zIndex: 1200,
        borderRadius: { xs: '16px 16px 0 0', sm: 2 }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderRadius: expanded ? 0 : { xs: '16px 16px 0 0', sm: 1 },
          boxShadow: expanded ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy />
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>AI Assistant</Typography>
          {!expanded && (
            <Chip
              label={`${messages.length - 1} messages`}
              size="small"
              sx={{ bgcolor: 'primary.dark', color: 'white' }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isMobile && expanded && (
            <IconButton size="small" sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); setExpanded(false); }}>
              <Close />
            </IconButton>
          )}
          <IconButton size="small" sx={{ color: 'white', display: { xs: 'none', sm: 'inline-flex' } }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Context Info */}
          {(projectType || techStack.length > 0) && (
            <Box sx={{ 
              p: 1, 
              bgcolor: 'grey.50', 
              borderBottom: 1, 
              borderColor: 'divider',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 1 }
            }}>
              <Stack direction="row" spacing={1} sx={{ minWidth: 'fit-content' }}>
                {projectType && (
                  <Chip label={`Type: ${projectType}`} size="small" variant="outlined" />
                )}
                {techStack.length > 0 && (
                  <Chip 
                    label={`Stack: ${techStack.slice(0, 2).join(', ')}${techStack.length > 2 ? '...' : ''}`} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
                <Chip label={`Step: ${currentStep}`} size="small" variant="outlined" />
              </Stack>
            </Box>
          )}

          {/* Messages */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            p: { xs: 1.5, sm: 2 }, 
            bgcolor: 'background.paper',
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-thumb': { 
              bgcolor: 'grey.400', 
              borderRadius: 1,
              '&:hover': { bgcolor: 'grey.500' }
            }
          }}>
            <List sx={{ p: 0 }}>
              {messages.map((message, index) => (
                <ListItem
                  key={index}
                  sx={{
                    flexDirection: 'column',
                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    p: 0.5,
                    px: 0
                  }}
                >
                  <Paper
                    elevation={message.role === 'user' ? 2 : 0}
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      maxWidth: '85%',
                      bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                      color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      wordBreak: 'break-word',
                      border: message.role === 'assistant' ? '1px solid' : 'none',
                      borderColor: 'grey.300'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        color: message.role === 'user' ? 'primary.contrastText' : 'grey.900',
                        backgroundColor: 'transparent',
                        display: 'block',
                        fontSize: { xs: '0.85rem', sm: '0.875rem' }
                      }}
                    >
                      {message.content}
                    </Typography>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                        {message.suggestions.map((suggestion, idx) => (
                          <Chip
                            key={idx}
                            label={suggestion.label}
                            size="small"
                            onClick={() => {/* Handle suggestion click */}}
                            clickable
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    )}
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </ListItem>
              ))}
              {loading && (
                <ListItem sx={{ justifyContent: 'center' }}>
                  <CircularProgress size={20} />
                </ListItem>
              )}
            </List>
            <div ref={messagesEndRef} />
          </Box>

          {/* Quick Prompts */}
          <Box sx={{ 
            p: { xs: 1, sm: 1.5 }, 
            borderTop: 1, 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: 'grey.50',
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { 
              bgcolor: 'grey.400', 
              borderRadius: 1,
              '&:hover': { bgcolor: 'grey.500' }
            }
          }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 'fit-content' }}>
              <Lightbulb sx={{ color: 'primary.main', fontSize: { xs: 18, sm: 20 }, flexShrink: 0 }} />
              {quickPrompts.slice(0, expanded ? 5 : 3).map((prompt, index) => (
                <Chip
                  key={index}
                  label={prompt}
                  size="small"
                  onClick={() => handleQuickPrompt(prompt)}
                  clickable
                  variant="outlined"
                  color="primary"
                  sx={{ 
                    flexShrink: 0,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 }
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Input */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            display: 'flex', 
            gap: 1,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider'
          }}>
            <TextField
              fullWidth
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              size="small"
              multiline
              maxRows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: { xs: '0.875rem', sm: '0.9rem' }
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              sx={{ 
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 }
              }}
            >
              <Send sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Paper>
      <FloatingToggle />
    </>
  );
};

export default ProjectAssistantPanel;
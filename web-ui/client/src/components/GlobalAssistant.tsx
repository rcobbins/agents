import React, { useRef, useEffect, useState } from 'react';
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
  Tooltip,
  Divider,
  Alert,
  Menu,
  MenuItem,
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
  Clear,
  Settings,
  Minimize,
  OpenInFull,
  PushPin,
  History,
} from '@mui/icons-material';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import { getContextualSuggestions } from '../utils/pageContextAnalyzer';

type DisplayMode = 'floating' | 'docked' | 'minimized';

const GlobalAssistant: React.FC = () => {
  const {
    currentPageMessages,
    input,
    setInput,
    loading,
    expanded,
    setExpanded,
    unreadCount,
    pageContext,
    sendMessage,
    clearPageHistory,
    getQuickPrompts,
  } = useAIAssistant();

  const [displayMode, setDisplayMode] = useState<DisplayMode>('floating');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Get quick prompts based on current page
  const quickPrompts = getQuickPrompts();
  const contextualSuggestions = getContextualSuggestions(pageContext);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentPageMessages, expanded]);

  // Handle keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setExpanded(!expanded);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, setExpanded]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    await sendMessage(input);
  };

  const handleQuickPrompt = async (prompt: string) => {
    setInput(prompt);
    await sendMessage(prompt);
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setAnchorEl(null);
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    handleSettingsClose();
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
        display: displayMode === 'minimized' || (!expanded && isMobile) ? 'flex' : 'none',
        zIndex: 1100,
      }}
    >
      <Badge badgeContent={unreadCount} color="error">
        <Chat />
      </Badge>
    </Fab>
  );

  // Get position styles based on display mode
  const getPositionStyles = () => {
    switch (displayMode) {
      case 'docked':
        return {
          position: 'fixed' as const,
          bottom: 0,
          right: 0,
          width: { xs: '100%', sm: 420, md: 480 },
          height: expanded ? '100vh' : 60,
          maxHeight: '100vh',
          borderRadius: 0,
        };
      case 'minimized':
        return {
          position: 'fixed' as const,
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          display: isMobile ? 'none' : 'flex',
        };
      default: // floating
        return {
          position: 'fixed' as const,
          bottom: { xs: 0, sm: 20 },
          right: { xs: 0, sm: 20 },
          width: { xs: '100%', sm: 380, md: 420 },
          height: expanded ? { xs: '70vh', sm: '60vh', md: '65vh' } : 60,
          maxHeight: expanded ? { xs: '70vh', sm: 600, md: 700 } : 60,
          borderRadius: { xs: expanded ? '16px 16px 0 0' : 0, sm: 2 },
        };
    }
  };

  if (displayMode === 'minimized' && !isMobile) {
    return (
      <>
        <Paper
          elevation={6}
          sx={{
            ...getPositionStyles(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1200,
            '&:hover': {
              transform: 'scale(1.1)',
            },
            transition: 'transform 0.2s',
          }}
          onClick={() => setDisplayMode('floating')}
        >
          <Badge badgeContent={unreadCount} color="error">
            <SmartToy sx={{ fontSize: 32 }} color="primary" />
          </Badge>
        </Paper>
        <FloatingToggle />
      </>
    );
  }

  return (
    <>
      <Paper
        elevation={displayMode === 'docked' ? 0 : 6}
        sx={{
          ...getPositionStyles(),
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
          overflow: 'hidden',
          zIndex: 1200,
          border: displayMode === 'docked' ? '1px solid' : 'none',
          borderColor: 'divider',
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
            boxShadow: expanded ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy />
            <Box>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                AI Assistant
              </Typography>
              {!expanded && (
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {pageContext.pageName} • Press Ctrl+K
                </Typography>
              )}
            </Box>
            {!expanded && unreadCount > 0 && (
              <Chip
                label={`${unreadCount} new`}
                size="small"
                sx={{ bgcolor: 'error.main', color: 'white', ml: 1 }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {expanded && (
              <>
                <Tooltip title="Clear history">
                  <IconButton 
                    size="small" 
                    sx={{ color: 'white' }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      clearPageHistory(); 
                    }}
                  >
                    <Clear />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Settings">
                  <IconButton 
                    size="small" 
                    sx={{ color: 'white' }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleSettingsClick(e);
                    }}
                  >
                    <Settings />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <IconButton size="small" sx={{ color: 'white' }}>
              {expanded ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          </Box>
        </Box>

        {/* Settings Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleSettingsClose}
        >
          <MenuItem onClick={() => handleDisplayModeChange('floating')}>
            <OpenInFull sx={{ mr: 1, fontSize: 20 }} /> Floating
          </MenuItem>
          <MenuItem onClick={() => handleDisplayModeChange('docked')}>
            <PushPin sx={{ mr: 1, fontSize: 20 }} /> Docked
          </MenuItem>
          <MenuItem onClick={() => handleDisplayModeChange('minimized')}>
            <Minimize sx={{ mr: 1, fontSize: 20 }} /> Minimize
          </MenuItem>
        </Menu>

        <Collapse in={expanded}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Context Info Bar */}
            <Box sx={{ 
              p: 1, 
              bgcolor: 'grey.100', 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 1 },
            }}>
              <Chip 
                label={pageContext.pageName} 
                size="small" 
                color="primary"
                variant="outlined" 
              />
              {pageContext.projectId && (
                <Chip 
                  label={`Project: ${pageContext.projectId.slice(0, 8)}...`} 
                  size="small" 
                  variant="outlined" 
                />
              )}
              {pageContext.errors && pageContext.errors.length > 0 && (
                <Chip 
                  label={`${pageContext.errors.length} errors`} 
                  size="small" 
                  color="error"
                  variant="filled"
                />
              )}
              {pageContext.warnings && pageContext.warnings.length > 0 && (
                <Chip 
                  label={`${pageContext.warnings.length} warnings`} 
                  size="small" 
                  color="warning"
                  variant="filled"
                />
              )}
            </Box>

            {/* Contextual Alert */}
            {pageContext.errors && pageContext.errors.length > 0 && (
              <Alert 
                severity="error" 
                sx={{ m: 1, mb: 0 }}
                action={
                  <Button 
                    size="small" 
                    onClick={() => handleQuickPrompt('Help me fix these errors')}
                  >
                    Get Help
                  </Button>
                }
              >
                {pageContext.errors[0]}
              </Alert>
            )}

            {/* Messages */}
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              p: { xs: 1.5, sm: 2 }, 
              bgcolor: 'background.paper',
              minHeight: 0, // Important for flex scrolling
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-thumb': { 
                bgcolor: 'grey.400', 
                borderRadius: 1,
                '&:hover': { bgcolor: 'grey.500' }
              }
            }}>
              <List sx={{ p: 0 }}>
                {currentPageMessages.map((message, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      p: 0.5,
                      px: 0,
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
                        borderColor: 'grey.300',
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          fontSize: { xs: '0.85rem', sm: '0.875rem' },
                        }}
                      >
                        {message.content}
                      </Typography>
                      {message.suggestions && message.suggestions.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                          {message.suggestions.map((suggestion, idx) => (
                            <Chip
                              key={idx}
                              label={suggestion.label}
                              size="small"
                              onClick={() => handleQuickPrompt(suggestion.label)}
                              clickable
                              color="primary"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
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

            {/* Contextual Suggestions */}
            {showSuggestions && contextualSuggestions.length > 0 && (
              <Box sx={{ 
                p: 1, 
                borderTop: 1, 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'warning.light',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <AutoAwesome sx={{ color: 'warning.dark', fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 500 }}>
                  Suggested based on page:
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {contextualSuggestions.slice(0, 2).map((suggestion, idx) => (
                    <Chip
                      key={idx}
                      label={suggestion}
                      size="small"
                      onClick={() => handleQuickPrompt(suggestion)}
                      clickable
                      sx={{ 
                        bgcolor: 'warning.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'warning.dark' }
                      }}
                    />
                  ))}
                </Stack>
                <IconButton 
                  size="small" 
                  onClick={() => setShowSuggestions(false)}
                  sx={{ ml: 'auto' }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            )}

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
                {quickPrompts.slice(0, isMobile ? 3 : 5).map((prompt, index) => (
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
                      height: { xs: 24, sm: 28 },
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
              borderColor: 'divider',
            }}>
              <TextField
                fullWidth
                placeholder={`Ask about ${pageContext.pageName}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                size="small"
                multiline
                maxRows={3}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '0.875rem', sm: '0.9rem' },
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                sx={{ 
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
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

export default GlobalAssistant;
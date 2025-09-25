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
      aria-label="toggle assistant"
      onClick={() => setExpanded(!expanded)}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: displayMode === 'minimized' || (!expanded && isMobile) ? 'flex' : 'none',
        zIndex: 1100,
        bgcolor: 'rgba(25,25,25,0.9)',
        backdropFilter: 'blur(10px)',
        color: 'primary.light',
        border: '1px solid rgba(144, 202, 249, 0.2)',
        '&:hover': {
          bgcolor: 'rgba(30,30,30,0.95)',
          transform: 'scale(1.05)',
        },
        transition: 'all 0.2s ease',
      }}
    >
      <Badge 
        badgeContent={unreadCount} 
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: 'error.dark',
            color: 'white',
            fontSize: '0.65rem',
            minWidth: 16,
            height: 16,
          }
        }}
      >
        <Chat sx={{ fontSize: 22 }} />
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
          width: { xs: '100%', sm: 340, md: 360 },
          height: expanded ? '100vh' : 56,
          maxHeight: '100vh',
          borderRadius: 0,
        };
      case 'minimized':
        return {
          position: 'fixed' as const,
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          display: isMobile ? 'none' : 'flex',
        };
      default: // floating
        return {
          position: 'fixed' as const,
          bottom: { xs: 0, sm: 20 },
          right: { xs: 0, sm: 20 },
          width: { xs: '100%', sm: 320, md: 340 },
          maxWidth: { xs: '100%', sm: 320, md: 340 },
          height: expanded ? { xs: '75vh', sm: '50vh', md: '50vh' } : 56,
          maxHeight: expanded ? { xs: '75vh', sm: 500, md: 550 } : 56,
          borderRadius: { xs: expanded ? '16px 16px 0 0' : 0, sm: '8px' },
        };
    }
  };

  if (displayMode === 'minimized' && !isMobile) {
    return (
      <>
        <Paper
          elevation={0}
          sx={{
            ...getPositionStyles(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1200,
            bgcolor: 'rgba(25,25,25,0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(144, 202, 249, 0.2)',
            '&:hover': {
              transform: 'scale(1.08)',
              bgcolor: 'rgba(30,30,30,0.95)',
            },
            transition: 'all 0.2s ease',
          }}
          onClick={() => setDisplayMode('floating')}
        >
          <Badge 
            badgeContent={unreadCount}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: 'error.dark',
                color: 'white',
                fontSize: '0.65rem',
                minWidth: 16,
                height: 16,
              }
            }}
          >
            <SmartToy sx={{ fontSize: 28, color: 'primary.light' }} />
          </Badge>
        </Paper>
        <FloatingToggle />
      </>
    );
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          ...getPositionStyles(),
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          zIndex: 1200,
          bgcolor: 'rgba(25,25,25,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: displayMode === 'docked' 
            ? 'rgba(255,255,255,0.08)' 
            : 'rgba(144, 202, 249, 0.15)',
          boxShadow: expanded 
            ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset' 
            : '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 1, sm: 1.5 },
            background: 'linear-gradient(135deg, rgba(25,25,25,0.95) 0%, rgba(40,40,40,0.95) 100%)',
            backdropFilter: 'blur(10px)',
            borderBottom: expanded ? '1px solid rgba(255,255,255,0.1)' : 'none',
            color: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(45,45,45,0.95) 100%)',
            }
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.light' }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500, color: 'grey.200' }} className="text-responsive-md">
                AI Assistant
              </Typography>
              {!expanded && (
                <Typography variant="caption" sx={{ opacity: 0.7 }} className="text-responsive-xs">
                  {pageContext.pageName} • Ctrl+K
                </Typography>
              )}
            </Box>
            {!expanded && unreadCount > 0 && (
              <Chip
                label={`${unreadCount}`}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(239, 83, 80, 0.2)', 
                  color: 'error.light', 
                  ml: 1,
                  height: 20,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {expanded && (
              <>
                <Tooltip title="Clear history">
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: 'grey.400',
                      '&:hover': { color: 'grey.200' }
                    }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      clearPageHistory(); 
                    }}
                  >
                    <Clear sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Settings">
                  <IconButton 
                    size="small" 
                    sx={{ 
                      color: 'grey.400',
                      '&:hover': { color: 'grey.200' }
                    }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleSettingsClick(e);
                    }}
                  >
                    <Settings sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <IconButton size="small" sx={{ color: 'grey.400', '&:hover': { color: 'grey.200' } }}>
              {expanded ? <ExpandMore sx={{ fontSize: 20 }} /> : <ExpandLess sx={{ fontSize: 20 }} />}
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
            {/* Context Info Bar - Simplified and subtle */}
            {(pageContext.projectId || (pageContext.errors && pageContext.errors.length > 0) || (pageContext.warnings && pageContext.warnings.length > 0)) && (
              <Box sx={{ 
                px: 1.5,
                py: 0.75,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  borderRadius: 2 
                },
              }}>
                <Typography variant="caption" sx={{ color: 'grey.500' }} className="text-responsive-xs text-ellipsis">
                  {pageContext.pageName}
                </Typography>
                {pageContext.projectId && (
                  <Typography variant="caption" sx={{ color: 'grey.600' }} className="text-responsive-xs">
                    • {pageContext.projectId.slice(0, 8)}
                  </Typography>
                )}
                {pageContext.errors && pageContext.errors.length > 0 && (
                  <Chip 
                    label={`${pageContext.errors.length} errors`} 
                    size="small" 
                    sx={{ 
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(239, 83, 80, 0.15)',
                      color: 'error.light',
                      '& .MuiChip-label': { px: 0.75 }
                    }}
                  />
                )}
                {pageContext.warnings && pageContext.warnings.length > 0 && (
                  <Chip 
                    label={`${pageContext.warnings.length} warnings`} 
                    size="small" 
                    sx={{ 
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(255, 167, 38, 0.15)',
                      color: 'warning.light',
                      '& .MuiChip-label': { px: 0.75 }
                    }}
                  />
                )}
              </Box>
            )}

            {/* Subtle error hint - no intrusive alert */}
            {pageContext.errors && pageContext.errors.length > 0 && (
              <Box sx={{ 
                px: 1.5, 
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderBottom: '1px solid rgba(239, 83, 80, 0.1)',
                bgcolor: 'rgba(239, 83, 80, 0.03)'
              }}>
                <Typography variant="caption" sx={{ color: 'error.light', fontSize: '0.75rem', flex: 1 }}>
                  {pageContext.errors[0].substring(0, 80)}...
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => handleQuickPrompt('Help me fix these errors')}
                  sx={{ 
                    fontSize: '0.7rem',
                    py: 0.25,
                    px: 1,
                    minWidth: 'auto',
                    color: 'error.light',
                    '&:hover': {
                      bgcolor: 'rgba(239, 83, 80, 0.1)'
                    }
                  }}
                >
                  Fix
                </Button>
              </Box>
            )}

            {/* Messages */}
            <Box sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              p: { xs: 1, sm: 1.5 }, 
              minHeight: 0, // Important for flex scrolling
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': { 
                bgcolor: 'rgba(255,255,255,0.1)', 
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
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
                      elevation={0}
                      sx={{
                        p: { xs: 0.75, sm: 1 },
                        maxWidth: '85%',
                        bgcolor: message.role === 'user' 
                          ? 'rgba(144, 202, 249, 0.15)' 
                          : 'rgba(255,255,255,0.03)',
                        color: message.role === 'user' ? 'primary.light' : 'grey.200',
                        wordBreak: 'break-word',
                        border: '1px solid',
                        borderColor: message.role === 'user' 
                          ? 'rgba(144, 202, 249, 0.2)' 
                          : 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                        }}
                        className="text-responsive-md"
                      >
                        {message.content}
                      </Typography>
                      {message.suggestions && message.suggestions.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap' }} useFlexGap>
                          {message.suggestions.map((suggestion, idx) => (
                            <Chip
                              key={idx}
                              label={suggestion.label}
                              size="small"
                              onClick={() => handleQuickPrompt(suggestion.label)}
                              clickable
                              sx={{ 
                                mt: 0.5,
                                height: 20,
                                fontSize: '0.65rem',
                                bgcolor: 'rgba(144, 202, 249, 0.08)',
                                color: 'primary.light',
                                border: '1px solid rgba(144, 202, 249, 0.15)',
                                '&:hover': {
                                  bgcolor: 'rgba(144, 202, 249, 0.15)',
                                },
                                '& .MuiChip-label': { px: 0.75 }
                              }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Paper>
                    <Typography variant="caption" sx={{ color: 'grey.600', mt: 0.25, fontSize: '0.65rem' }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </ListItem>
                ))}
                {loading && (
                  <ListItem sx={{ justifyContent: 'center' }}>
                    <CircularProgress size={16} sx={{ color: 'primary.light' }} />
                  </ListItem>
                )}
              </List>
              <div ref={messagesEndRef} />
            </Box>

            {/* Quick Prompts - Subtle and compact */}
            <Box sx={{ 
              px: { xs: 1, sm: 1.5 },
              py: 0.75,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 3 },
              '&::-webkit-scrollbar-thumb': { 
                bgcolor: 'rgba(255,255,255,0.1)', 
                borderRadius: 2,
              }
            }}>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 'fit-content' }}>
                {quickPrompts.slice(0, isMobile ? 2 : 3).map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    size="small"
                    onClick={() => handleQuickPrompt(prompt)}
                    clickable
                    sx={{ 
                      flexShrink: 0,
                      fontSize: '0.65rem',
                      height: 22,
                      bgcolor: 'rgba(144, 202, 249, 0.08)',
                      color: 'primary.light',
                      border: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(144, 202, 249, 0.15)',
                      },
                      '& .MuiChip-label': { px: 0.75 }
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Input */}
            <Box sx={{ 
              p: { xs: 1, sm: 1.5 }, 
              display: 'flex', 
              gap: 0.75,
              borderTop: '1px solid rgba(255,255,255,0.05)',
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
                    bgcolor: 'rgba(255,255,255,0.03)',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.15)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.dark',
                      borderWidth: 1,
                    },
                  },
                  '& .MuiInputBase-input': {
                    fontSize: 'var(--font-md)',
                    color: 'grey.200',
                    '::placeholder': {
                      color: 'grey.600',
                      opacity: 1,
                    },
                  },
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || loading}
                sx={{ 
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  bgcolor: loading ? 'transparent' : 'rgba(144, 202, 249, 0.1)',
                  color: 'primary.light',
                  '&:hover': {
                    bgcolor: 'rgba(144, 202, 249, 0.2)',
                  },
                  '&.Mui-disabled': {
                    color: 'grey.700',
                  },
                }}
              >
                <Send sx={{ fontSize: { xs: 16, sm: 18 } }} />
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
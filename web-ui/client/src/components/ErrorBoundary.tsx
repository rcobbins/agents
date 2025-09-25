import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // You could also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />
            
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              {this.props.componentName
                ? `An error occurred in the ${this.props.componentName} component.`
                : 'An unexpected error occurred while rendering this component.'}
            </Typography>

            {this.state.error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2, textAlign: 'left' }}>
                <AlertTitle>Error Message</AlertTitle>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {this.state.error.message}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              
              {this.state.errorInfo && (
                <Button
                  variant="outlined"
                  endIcon={this.state.showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={this.toggleDetails}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Details
                </Button>
              )}
            </Box>

            <Collapse in={this.state.showDetails}>
              {this.state.errorInfo && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 2,
                    bgcolor: 'background.default',
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Component Stack:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              )}
            </Collapse>

            {this.state.errorCount > 1 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                This error has occurred {this.state.errorCount} times
              </Typography>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
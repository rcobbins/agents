import React from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import {
  AutoAwesome,
  Engineering,
  School,
} from '@mui/icons-material';

interface ModeSelectorProps {
  mode: 'guided' | 'expert';
  onChange: (mode: 'guided' | 'expert') => void;
  experience?: 'beginner' | 'intermediate' | 'advanced';
}

const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onChange,
  experience = 'beginner'
}) => {
  const getRecommendedMode = () => {
    return experience === 'beginner' ? 'guided' : 'expert';
  };

  const recommendedMode = getRecommendedMode();

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Choose Your Setup Mode
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select how you'd like to create your project
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, value) => value && onChange(value)}
        fullWidth
        size="large"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="guided" sx={{ py: 2 }}>
          <Stack spacing={1} alignItems="center">
            <AutoAwesome sx={{ fontSize: 28 }} />
            <Box textAlign="center">
              <Typography variant="subtitle1" fontWeight="bold">
                Guided Mode
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Step-by-step with recommendations
              </Typography>
              {recommendedMode === 'guided' && (
                <Chip label="Recommended" size="small" color="primary" sx={{ mt: 0.5 }} />
              )}
            </Box>
          </Stack>
        </ToggleButton>
        
        <ToggleButton value="expert" sx={{ py: 2 }}>
          <Stack spacing={1} alignItems="center">
            <Engineering sx={{ fontSize: 28 }} />
            <Box textAlign="center">
              <Typography variant="subtitle1" fontWeight="bold">
                Expert Mode
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Full control, no suggestions
              </Typography>
              {recommendedMode === 'expert' && (
                <Chip label="Recommended" size="small" color="primary" sx={{ mt: 0.5 }} />
              )}
            </Box>
          </Stack>
        </ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
        <School sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {mode === 'guided' 
            ? "Perfect for beginners! I'll help you make the right choices with templates, suggestions, and best practices."
            : "For experienced developers. You'll have full control with minimal interruptions."}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ModeSelector;
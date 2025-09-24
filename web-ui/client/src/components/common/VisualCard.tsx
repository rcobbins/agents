import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import { Check } from '@mui/icons-material';

interface VisualCardProps {
  title: string;
  description: string;
  icon: string | React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  badges?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  popularity?: number;
  disabled?: boolean;
  recommended?: boolean;
}

const VisualCard: React.FC<VisualCardProps> = ({
  title,
  description,
  icon,
  selected = false,
  onClick,
  badges = [],
  difficulty,
  popularity,
  disabled = false,
  recommended = false
}) => {
  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        '&:hover': {
          transform: disabled ? 'none' : 'translateY(-4px)',
          boxShadow: disabled ? 1 : 4,
        }
      }}
    >
      {recommended && (
        <Chip
          label="Recommended"
          size="small"
          color="primary"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1
          }}
        />
      )}
      
      <CardActionArea
        onClick={onClick}
        disabled={disabled}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {typeof icon === 'string' ? (
              <Typography variant="h2" sx={{ mr: 2 }}>
                {icon}
              </Typography>
            ) : (
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                {icon}
              </Box>
            )}
            {selected && (
              <Box
                sx={{
                  ml: 'auto',
                  backgroundColor: 'primary.main',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check sx={{ color: 'white', fontSize: 18 }} />
              </Box>
            )}
          </Box>
          
          <Typography variant="h6" component="div" gutterBottom>
            {title}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
            {difficulty && (
              <Chip
                label={difficulty}
                size="small"
                color={getDifficultyColor()}
                variant="outlined"
              />
            )}
            
            {popularity && (
              <Chip
                label={`${popularity}% popular`}
                size="small"
                variant="outlined"
              />
            )}
            
            {badges.map((badge, index) => (
              <Chip
                key={index}
                label={badge}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default VisualCard;
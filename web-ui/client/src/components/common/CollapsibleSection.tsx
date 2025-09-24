import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
  Chip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Settings,
} from '@mui/icons-material';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  elevation?: number;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  badge,
  icon,
  optional = false,
  elevation = 1
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Paper elevation={elevation} sx={{ mb: 2, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
          backgroundColor: expanded ? 'action.hover' : 'transparent',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && <Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>}
          <Box>
            <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {title}
              {optional && (
                <Chip label="Optional" size="small" variant="outlined" />
              )}
              {badge && (
                <Chip label={badge} size="small" color="primary" />
              )}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 2, pt: 0 }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default CollapsibleSection;
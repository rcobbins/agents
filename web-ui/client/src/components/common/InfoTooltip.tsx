import React from 'react';
import { Tooltip, IconButton, Box } from '@mui/material';
import { HelpOutline, InfoOutlined } from '@mui/icons-material';

interface InfoTooltipProps {
  title: string;
  content?: string;
  icon?: 'help' | 'info';
  size?: 'small' | 'medium';
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  icon = 'help',
  size = 'small',
  placement = 'top'
}) => {
  const Icon = icon === 'help' ? HelpOutline : InfoOutlined;
  
  const tooltipContent = (
    <Box>
      <div style={{ fontWeight: 'bold', marginBottom: content ? 4 : 0 }}>{title}</div>
      {content && <div style={{ fontSize: '0.9em' }}>{content}</div>}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} placement={placement} arrow>
      <IconButton size={size} sx={{ ml: 0.5, p: 0.5 }}>
        <Icon fontSize={size} sx={{ opacity: 0.6 }} />
      </IconButton>
    </Tooltip>
  );
};

export default InfoTooltip;
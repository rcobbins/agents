import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewModule,
  ViewList,
} from '@mui/icons-material';
import VisualCard from '../common/VisualCard';
import { PROJECT_TEMPLATES, ProjectTemplate, getMostPopularTemplates } from '../../data/projectTemplates';

interface TemplateChooserProps {
  projectType?: string;
  onSelect: (template: ProjectTemplate) => void;
  onSkip?: () => void;
}

const TemplateChooser: React.FC<TemplateChooserProps> = ({
  projectType,
  onSelect,
  onSkip
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredTemplates = useMemo(() => {
    let templates = Object.values(PROJECT_TEMPLATES);

    // Filter by project type if provided
    if (projectType) {
      templates = templates.filter(t => t.category === projectType);
    }

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower) ||
        t.techStack.some(tech => tech.toLowerCase().includes(lower))
      );
    }

    // Filter by difficulty
    if (difficultyFilter) {
      templates = templates.filter(t => t.difficulty === difficultyFilter);
    }

    // Sort by popularity
    return templates.sort((a, b) => b.popularityScore - a.popularityScore);
  }, [projectType, searchTerm, difficultyFilter]);

  const popularTemplates = getMostPopularTemplates(3);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Choose a Template
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Start with a pre-configured template for faster setup, or skip to customize from scratch.
        </Typography>
      </Box>

      {/* Quick Suggestions */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          🎯 Popular Templates
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {popularTemplates.map(template => (
            <Chip
              key={template.id}
              label={`${template.icon} ${template.name}`}
              onClick={() => onSelect(template)}
              clickable
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
      </Paper>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search templates by name, technology..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={difficultyFilter}
              exclusive
              onChange={(_, value) => setDifficultyFilter(value === 'all' ? null : value)}
              size="small"
              fullWidth
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="beginner">Beginner</ToggleButton>
              <ToggleButton value="intermediate">Intermediate</ToggleButton>
              <ToggleButton value="advanced">Advanced</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="grid">
                <ViewModule />
              </ToggleButton>
              <ToggleButton value="list">
                <ViewList />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Box>

      {/* Template Grid */}
      {filteredTemplates.length > 0 ? (
        <Grid container spacing={2}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={viewMode === 'grid' ? 6 : 12} md={viewMode === 'grid' ? 4 : 12} key={template.id}>
              {viewMode === 'grid' ? (
                <VisualCard
                  title={template.name}
                  description={template.description}
                  icon={template.icon}
                  onClick={() => onSelect(template)}
                  difficulty={template.difficulty}
                  popularity={template.popularityScore}
                  badges={[
                    `${template.setupTime} setup`,
                    `${template.techStack.length} technologies`
                  ]}
                />
              ) : (
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => onSelect(template)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h3">{template.icon}</Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {template.description}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip label={template.difficulty} size="small" />
                        <Chip label={`${template.setupTime}`} size="small" variant="outlined" />
                        {template.techStack.slice(0, 3).map(tech => (
                          <Chip key={tech} label={tech} size="small" variant="outlined" />
                        ))}
                        {template.techStack.length > 3 && (
                          <Chip label={`+${template.techStack.length - 3} more`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or search term
          </Typography>
        </Paper>
      )}

      {/* Skip Option */}
      {onSkip && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button onClick={onSkip} size="large">
            Skip Templates - Start from Scratch
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TemplateChooser;
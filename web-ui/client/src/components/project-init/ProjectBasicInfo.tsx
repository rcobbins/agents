import React from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Folder,
  Description,
  Label,
} from '@mui/icons-material';

interface ProjectBasicInfoProps {
  name: string;
  path: string;
  description: string;
  onChange: (field: 'name' | 'path' | 'description', value: string) => void;
  errors?: {
    name?: string;
    path?: string;
    description?: string;
  };
}

const ProjectBasicInfo: React.FC<ProjectBasicInfoProps> = ({
  name,
  path,
  description,
  onChange,
  errors = {}
}) => {
  // Auto-generate path from name if path is empty
  const handleNameChange = (value: string) => {
    onChange('name', value);
    if (!path && value) {
      // Convert name to valid path (lowercase, replace spaces with hyphens)
      const autoPath = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      onChange('path', `~/projects/${autoPath}`);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Project Information
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the basic details for your project
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Project Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            error={!!errors.name}
            helperText={errors.name || "The display name for your project"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Label />
                </InputAdornment>
              ),
            }}
            placeholder="My Awesome Project"
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Project Path"
            value={path}
            onChange={(e) => onChange('path', e.target.value)}
            error={!!errors.path}
            helperText={errors.path || "Where the project will be created"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Folder />
                </InputAdornment>
              ),
            }}
            placeholder="~/projects/my-project"
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Project Description"
            value={description}
            onChange={(e) => onChange('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description || "A brief description of what your project does"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <Description />
                </InputAdornment>
              ),
            }}
            placeholder="A web application that helps users manage their tasks efficiently..."
          />
        </Grid>
      </Grid>

      {path && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Project will be created at: <strong>{path}</strong>
        </Alert>
      )}
    </Paper>
  );
};

export default ProjectBasicInfo;
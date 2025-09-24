import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { Project } from '../types';
import toast from 'react-hot-toast';

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
    
    // Set up periodic refresh every 15 seconds
    const interval = setInterval(() => {
      loadProjects();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted');
      loadProjects();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Projects
      </Typography>
      
      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No projects yet
            </Typography>
            <Typography color="text.secondary">
              Get started by creating your first project
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              component={Link}
              to="/project/new"
              variant="contained"
              startIcon={<PlayIcon />}
            >
              Create Project
            </Button>
          </CardActions>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    paragraph
                  >
                    {project.description || 'No description'}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Chip
                      label={project.status}
                      color={getStatusColor(project.status) as any}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {project.agents?.length || 0} agents
                    </Typography>
                  </Box>
                  {project.goals && project.goals.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Goals Progress
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={
                          (project.goals.filter((g: any) => g.status === 'completed').length /
                            project.goals.length) *
                          100
                        }
                      />
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {project.path}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    component={Link}
                    to={`/project/${project.id}`}
                    size="small"
                    startIcon={<ViewIcon />}
                  >
                    View
                  </Button>
                  <Button
                    component={Link}
                    to={`/agents/${project.id}`}
                    size="small"
                    startIcon={<PlayIcon />}
                  >
                    Agents
                  </Button>
                  <Box sx={{ flexGrow: 1 }} />
                  <Tooltip title="Delete Project">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;
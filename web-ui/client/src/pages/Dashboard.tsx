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
      <Typography variant="h4" gutterBottom className="text-responsive-xl">
        Projects
      </Typography>
      
      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom className="text-responsive-lg">
              No projects yet
            </Typography>
            <Typography color="text.secondary" className="text-responsive-md">
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
        <Grid container spacing={{ xs: 2, sm: 3 }} className="grid-responsive">
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    className="text-responsive-lg text-ellipsis"
                    title={project.name}
                  >
                    {project.name}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    paragraph
                    className="text-responsive-sm line-clamp-2"
                    title={project.description || 'No description'}
                  >
                    {project.description || 'No description'}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Chip
                      label={project.status}
                      color={getStatusColor(project.status) as any}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary" className="text-responsive-sm">
                      {project.agents?.length || 0} agents
                    </Typography>
                  </Box>
                  {project.goals && project.goals.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" className="text-responsive-sm">
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
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    className="text-responsive-xs text-ellipsis"
                    title={project.path}
                  >
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
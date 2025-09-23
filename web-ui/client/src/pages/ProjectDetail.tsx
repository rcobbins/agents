import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  Button,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, CheckCircle, Cancel } from '@mui/icons-material';
import { api } from '../services/api';
import { Project, Goal } from '../types';
import toast from 'react-hot-toast';

function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goalId: string, status: string) => {
    try {
      await api.post(`/projects/${id}/goals/${goalId}`, { status });
      toast.success('Goal updated');
      loadProject();
    } catch (error) {
      toast.error('Failed to update goal');
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!project) {
    return <Typography>Project not found</Typography>;
  }

  const completedGoals = project.goals.filter(g => g.status === 'completed').length;
  const progress = project.goals.length > 0 ? (completedGoals / project.goals.length) * 100 : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {project.name}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Details
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {project.description || 'No description provided'}
              </Typography>
              <Typography variant="body2">
                <strong>Path:</strong> {project.path}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> <Chip label={project.status} size="small" />
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {new Date(project.created).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Goals & Objectives
              </Typography>
              <Box mb={2}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {completedGoals} of {project.goals.length} goals completed
                </Typography>
              </Box>
              <List>
                {project.goals.map((goal) => (
                  <ListItem
                    key={goal.id}
                    secondaryAction={
                      <Box>
                        <IconButton
                          edge="end"
                          color="success"
                          onClick={() => handleUpdateGoal(goal.id, 'completed')}
                          disabled={goal.status === 'completed'}
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleUpdateGoal(goal.id, 'failed')}
                        >
                          <Cancel />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={goal.description}
                      secondary={
                        <Box>
                          <Chip
                            label={goal.status}
                            size="small"
                            color={
                              goal.status === 'completed'
                                ? 'success'
                                : goal.status === 'failed'
                                ? 'error'
                                : 'default'
                            }
                          />
                          <Chip
                            label={goal.priority}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Agents
              </Typography>
              {project.agents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No agents running
                </Typography>
              ) : (
                <List>
                  {project.agents.map((agent) => (
                    <ListItem key={agent}>
                      <ListItemText primary={agent} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ProjectDetail;
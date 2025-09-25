const express = require('express');
const router = express.Router();

// GET all projects
router.get('/', async (req, res) => {
  try {
    const projects = req.app.locals.projectManager.getAllProjects();
    // Enhance each project with real-time agent data
    const enhancedProjects = projects.map(project => {
      const projectState = req.app.locals.projectManager.getProjectState(project.id);
      return {
        ...project,
        agents: projectState?.agents || [],
        metrics: projectState?.metrics || { activeAgents: 0 }
      };
    });
    res.json({ projects: enhancedProjects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET specific project
router.get('/:id', async (req, res) => {
  try {
    const project = req.app.locals.projectManager.getProjectState(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new project
router.post('/', async (req, res) => {
  try {
    const project = await req.app.locals.projectManager.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const project = await req.app.locals.projectManager.updateProject(req.params.id, req.body);
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const result = await req.app.locals.projectManager.deleteProject(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET project state
router.get('/:id/state', async (req, res) => {
  try {
    const state = req.app.locals.projectManager.getProjectState(req.params.id);
    if (!state) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST validate project
router.post('/:id/validate', async (req, res) => {
  try {
    const project = req.app.locals.projectManager.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const validation = await req.app.locals.projectManager.validateProject(project.path);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET project agents
router.get('/:id/agents', async (req, res) => {
  try {
    const agents = req.app.locals.agentManager.getAllAgentsForProject(req.params.id);
    res.json({ agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST launch agent for project
router.post('/:id/agents/:agentId/launch', async (req, res) => {
  try {
    const project = req.app.locals.projectManager.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const config = {
      ...req.body,
      projectPath: project.path
    };
    
    const result = await req.app.locals.agentManager.launchAgent(
      req.params.id,
      req.params.agentId,
      config
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST stop agent for project
router.post('/:id/agents/:agentId/stop', async (req, res) => {
  try {
    const result = await req.app.locals.agentManager.stopAgent(
      req.params.id,
      req.params.agentId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST launch all agents with intelligent sequencing
router.post('/:id/agents/launch-all', async (req, res) => {
  try {
    const project = req.app.locals.projectManager.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const config = {
      ...req.body,
      projectPath: project.path
    };
    
    const result = await req.app.locals.agentManager.launchAllAgents(
      req.params.id,
      config
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST stop all agents gracefully
router.post('/:id/agents/stop-all', async (req, res) => {
  try {
    const result = await req.app.locals.agentManager.stopAllAgents(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET agent status
router.get('/:id/agents/:agentId', async (req, res) => {
  try {
    const status = req.app.locals.agentManager.getAgentStatus(
      req.params.id,
      req.params.agentId
    );
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET project messages
router.get('/:id/messages', async (req, res) => {
  try {
    const messages = req.app.locals.messageBroker.getMessageHistory(
      req.params.id,
      req.query.limit || 100
    );
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST update goal
router.post('/:id/goals/:goalId', async (req, res) => {
  try {
    const goal = await req.app.locals.projectManager.updateGoal(
      req.params.id,
      req.params.goalId,
      req.body
    );
    res.json(goal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
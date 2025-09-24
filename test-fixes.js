#!/usr/bin/env node

const API_URL = 'http://localhost:3001/api';

async function testFixes() {
  console.log('Testing agent framework fixes...\n');
  
  try {
    // Get all projects
    const projectsRes = await fetch(`${API_URL}/projects`);
    const projectsData = await projectsRes.json();
    const projects = projectsData.projects;
    console.log(`Found ${projects.length} projects\n`);
    
    if (projects.length === 0) {
      console.log('No projects found. Please create a project first.');
      return;
    }
    
    const project = projects[0];
    console.log(`Testing with project: ${project.name} (${project.id})\n`);
    
    // Test 1: Check project state (should show correct agent count)
    console.log('Test 1: Checking project state...');
    const projectStateRes = await fetch(`${API_URL}/projects/${project.id}`);
    const projectData = await projectStateRes.json();
    
    console.log(`  - Project agents array: ${JSON.stringify(projectData.agents)}`);
    console.log(`  - Active agents count: ${projectData.metrics?.activeAgents || 0}`);
    console.log(`  - Goals count: ${projectData.goals?.length || 0}`);
    
    // Check goals have description field
    if (projectData.goals && projectData.goals.length > 0) {
      const goal = projectData.goals[0];
      console.log(`  - First goal structure: ${JSON.stringify(goal)}`);
      if (goal.description) {
        console.log('  ✓ Goals have description field');
      } else {
        console.log('  ✗ Goals missing description field');
      }
    }
    
    // Test 2: Check agent endpoint
    console.log('\nTest 2: Checking agents endpoint...');
    const agentsRes = await fetch(`${API_URL}/projects/${project.id}/agents`);
    const agentsData = await agentsRes.json();
    const agents = agentsData.agents;
    
    console.log(`  - Found ${agents.length} agents from agentManager`);
    agents.forEach(agent => {
      console.log(`    - ${agent.id}: ${agent.status} (uptime: ${agent.uptime || 0}s)`);
    });
    
    // Test 3: Verify consistency
    console.log('\nTest 3: Verifying consistency...');
    const runningAgents = agents.filter(a => a.status === 'running');
    console.log(`  - Running agents from /agents endpoint: ${runningAgents.length}`);
    console.log(`  - Project.agents array length: ${projectData.agents?.length || 0}`);
    console.log(`  - Metrics.activeAgents: ${projectData.metrics?.activeAgents || 0}`);
    
    if (projectData.agents?.length === runningAgents.length && 
        projectData.metrics?.activeAgents === runningAgents.length) {
      console.log('  ✓ Agent counts are consistent across all views!');
    } else {
      console.log('  ✗ Agent counts are still inconsistent');
    }
    
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testFixes();
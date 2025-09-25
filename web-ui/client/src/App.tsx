import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

import { SocketProvider } from './contexts/SocketContext';
import { AIAssistantProvider } from './contexts/AIAssistantContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import ProjectInit from './pages/ProjectInit';
import AgentMonitor from './pages/AgentMonitor';
import AgentThoughts from './pages/AgentThoughts';
import WorkQueueDashboard from './pages/WorkQueueDashboard';
import MessageFlowVisualizer from './pages/MessageFlowVisualizer';
import CodeChangeMonitor from './pages/CodeChangeMonitor';
import TestResultsDashboard from './pages/TestResultsDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Settings from './pages/Settings';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// Layout wrapper component with AI Assistant
function RootLayout() {
  return (
    <AIAssistantProvider>
      <Layout>
        <Outlet />
      </Layout>
    </AIAssistantProvider>
  );
}

// Create router with future flags enabled
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      errorElement: <ErrorBoundary componentName="Router"><div>Error loading page</div></ErrorBoundary>,
      children: [
        { 
          index: true, 
          element: <ErrorBoundary componentName="Dashboard"><Dashboard /></ErrorBoundary> 
        },
        { 
          path: 'project/new', 
          element: <ErrorBoundary componentName="Project Init"><ProjectInit /></ErrorBoundary> 
        },
        { 
          path: 'project/init', 
          element: <ErrorBoundary componentName="Project Init"><ProjectInit /></ErrorBoundary> 
        },
        { 
          path: 'project/:id', 
          element: <ErrorBoundary componentName="Project Detail"><ProjectDetail /></ErrorBoundary> 
        },
        { 
          path: 'agents/:projectId', 
          element: <ErrorBoundary componentName="Agent Monitor"><AgentMonitor /></ErrorBoundary> 
        },
        { 
          path: 'thoughts/:projectId', 
          element: <ErrorBoundary componentName="Agent Thoughts"><AgentThoughts /></ErrorBoundary> 
        },
        { 
          path: 'queue/:projectId', 
          element: <ErrorBoundary componentName="Work Queue"><WorkQueueDashboard /></ErrorBoundary> 
        },
        { 
          path: 'flows/:projectId', 
          element: <ErrorBoundary componentName="Message Flow Visualizer"><MessageFlowVisualizer /></ErrorBoundary> 
        },
        { 
          path: 'changes/:projectId', 
          element: <ErrorBoundary componentName="Code Change Monitor"><CodeChangeMonitor /></ErrorBoundary> 
        },
        { 
          path: 'tests/:projectId', 
          element: <ErrorBoundary componentName="Test Results"><TestResultsDashboard /></ErrorBoundary> 
        },
        { 
          path: 'analytics/:projectId', 
          element: <ErrorBoundary componentName="Analytics Dashboard"><AnalyticsDashboard /></ErrorBoundary> 
        },
        { 
          path: 'settings', 
          element: <ErrorBoundary componentName="Settings"><Settings /></ErrorBoundary> 
        },
      ],
    },
  ],
  {}
);

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SocketProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
} from '@mui/material';
import toast from 'react-hot-toast';
import ModelConfiguration from '../components/ModelConfiguration';

function Settings() {
  const [settings, setSettings] = useState({
    general: {
      autoStart: false,
      debug: false,
      theme: 'dark',
    },
    agents: {
      timeout: 300,
      maxRetries: 3,
      healthCheckInterval: 30,
    },
    webUI: {
      port: 3001,
      refreshInterval: 5000,
    },
  });

  const handleSave = () => {
    // Save settings to local storage or backend
    localStorage.setItem('framework-settings', JSON.stringify(settings));
    toast.success('Settings saved');
  };

  const updateSetting = (category: string, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.autoStart}
                    onChange={(e) =>
                      updateSetting('general', 'autoStart', e.target.checked)
                    }
                  />
                }
                label="Auto-start agents on launch"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.general.debug}
                    onChange={(e) =>
                      updateSetting('general', 'debug', e.target.checked)
                    }
                  />
                }
                label="Debug mode"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Agent Settings
              </Typography>
              <TextField
                fullWidth
                label="Timeout (seconds)"
                type="number"
                value={settings.agents.timeout}
                onChange={(e) =>
                  updateSetting('agents', 'timeout', parseInt(e.target.value))
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Max Retries"
                type="number"
                value={settings.agents.maxRetries}
                onChange={(e) =>
                  updateSetting('agents', 'maxRetries', parseInt(e.target.value))
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Health Check Interval (seconds)"
                type="number"
                value={settings.agents.healthCheckInterval}
                onChange={(e) =>
                  updateSetting('agents', 'healthCheckInterval', parseInt(e.target.value))
                }
                margin="normal"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Web UI Settings
              </Typography>
              <TextField
                fullWidth
                label="Server Port"
                type="number"
                value={settings.webUI.port}
                onChange={(e) =>
                  updateSetting('webUI', 'port', parseInt(e.target.value))
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Refresh Interval (ms)"
                type="number"
                value={settings.webUI.refreshInterval}
                onChange={(e) =>
                  updateSetting('webUI', 'refreshInterval', parseInt(e.target.value))
                }
                margin="normal"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <ModelConfiguration />
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Reset
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Settings;
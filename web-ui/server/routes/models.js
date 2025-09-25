const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFilePromise = promisify(execFile);

// Model configuration storage path
const CONFIG_DIR = path.join(process.env.HOME, '.agent-framework', 'config');
const MODEL_CONFIG_FILE = path.join(CONFIG_DIR, 'model-configuration.json');

// Available Claude models
const CLAUDE_MODELS = ['haiku-3-5', 'sonnet', 'sonnet[1m]', 'opus'];

// Cache for model availability
let modelAvailabilityCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Default model configuration
const DEFAULT_CONFIG = {
  assistant: { model: 'haiku-3-5', available: true },
  coordinator: { model: 'sonnet', available: true },
  planner: { model: 'sonnet', available: true },
  coder: { model: 'sonnet', available: true },
  tester: { model: 'sonnet', available: true },
  reviewer: { model: 'sonnet', available: true },
};

// Ensure config directory exists
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// Load model configuration
async function loadModelConfiguration() {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(MODEL_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default configuration if file doesn't exist
    return DEFAULT_CONFIG;
  }
}

// Save model configuration
async function saveModelConfiguration(config) {
  try {
    await ensureConfigDir();
    await fs.writeFile(MODEL_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save model configuration:', error);
    return false;
  }
}

// Check if a specific model is available
async function checkModelAvailable(model) {
  try {
    const claudePath = path.join(process.env.HOME || '/home/rob', 'bin', 'claude');
    
    // Try to run a simple test with the model
    // Use a simple echo command that should work with any model
    const { stdout, stderr } = await execFilePromise(
      'bash',
      ['-c', `echo 'test' | ${claudePath} --print --model ${model}`],
      {
        timeout: 10000, // Increased timeout for slower models like Opus
        env: { ...process.env, PATH: `${path.join(process.env.HOME || '/home/rob', 'bin')}:${process.env.PATH}` }
      }
    );
    
    // Check if we got output (any output means the model is available)
    return stdout.length > 0;
  } catch (error) {
    console.log(`Model ${model} check failed:`, error.message);
    
    // Special handling for sonnet[1m] - if regular sonnet works, assume [1m] works too
    if (model === 'sonnet[1m]') {
      console.log('Checking if regular sonnet is available as fallback...');
      try {
        const { stdout } = await execFilePromise(
          'bash',
          ['-c', `echo 'test' | ${claudePath} --print --model sonnet`],
          {
            timeout: 10000,
            env: { ...process.env, PATH: `${path.join(process.env.HOME || '/home/rob', 'bin')}:${process.env.PATH}` }
          }
        );
        return stdout.length > 0;
      } catch (fallbackError) {
        console.log('Regular sonnet also not available');
        return false;
      }
    }
    
    return false;
  }
}

// Check all models and cache results
async function checkAllModelsWithCache(logger, forceRefresh = false) {
  // Return cached results if available and not forcing refresh
  if (!forceRefresh && modelAvailabilityCache && cacheTimestamp) {
    const cacheAge = Date.now() - cacheTimestamp;
    if (cacheAge < CACHE_DURATION) {
      logger?.info('Using cached model availability');
      return modelAvailabilityCache;
    }
  }
  
  logger?.info('Checking model availability...');
  
  // Check each model's availability in parallel for speed
  const availabilityChecks = await Promise.all(
    CLAUDE_MODELS.map(async (model) => {
      const available = await checkModelAvailable(model);
      logger?.info(`Model ${model}: ${available ? 'available' : 'not available'}`);
      return { model, available };
    })
  );
  
  // Cache the results
  modelAvailabilityCache = availabilityChecks;
  cacheTimestamp = Date.now();
  
  // Also save to file for persistence across restarts
  try {
    const cacheFile = path.join(CONFIG_DIR, 'model-availability-cache.json');
    await ensureConfigDir();
    await fs.writeFile(cacheFile, JSON.stringify({
      checks: availabilityChecks,
      timestamp: cacheTimestamp
    }, null, 2));
  } catch (error) {
    console.error('Failed to save availability cache:', error);
  }
  
  return availabilityChecks;
}

// Load cached availability from file on startup
async function loadCachedAvailability() {
  try {
    const cacheFile = path.join(CONFIG_DIR, 'model-availability-cache.json');
    const data = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(data);
    
    // Check if cache is still valid
    const cacheAge = Date.now() - cache.timestamp;
    if (cacheAge < CACHE_DURATION) {
      modelAvailabilityCache = cache.checks;
      cacheTimestamp = cache.timestamp;
      console.log('Loaded model availability from cache');
      return true;
    }
  } catch (error) {
    // Cache doesn't exist or is invalid, will check fresh
  }
  return false;
}

// GET - Check model availability
router.get('/availability', async (req, res) => {
  try {
    const logger = req.app.locals.logger;
    const forceRefresh = req.query.refresh === 'true';
    
    const availabilityChecks = await checkAllModelsWithCache(logger, forceRefresh);
    
    // Extract available models
    const available = availabilityChecks
      .filter(check => check.available)
      .map(check => check.model);
    
    logger.info(`Available models: ${available.join(', ')}`);
    
    res.json({
      available,
      all: availabilityChecks,
      timestamp: new Date().toISOString(),
      cached: !forceRefresh && cacheTimestamp ? true : false
    });
  } catch (error) {
    console.error('Failed to check model availability:', error);
    res.status(500).json({ 
      error: 'Failed to check model availability',
      available: ['haiku-3-5', 'sonnet', 'sonnet[1m]', 'opus'] // Assume all are available on error
    });
  }
});

// GET - Get current model configuration
router.get('/configuration', async (req, res) => {
  try {
    const config = await loadModelConfiguration();
    res.json({ configuration: config });
  } catch (error) {
    console.error('Failed to load model configuration:', error);
    res.status(500).json({ error: 'Failed to load model configuration' });
  }
});

// POST - Save model configuration
router.post('/configuration', async (req, res) => {
  try {
    const { configuration } = req.body;
    
    if (!configuration) {
      return res.status(400).json({ error: 'Configuration is required' });
    }
    
    // Validate configuration
    const validAgents = ['assistant', 'coordinator', 'planner', 'coder', 'tester', 'reviewer'];
    for (const agent of validAgents) {
      if (!configuration[agent] || !configuration[agent].model) {
        return res.status(400).json({ 
          error: `Invalid configuration: missing model for ${agent}` 
        });
      }
      
      if (!CLAUDE_MODELS.includes(configuration[agent].model)) {
        return res.status(400).json({ 
          error: `Invalid model for ${agent}: ${configuration[agent].model}` 
        });
      }
    }
    
    // Save configuration
    const saved = await saveModelConfiguration(configuration);
    
    if (saved) {
      const logger = req.app.locals.logger;
      logger.info('Model configuration saved successfully');
      
      // Update any running agents with new configuration
      try {
        const agentManager = req.app.locals.agentManager;
        if (agentManager) {
          agentManager.updateModelConfiguration(configuration);
        }
      } catch (error) {
        logger.warn('Could not update running agents:', error);
      }
      
      res.json({ 
        success: true, 
        message: 'Model configuration saved successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to save model configuration' });
    }
  } catch (error) {
    console.error('Failed to save model configuration:', error);
    res.status(500).json({ error: 'Failed to save model configuration' });
  }
});

// GET - Test a specific model
router.get('/test/:model', async (req, res) => {
  try {
    const { model } = req.params;
    
    if (!CLAUDE_MODELS.includes(model)) {
      return res.status(400).json({ error: 'Invalid model name' });
    }
    
    const available = await checkModelAvailable(model);
    
    res.json({
      model,
      available,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to test model ${req.params.model}:`, error);
    res.status(500).json({ error: 'Failed to test model' });
  }
});

// Initialize on module load - check availability in background
// Use setImmediate to avoid blocking module loading
setImmediate(async () => {
  try {
    // Try to load from cache first
    const loadedFromCache = await loadCachedAvailability();
    
    if (!loadedFromCache) {
      // Check fresh in background if no valid cache
      console.log('Checking model availability on startup...');
      
      // Do the check with a longer timeout since it's in the background
      const checks = await checkAllModelsWithCache(null, true);
      const available = checks.filter(c => c.available).map(c => c.model);
      console.log('Startup model check complete. Available:', available.join(', '));
    }
  } catch (error) {
    console.error('Startup model availability check failed:', error);
    // Set reasonable defaults on failure
    modelAvailabilityCache = CLAUDE_MODELS.map(model => ({ 
      model, 
      available: true // Assume available on error to avoid blocking users
    }));
  }
});

module.exports = router;
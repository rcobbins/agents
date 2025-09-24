#!/usr/bin/env node

// Simple wrapper to spawn bash scripts
const { spawn } = require('child_process');

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: spawn-bash.js <script-path>');
  process.exit(1);
}

// Spawn the bash script
const proc = spawn('/bin/bash', [scriptPath], {
  stdio: 'inherit',
  env: process.env
});

// Forward signals
process.on('SIGTERM', () => proc.kill('SIGTERM'));
process.on('SIGINT', () => proc.kill('SIGINT'));

// Exit with same code as child
proc.on('exit', (code) => {
  process.exit(code || 0);
});

proc.on('error', (err) => {
  console.error('Error spawning script:', err);
  process.exit(1);
});
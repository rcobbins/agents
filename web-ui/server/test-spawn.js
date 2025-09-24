const { spawn, exec } = require('child_process');

console.log('Testing spawn...');
console.log('PATH:', process.env.PATH);
console.log('HOME:', process.env.HOME);

// Test 1: Direct spawn
try {
  const proc1 = spawn('echo', ['test1']);
  proc1.on('error', err => console.log('Test 1 error:', err));
  proc1.on('exit', code => console.log('Test 1 exit:', code));
} catch(e) {
  console.log('Test 1 exception:', e);
}

// Test 2: Spawn with shell
try {
  const proc2 = spawn('echo test2', { shell: true });
  proc2.on('error', err => console.log('Test 2 error:', err));
  proc2.on('exit', code => console.log('Test 2 exit:', code));
} catch(e) {
  console.log('Test 2 exception:', e);
}

// Test 3: exec
exec('echo test3', (error, stdout, stderr) => {
  if (error) {
    console.log('Test 3 error:', error);
  } else {
    console.log('Test 3 output:', stdout.trim());
  }
});

// Test 4: Direct bash script
const scriptPath = '/home/rob/agent-framework/agents/templates/coordinator.sh';
exec(`/bin/bash -c "echo Starting agent && exit 0"`, (error, stdout, stderr) => {
  if (error) {
    console.log('Test 4 error:', error);
  } else {
    console.log('Test 4 output:', stdout.trim());
  }
});

setTimeout(() => process.exit(0), 2000);
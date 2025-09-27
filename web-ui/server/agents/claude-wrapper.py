#!/usr/bin/env python3
"""
Claude CLI Python wrapper to work around Node.js spawn bug #771
This script is called from Node.js and properly invokes Claude CLI
"""

import sys
import subprocess
import os
import tempfile
import signal
import time
import json

def parse_arguments():
    """Parse command line arguments"""
    args = {
        'model': None,
        'session_id': None,
        'resume': None,
        'system_prompt': None,
        'output_format': None,
        'timeout': 600,  # Default 10 minutes
        'user_prompt': None,
        'print_mode': False
    }
    
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == '--model' and i + 1 < len(sys.argv):
            args['model'] = sys.argv[i + 1]
            i += 2
        elif arg == '--session-id' and i + 1 < len(sys.argv):
            args['session_id'] = sys.argv[i + 1]
            i += 2
        elif arg == '--resume' and i + 1 < len(sys.argv):
            args['resume'] = sys.argv[i + 1]
            i += 2
        elif arg == '--append-system-prompt' and i + 1 < len(sys.argv):
            args['system_prompt'] = sys.argv[i + 1]
            i += 2
        elif arg == '--output-format' and i + 1 < len(sys.argv):
            args['output_format'] = sys.argv[i + 1]
            i += 2
        elif arg == '--timeout' and i + 1 < len(sys.argv):
            args['timeout'] = int(sys.argv[i + 1])
            i += 2
        elif arg == '--print':
            args['print_mode'] = True
            i += 1
        elif not arg.startswith('--'):
            # This should be the user prompt (only if not a flag)
            args['user_prompt'] = arg
            i += 1
        else:
            # Unknown flag, skip it
            i += 1
    
    # If no user prompt provided as argument, read from stdin
    if not args['user_prompt'] and not sys.stdin.isatty():
        args['user_prompt'] = sys.stdin.read().strip()
    
    return args

def build_command(args):
    """Build the Claude CLI command"""
    claude_path = os.environ.get('CLAUDE_PATH', '/home/rob/bin/claude')
    cmd = [claude_path]
    
    if args['print_mode']:
        cmd.append('--print')
    
    if args['model']:
        cmd.extend(['--model', args['model']])
    
    if args['session_id']:
        cmd.extend(['--session-id', args['session_id']])
    elif args['resume']:
        cmd.extend(['--resume', args['resume']])
    
    if args['output_format']:
        cmd.extend(['--output-format', args['output_format']])
    
    # Handle system prompt
    if args['system_prompt']:
        # For very large system prompts, use temporary file
        if len(args['system_prompt']) > 5000:
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
                f.write(args['system_prompt'])
                temp_file = f.name
            cmd.extend(['--append-system-prompt', f'@{temp_file}'])
        else:
            cmd.extend(['--append-system-prompt', args['system_prompt']])
    
    # Add user prompt as the last argument if not using stdin
    if args['user_prompt'] and len(args['user_prompt']) < 5000:
        cmd.append(args['user_prompt'])
        return cmd, None
    
    return cmd, args['user_prompt']

def run_claude(cmd, stdin_input=None, timeout=600):
    """Run Claude CLI with timeout"""
    try:
        # Set up process
        if stdin_input:
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env={**os.environ, 'PATH': f"/home/rob/bin:{os.environ.get('PATH', '')}"} 
            )
            stdout, stderr = process.communicate(input=stdin_input, timeout=timeout)
        else:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env={**os.environ, 'PATH': f"/home/rob/bin:{os.environ.get('PATH', '')}"}
            )
            stdout, stderr = process.communicate(timeout=timeout)
        
        # Check return code
        if process.returncode != 0:
            # Print stderr to stderr for error handling
            sys.stderr.write(stderr)
            sys.exit(process.returncode)
        
        # Success - print stdout
        sys.stdout.write(stdout)
        return 0
        
    except subprocess.TimeoutExpired:
        process.kill()
        sys.stderr.write(f"Command timed out after {timeout} seconds\n")
        sys.exit(124)  # Standard timeout exit code
    except Exception as e:
        sys.stderr.write(f"Error running Claude: {str(e)}\n")
        sys.exit(1)

def main():
    """Main entry point"""
    args = parse_arguments()
    cmd, stdin_input = build_command(args)
    
    # Debug logging (comment out in production)
    # sys.stderr.write(f"Running: {' '.join(cmd)}\n")
    
    return run_claude(cmd, stdin_input, args['timeout'])

if __name__ == '__main__':
    sys.exit(main())
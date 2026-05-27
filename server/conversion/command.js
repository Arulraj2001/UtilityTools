import { spawn } from 'node:child_process';

export function runCommand(command, args = [], {
  cwd,
  timeoutMs = 120000,
  env = process.env,
  input,
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        const error = new Error(`Command timed out after ${timeoutMs}ms: ${command}`);
        error.code = 'COMMAND_TIMEOUT';
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      if (code !== 0) {
        const error = new Error(`Command failed (${code}): ${command} ${args.join(' ')}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr, code });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

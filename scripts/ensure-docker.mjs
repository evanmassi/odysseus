/**
 * Ensure Docker Engine Is Running
 *
 * Self-healing predev guard: verifies the Docker engine is reachable and, on
 * Windows, recovers a wedged WSL2 backend before the dev stack tries to use it.
 * No-ops instantly when the engine is already up, so a healthy setup is never
 * disturbed.
 */
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves true when `docker info` succeeds within the timeout (engine is up). */
function isEngineUp(timeoutMs) {
  return new Promise((resolve) => {
    execFile('docker', ['info'], { timeout: timeoutMs, windowsHide: true }, (err) => {
      resolve(!err);
    });
  });
}

function startDockerDesktop() {
  const candidates = [
    `${process.env.ProgramFiles ?? 'C:\\Program Files'}\\Docker\\Docker\\Docker Desktop.exe`,
    `${process.env.LOCALAPPDATA ?? ''}\\Docker\\Docker Desktop.exe`,
  ].filter((p) => p && existsSync(p));

  if (candidates.length === 0) {
    console.error('[ensure-docker] Could not locate Docker Desktop.exe — start Docker manually.');
    return false;
  }
  spawn(candidates[0], [], { detached: true, stdio: 'ignore' }).unref();
  return true;
}

function wslShutdown() {
  return new Promise((resolve) => {
    execFile('wsl', ['--shutdown'], { timeout: 30_000, windowsHide: true }, () => resolve());
  });
}

async function waitForEngine(maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isEngineUp(5_000)) return true;
    await sleep(3_000);
  }
  return false;
}

async function main() {
  if (await isEngineUp(5_000)) return; // fast path: already healthy, touch nothing

  // Non-Windows: pass through and let the existing `docker compose up` surface its own error.
  if (process.platform !== 'win32') {
    console.error('[ensure-docker] Docker engine not reachable — continuing (non-Windows).');
    return;
  }

  console.log('[ensure-docker] Engine down — starting Docker Desktop...');
  startDockerDesktop();
  if (await waitForEngine(90_000)) {
    console.log('[ensure-docker] Engine is up.');
    return;
  }

  // Last resort: the WSL2 VM is wedged. Reset it, then relaunch.
  console.log('[ensure-docker] Still down — resetting WSL (wsl --shutdown) and relaunching...');
  await wslShutdown();
  startDockerDesktop();
  if (await waitForEngine(120_000)) {
    console.log('[ensure-docker] Engine is up.');
    return;
  }

  console.error('[ensure-docker] Could not bring up the Docker engine. Start Docker Desktop manually and retry.');
  process.exit(1);
}

main();

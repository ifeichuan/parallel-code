import { execFileSync } from 'child_process';
import path from 'path';

export const isWindows = process.platform === 'win32';

let wslAvailableCache: boolean | null = null;

/** Check whether WSL is installed and has at least one distribution. Result is cached. */
export function isWslAvailable(): boolean {
  if (!isWindows) return false;
  if (wslAvailableCache !== null) return wslAvailableCache;
  try {
    const result = execFileSync('wsl.exe', ['--list', '--quiet'], {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    wslAvailableCache = result.trim().length > 0;
  } catch {
    wslAvailableCache = false;
  }
  return wslAvailableCache;
}

/** Convert a Windows path like `C:\Users\foo` to a WSL path like `/mnt/c/Users/foo`. */
export function windowsToWslPath(winPath: string): string {
  const normalized = winPath.replace(/\\/g, '/');
  const match = normalized.match(/^([A-Za-z]):(\/.*)/);
  if (match) {
    return `/mnt/${match[1].toLowerCase()}${match[2]}`;
  }
  return normalized;
}

/** Convert a WSL path like `/mnt/c/Users/foo` to a Windows path like `C:\Users\foo`. */
export function wslToWindowsPath(wslPath: string): string {
  const match = wslPath.match(/^\/mnt\/([a-z])(\/.*)/);
  if (match) {
    return `${match[1].toUpperCase()}:${match[2].replace(/\//g, '\\')}`;
  }
  return wslPath;
}

/** Return the default shell command for the current platform/mode. */
export function getDefaultShell(useWsl: boolean): string {
  if (useWsl && isWindows) return 'wsl.exe';
  if (isWindows) return process.env.COMSPEC || 'powershell.exe';
  return process.env.SHELL || '/bin/sh';
}

/** Return default shell args for the current platform/mode. */
export function getDefaultShellArgs(useWsl: boolean): string[] {
  if (useWsl && isWindows) return ['-e', 'bash', '-l'];
  return [];
}

/** Return the default home directory. */
export function getDefaultHome(): string {
  if (isWindows) return process.env.USERPROFILE || process.env.HOME || 'C:\\';
  return process.env.HOME || '/';
}

/** Resolve cwd, converting Windows paths to WSL paths when in WSL mode. */
export function resolveCwd(cwd: string | undefined, useWsl: boolean): string {
  const resolved = cwd || getDefaultHome();
  if (useWsl && isWindows && /^[A-Za-z]:/.test(resolved)) {
    return windowsToWslPath(resolved);
  }
  return resolved;
}

/**
 * Wrap a command for WSL execution when in WSL mode.
 * Returns `{ command, args }` with the potentially wrapped values.
 */
export function wrapCommandForWsl(
  command: string,
  args: string[],
  useWsl: boolean,
): { command: string; args: string[] } {
  if (!useWsl || !isWindows) return { command, args };
  // If command is already wsl.exe, don't double-wrap
  if (path.basename(command).toLowerCase() === 'wsl.exe') return { command, args };
  return { command: 'wsl.exe', args: ['-e', command, ...args] };
}

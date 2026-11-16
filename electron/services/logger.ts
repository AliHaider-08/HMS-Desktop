import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

let logDirectory = path.join(process.cwd(), 'logs');
let logFile = path.join(logDirectory, 'app.log');

/**
 * Called once from the main process with `app.getPath('userData')/logs`.
 * Defaults to `<cwd>/logs` so the DB/auth layer can be tested outside Electron.
 */
export function configureLogger(directory: string): void {
  logDirectory = directory;
  logFile = path.join(directory, 'app.log');
  try {
    mkdirSync(logDirectory, { recursive: true });
  } catch {
    // Logging must never crash the app.
  }
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: unknown): void {
  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] [${level}] ${message}`;

  if (details instanceof Error) {
    line += ` | ${details.name}: ${details.message}\n${details.stack ?? ''}`;
  } else if (details !== undefined) {
    try {
      line += ` | ${JSON.stringify(details)}`;
    } catch {
      line += ' | [unserializable details]';
    }
  }

  try {
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logFile, `${line}\n`, 'utf8');
  } catch {
    // Ignore: a failing log must not break a request.
  }
}

export function logInfo(message: string, details?: unknown): void {
  write('INFO', message, details);
}

export function logWarn(message: string, details?: unknown): void {
  write('WARN', message, details);
}

export function logError(message: string, details?: unknown): void {
  write('ERROR', message, details);
}

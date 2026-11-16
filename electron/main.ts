import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import { closeDatabase, openDatabase } from './db/connection';
import { runMigrations } from './db/migrate';
import { createUserRepository } from './db/repositories/userRepository';
import { seedDefaultAdmin } from './db/seed';
import { createAuthService } from './services/authService';
import { configureLogger, logError, logInfo } from './services/logger';
import { registerIpc } from './ipc/registerIpc';

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function databaseFile(): string {
  return path.join(app.getPath('userData'), 'data', 'fastfood.db');
}

function migrationsDirectory(): string {
  // Copied next to the compiled JS by scripts/copy-electron-assets.mjs,
  // so the same relative path works in dev, in the asar build and in tests.
  return path.join(__dirname, 'db', 'migrations');
}

async function bootstrapDatabase(): Promise<void> {
  configureLogger(path.join(app.getPath('userData'), 'logs'));
  logInfo(`Starting app version ${app.getVersion()} (dev: ${isDev})`);

  const db = openDatabase(databaseFile());
  const applied = runMigrations(db, migrationsDirectory());
  logInfo(`Database ready. Migrations applied this run: ${applied}`);

  const users = createUserRepository(db);
  await seedDefaultAdmin(users);

  const auth = createAuthService(users);
  registerIpc(auth);
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#F8F9FA',
    title: 'Gul Khan Fast Food',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Preload needs the shared channel constants from the compiled build,
      // which requires a real `require`; isolation + no node in the renderer still holds.
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Never let the app navigate away or open random windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = devServerUrl && url.startsWith(devServerUrl);
    if (!allowed) event.preventDefault();
  });

  if (isDev && devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await bootstrapDatabase();
    } catch (error) {
      logError('Startup failed while preparing the database', error);
      dialog.showErrorBox(
        'Cannot start Gul Khan Fast Food',
        'The database could not be opened. Please close any other copy of the app and try again.',
      );
      app.quit();
      return;
    }

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    closeDatabase();
  });
}

process.on('uncaughtException', (error) => {
  logError('Uncaught exception in main process', error);
});

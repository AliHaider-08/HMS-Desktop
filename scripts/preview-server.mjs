/**
 * Browser preview helper (development only).
 *
 * The real app is Electron: React talks to the main process over IPC, and that
 * main process is the only thing that may touch SQLite. For a quick UI preview
 * in a normal browser, this server serves the Vite build and emulates
 * `window.api.auth` in memory using the SAME schema validation.
 *
 * It is NOT part of the shipped app, it never loads the database,
 * and it is not used by `npm run dev` or by the packaged Windows build.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const distDir = path.join(root, 'dist');
const port = Number(process.env.PREVIEW_PORT ?? 4173);

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[preview] dist/index.html is missing. Run `npm run build:renderer` first.');
  process.exit(1);
}

const { loginSchema, changePasswordSchema } = require(
  path.join(root, 'dist-electron', 'src', 'types', 'schemas.js'),
);

// Demo users mirror the seeded database so the UI can be reviewed in a browser.
const demoUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    fullName: 'Shop Owner',
    role: 'admin',
    mustChangePassword: true,
  },
  {
    id: 2,
    username: 'cashier',
    password: 'cashier123',
    fullName: 'Counter Staff',
    role: 'cashier',
    mustChangePassword: false,
  },
  {
    id: 3,
    username: 'manager',
    password: 'manager123',
    fullName: 'Shift Manager',
    role: 'manager',
    mustChangePassword: false,
  },
];

const ROLE_PAGES = {
  admin: ['home', 'users', 'settings', 'reports'],
  cashier: ['home'],
  manager: ['home', 'reports'],
};

let session = null;

/** Strips the demo password before a user object is sent to the browser. */
function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}
const ok = (data) => ({ ok: true, data });
const fail = (code, message) => ({ ok: false, error: { code, message } });

const routes = {
  'auth:login': (payload) => {
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    const user = demoUsers.find(
      (candidate) => candidate.username.toLowerCase() === parsed.data.username.toLowerCase(),
    );
    if (!user || user.password !== parsed.data.password) {
      return fail('INVALID_CREDENTIALS', 'Wrong username or password');
    }
    session = user;
    return ok(toPublicUser(user));
  },
  'auth:logout': () => {
    session = null;
    return ok(null);
  },
  'auth:session': () => ok(session ? toPublicUser(session) : null),
  'auth:permissions': () =>
    ok(session ? { role: session.role, pages: ROLE_PAGES[session.role] } : null),
  'auth:change-password': (payload) => {
    const account = demoUsers.find((user) => user.username === payload?.username);
    if (!account) return fail('UNAUTHENTICATED', 'Please log in to continue');
    const parsed = changePasswordSchema.safeParse(payload);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    if (parsed.data.currentPassword !== account.password) {
      return fail('INVALID_CREDENTIALS', 'Current password is not correct');
    }
    account.password = parsed.data.newPassword;
    account.mustChangePassword = false;
    return ok(toPublicUser(account));
  },
};

const BRIDGE_TAG = '<script src="/__preview/bridge.js"></script>';

/** Index.html with the demo bridge injected and a preview-only CSP. */
function previewHtml() {
  return readFileSync(path.join(distDir, 'index.html'), 'utf8')
    .replace(
      /<meta[\s\S]*?Content-Security-Policy[\s\S]*?>/i,
      "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'\">",
    )
    .replace('<div id="root"></div>', `${BRIDGE_TAG}<div id="root"></div>`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

function serveStatic(requestUrl, response) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const filePath = path.join(distDir, relative);
  const safePath = filePath.startsWith(distDir) ? filePath : path.join(distDir, 'index.html');

  if (!existsSync(safePath) || statSync(safePath).isDirectory()) {
    response.writeHead(200, { 'Content-Type': MIME['.html'] });
    response.end(previewHtml());
    return;
  }

  response.writeHead(200, {
    'Content-Type': MIME[path.extname(safePath)] ?? 'application/octet-stream',
  });
  response.end(readFileSync(safePath));
}

const server = createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/__preview/ipc') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      let message;
      try {
        message = JSON.parse(body || '{}');
      } catch {
        response.writeHead(400, { 'Content-Type': MIME['.json'] });
        response.end(JSON.stringify(fail('VALIDATION_ERROR', 'Malformed request')));
        return;
      }

      const handler = routes[message.channel];
      const result = handler
        ? handler(message.args)
        : fail('INTERNAL_ERROR', `Unknown preview channel: ${message.channel}`);

      response.writeHead(200, { 'Content-Type': MIME['.json'] });
      response.end(JSON.stringify(result));
    });
    return;
  }

  if (request.url === '/__preview/bridge.js') {
    response.writeHead(200, { 'Content-Type': MIME['.js'] });
    response.end(readFileSync(path.join(root, 'scripts', 'preview-bridge.js')));
    return;
  }

  serveStatic(request.url ?? '/', response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[preview] UI preview on http://0.0.0.0:${port} (in-memory demo auth, no database)`);
  console.log('[preview] users: admin/admin123, cashier/cashier123, manager/manager123');
});

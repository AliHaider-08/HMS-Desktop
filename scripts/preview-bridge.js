/**
 * Injected into the preview HTML only (development helper).
 * Emulates `window.api.auth` from electron/preload.ts in the browser so the
 * login UI can be reviewed without building the Windows app.
 * Demo users live in memory here; this script is never shipped inside the app.
 */
(function installPreviewBridge() {
  if (window.api) return;

  const users = [
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

  const publicUser = () =>
    session && {
      id: session.id,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
    };

  const ok = (data) => ({ ok: true, data });
  const fail = (code, message) => ({ ok: false, error: { code, message } });

  async function call(channel, args) {
    const response = await fetch('/__preview/ipc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, args }),
    });
    return response.json();
  }

  window.api = {
    auth: {
      // Credential checks run on the preview server; the session is created here.
      async login(input) {
        const result = await call('auth:login', input);
        if (result.ok) session = users.find((user) => user.id === result.data.id) ?? null;
        return result;
      },
      async logout() {
        session = null;
        return call('auth:logout');
      },
      async getSession() {
        return ok(publicUser());
      },
      async getPermissions() {
        return ok(session ? { role: session.role, pages: ROLE_PAGES[session.role] } : null);
      },
      async changePassword(input) {
        const result = await call('auth:change-password', {
          ...input,
          username: session ? session.username : '',
        });
        if (result.ok && session) {
          session.password = input.newPassword;
          session.mustChangePassword = false;
          return ok(publicUser());
        }
        return result;
      },
    },
  };
})();

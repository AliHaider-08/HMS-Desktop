import { ipcMain } from 'electron';
import { AUTH_CHANNELS } from '../../src/types/api';
import type { AuthService } from '../services/authService';
import { getRolePermissions } from '../services/permissions';
import { changePasswordSchema, loginSchema } from '../../src/types/schemas';
import { withResult } from './ipcResult';
import { logInfo } from '../services/logger';

/** All authentication channels. Validation happens here, never only in the form. */
export function registerAuthIpc(auth: AuthService): void {
  ipcMain.handle(
    AUTH_CHANNELS.login,
    withResult(AUTH_CHANNELS.login, async (payload: unknown) => {
      const input = loginSchema.parse(payload);
      const user = await auth.login(input.username, input.password);
      logInfo(`Login succeeded for "${user.username}" (${user.role})`);
      return user;
    }),
  );

  ipcMain.handle(
    AUTH_CHANNELS.logout,
    withResult(AUTH_CHANNELS.logout, () => {
      const user = auth.getCurrentUser();
      auth.logout();
      if (user) logInfo(`Logout for "${user.username}"`);
      return null;
    }),
  );

  ipcMain.handle(
    AUTH_CHANNELS.session,
    withResult(AUTH_CHANNELS.session, () => auth.getCurrentUser()),
  );

  ipcMain.handle(
    AUTH_CHANNELS.changePassword,
    withResult(AUTH_CHANNELS.changePassword, async (payload: unknown) => {
      const input = changePasswordSchema.parse(payload);
      const user = await auth.changePassword(input.currentPassword, input.newPassword);
      logInfo(`Password changed for "${user.username}"`);
      return user;
    }),
  );

  // The renderer asks which pages its role may open instead of hardcoding a matrix.
  ipcMain.handle(
    AUTH_CHANNELS.permissions,
    withResult(AUTH_CHANNELS.permissions, () => {
      const user = auth.getCurrentUser();
      return user ? getRolePermissions(user.role) : null;
    }),
  );
}

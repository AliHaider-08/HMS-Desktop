import { contextBridge, ipcRenderer } from 'electron';
import { AUTH_CHANNELS } from '../src/types/api';
import type {
  ApiResult,
  AuthApi,
  ChangePasswordInput,
  LoginInput,
  RendererApi,
  RolePermissions,
  SessionUser,
} from '../src/types/api';

/**
 * The only bridge between React and the main process.
 * `contextIsolation` stays on, so React never gets `ipcRenderer` or `require` itself.
 */
const auth: AuthApi = {
  login: (input: LoginInput): Promise<ApiResult<SessionUser>> =>
    ipcRenderer.invoke(AUTH_CHANNELS.login, input),

  logout: (): Promise<ApiResult<null>> => ipcRenderer.invoke(AUTH_CHANNELS.logout),

  getSession: (): Promise<ApiResult<SessionUser | null>> =>
    ipcRenderer.invoke(AUTH_CHANNELS.session),

  changePassword: (input: ChangePasswordInput): Promise<ApiResult<SessionUser>> =>
    ipcRenderer.invoke(AUTH_CHANNELS.changePassword, input),

  getPermissions: (): Promise<ApiResult<RolePermissions | null>> =>
    ipcRenderer.invoke(AUTH_CHANNELS.permissions),
};

const api: RendererApi = { auth };

contextBridge.exposeInMainWorld('api', api);

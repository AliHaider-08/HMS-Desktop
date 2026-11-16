/**
 * Contract shared between the Electron main process, the preload script and React.
 * This file must stay dependency-free (types only) so both tsconfigs can compile it.
 */

export type UserRole = 'admin' | 'cashier' | 'manager';

/** Pages a role is allowed to open. Enforced in the main process (auth:permissions). */
export type PageKey = 'home' | 'users' | 'settings' | 'reports';

/** The user object that is safe to send to the renderer. Never contains a password hash. */
export interface SessionUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface RolePermissions {
  role: UserRole;
  pages: PageKey[];
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'TOO_MANY_ATTEMPTS'
  | 'WEAK_PASSWORD'
  | 'NOT_FOUND'
  | 'DB_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface LoginInput {
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Shape of `window.api.auth`. Implemented in electron/preload.ts. */
export interface AuthApi {
  login(input: LoginInput): Promise<ApiResult<SessionUser>>;
  logout(): Promise<ApiResult<null>>;
  getSession(): Promise<ApiResult<SessionUser | null>>;
  changePassword(input: ChangePasswordInput): Promise<ApiResult<SessionUser>>;
  getPermissions(): Promise<ApiResult<RolePermissions | null>>;
}

/** Shape of `window.api`. Grows one namespace per module in later phases. */
export interface RendererApi {
  auth: AuthApi;
}

/** IPC channel names, kept in one place so main and preload cannot drift apart. */
export const AUTH_CHANNELS = {
  login: 'auth:login',
  logout: 'auth:logout',
  session: 'auth:session',
  changePassword: 'auth:change-password',
  permissions: 'auth:permissions',
} as const;

import type { SessionUser, UserRole } from '../../src/types/api';
import type { UserRow, UserRepository } from '../db/repositories/userRepository';
import { hashPassword, verifyPassword } from '../utils/password';
import { AppError } from '../utils/errors';
import { logWarn } from './logger';

const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 5 * 60 * 1000;
const FAILED_ATTEMPT_DELAY_MS = 200;

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

interface SessionStore {
  set(user: SessionUser): void;
  get(): SessionUser | null;
  clear(): void;
}

function createSessionStore(): SessionStore {
  let currentUser: SessionUser | null = null;

  return {
    set(user) {
      currentUser = user;
    },
    get() {
      return currentUser;
    },
    clear() {
      currentUser = null;
    },
  };
}

/** Maps a database row to the object that is safe to send to the renderer. */
export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role as UserRole,
    mustChangePassword: row.must_change_password === 1,
  };
}

export function createAuthService(users: UserRepository) {
  const session = createSessionStore();
  const failedAttempts = new Map<string, AttemptRecord>();

  function assertNotLocked(usernameKey: string): void {
    const record = failedAttempts.get(usernameKey);
    if (!record) return;

    if (Date.now() - record.firstAttemptAt > LOCK_WINDOW_MS) {
      failedAttempts.delete(usernameKey);
      return;
    }

    if (record.count >= MAX_ATTEMPTS) {
      throw new AppError(
        'TOO_MANY_ATTEMPTS',
        'Too many wrong attempts. Please wait 5 minutes and try again.',
      );
    }
  }

  function recordFailedAttempt(usernameKey: string): void {
    const record = failedAttempts.get(usernameKey);
    const isOutsideWindow = !record || Date.now() - record.firstAttemptAt > LOCK_WINDOW_MS;

    if (isOutsideWindow) {
      failedAttempts.set(usernameKey, { count: 1, firstAttemptAt: Date.now() });
      return;
    }

    record.count += 1;
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getCurrentUser(): SessionUser | null {
    return session.get();
  }

  /** Throws if there is no session, or if the role is not in `allowedRoles`. */
  function requireUser(allowedRoles?: UserRole[]): SessionUser {
    const user = session.get();
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 'Please log in to continue');
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new AppError('FORBIDDEN', 'Your role does not allow this action');
    }
    return user;
  }

  async function login(username: string, password: string): Promise<SessionUser> {
    const usernameKey = username.trim().toLowerCase();
    assertNotLocked(usernameKey);

    const row = users.findByUsername(username);
    const passwordMatches = row ? await verifyPassword(password, row.password_hash) : false;

    if (!row || !passwordMatches) {
      recordFailedAttempt(usernameKey);
      await wait(FAILED_ATTEMPT_DELAY_MS);
      logWarn(`Failed login attempt for username "${usernameKey}"`);
      throw new AppError('INVALID_CREDENTIALS', 'Wrong username or password');
    }

    if (row.active !== 1) {
      logWarn(`Disabled account tried to log in: "${usernameKey}"`);
      throw new AppError('ACCOUNT_DISABLED', 'This account is disabled. Contact the owner.');
    }

    failedAttempts.delete(usernameKey);
    users.updateLastLogin(row.id);

    const user = toSessionUser(row);
    session.set(user);
    return user;
  }

  /**
   * Changing the password also clears `must_change_password`, so a forced
   * first-login change only ever happens once.
   */
  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<SessionUser> {
    const currentUser = requireUser();
    const row = users.findById(currentUser.id);

    if (!row) {
      throw new AppError('NOT_FOUND', 'This user no longer exists');
    }

    const matches = await verifyPassword(currentPassword, row.password_hash);
    if (!matches) {
      throw new AppError('INVALID_CREDENTIALS', 'Current password is not correct');
    }

    const newHash = await hashPassword(newPassword);
    users.updatePasswordHash(row.id, newHash, false);

    const updated: SessionUser = { ...toSessionUser(row), mustChangePassword: false };
    session.set(updated);
    return updated;
  }

  function logout(): void {
    session.clear();
  }

  return { login, logout, getCurrentUser, requireUser, changePassword };
}

export type AuthService = ReturnType<typeof createAuthService>;

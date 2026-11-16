import type { AppDatabase } from '../connection';
import type { UserRole } from '../../../src/types/api';
import { toSqlDateTime } from '../../utils/datetime';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  active: number;
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewUserInput {
  username: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  active?: boolean;
  mustChangePassword?: boolean;
}

/** Every statement here is prepared — no string concatenation (Rules.md section 2). */
export function createUserRepository(db: AppDatabase) {
  const selectByUsername = db.prepare<[string], UserRow>(
    'SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1',
  );
  const selectById = db.prepare<[number], UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1');
  const countAll = db.prepare<[], { total: number }>('SELECT COUNT(*) AS total FROM users');
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, active, must_change_password, created_at, updated_at)
    VALUES (@username, @passwordHash, @fullName, @role, @active, @mustChangePassword, @now, @now)
  `);
  const setLastLogin = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');

  return {
    findByUsername(username: string): UserRow | undefined {
      return selectByUsername.get(username.trim());
    },

    findById(id: number): UserRow | undefined {
      return selectById.get(id);
    },

    count(): number {
      return countAll.get()?.total ?? 0;
    },

    create(input: NewUserInput): number {
      const now = toSqlDateTime();
      const result = insertUser.run({
        username: input.username.trim(),
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        role: input.role,
        active: input.active === false ? 0 : 1,
        mustChangePassword: input.mustChangePassword ? 1 : 0,
        now,
      });

      return Number(result.lastInsertRowid);
    },

    /** Writes a new hash and the matching force-change flag in one statement. */
    updatePasswordHash(userId: number, passwordHash: string, mustChangePassword: boolean): void {
      db.prepare(
        `UPDATE users
            SET password_hash = ?,
                must_change_password = ?,
                updated_at = ?
          WHERE id = ?`,
      ).run(passwordHash, mustChangePassword ? 1 : 0, toSqlDateTime(), userId);
    },

    updateLastLogin(userId: number): void {
      setLastLogin.run(toSqlDateTime(), userId);
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;

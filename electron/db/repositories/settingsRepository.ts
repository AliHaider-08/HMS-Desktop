import type { AppDatabase } from '../connection';
import { toSqlDateTime } from '../../utils/datetime';

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

/** Settings are stored as text; callers ask for the type they expect. */
export function createSettingsRepository(db: AppDatabase) {
  const selectOne = db.prepare<[string], SettingRow>(
    'SELECT key, value, updated_at FROM settings WHERE key = ? LIMIT 1',
  );
  const selectAll = db.prepare<[], SettingRow>('SELECT key, value, updated_at FROM settings');
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  return {
    get(key: string): string | null {
      return selectOne.get(key)?.value ?? null;
    },

    getAll(): Record<string, string> {
      const rows = selectAll.all();
      return rows.reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
    },

    set(key: string, value: string): void {
      upsert.run(key, value, toSqlDateTime());
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;

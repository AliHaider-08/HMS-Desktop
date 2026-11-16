/** Formats a date as the app-wide SQLite format: `YYYY-MM-DD HH:mm:ss` (local time). */
export function toSqlDateTime(date: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

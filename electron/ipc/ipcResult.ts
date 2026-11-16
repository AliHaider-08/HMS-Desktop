import type { ApiErrorCode, ApiResult } from '../../src/types/api';
import { AppError } from '../utils/errors';
import { firstIssueMessage } from '../../src/types/schemas';
import { logError } from '../services/logger';
import { ZodError } from 'zod';

/**
 * Every IPC handler goes through here so the renderer always receives
 * `{ ok: true, data }` or `{ ok: false, error: { code, message } }` (Rules.md section 3).
 */
export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: ApiErrorCode, message: string): ApiResult<T> {
  return { ok: false, error: { code, message } };
}

/** Turns anything thrown inside a handler into a friendly message and logs the technical part. */
export function toErrorResult(channel: string, error: unknown): ApiResult<never> {
  if (error instanceof ZodError) {
    return fail('VALIDATION_ERROR', firstIssueMessage(error));
  }

  if (error instanceof AppError) {
    // Expected, user-facing failures: log without a stack trace.
    logError(`${channel} failed (${error.code}): ${error.message}`);
    return fail(error.code as ApiErrorCode, error.message);
  }

  logError(`${channel} crashed unexpectedly`, error);
  return fail('INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

/** Wraps a handler body; the returned function is what `ipcMain.handle` registers. */
export function withResult<TArgs, TResult>(
  channel: string,
  handler: (args: TArgs) => Promise<TResult> | TResult,
): (_event: unknown, args: TArgs) => Promise<ApiResult<TResult>> {
  return async (_event, args) => {
    try {
      return ok(await handler(args));
    } catch (error) {
      return toErrorResult(channel, error);
    }
  };
}

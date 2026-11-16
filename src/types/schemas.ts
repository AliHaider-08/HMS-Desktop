import { z } from 'zod';

/**
 * Validation schemas shared by the React forms and the main process.
 * Rules.md requires validating twice: the form uses these for inline errors,
 * and the IPC handler parses the same payload again before touching the DB.
 */
const message = { error: 'Please check this field' };

export const usernameSchema = z
  .string(message)
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be 32 characters or fewer')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only use letters, numbers, dot, dash or underscore');

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string(message).min(1, 'Password is required').max(128, 'Password is too long'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(message).min(1, 'Current password is required'),
    newPassword: z
      .string(message)
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password is too long'),
    confirmPassword: z.string(message).min(1, 'Please confirm the new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type LoginPayload = z.infer<typeof loginSchema>;
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

/** One readable message is enough to show next to a field. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'The submitted data is not valid';
}

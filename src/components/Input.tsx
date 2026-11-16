import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** 40px high, light border, red focus ring (design.md section 7). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, type = 'text', ...rest },
  ref,
) {
  const [isRevealed, setIsRevealed] = useState(false);
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isPassword = type === 'password';
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-caption text-text-secondary">
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && isRevealed ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'h-control w-full rounded-control border bg-surface px-3 text-body text-text-primary',
            'placeholder:text-text-secondary/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
            'disabled:bg-background disabled:text-text-secondary',
            error ? 'border-status-cancelled' : 'border-border',
            isPassword && 'pr-10',
            className,
          )}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((current) => !current)}
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary hover:text-text-primary"
            tabIndex={-1}
          >
            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-caption text-status-cancelled">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-caption text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

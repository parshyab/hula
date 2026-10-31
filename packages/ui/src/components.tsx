import * as React from 'react';
import { cn } from './cn';

/* ───────────────────────── Button ───────────────────────── */
type ButtonVariant = 'primary' | 'ghost' | 'outline';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Kiosk screens use 72px targets; default is the 48px mobile target. */
  size?: 'default' | 'kiosk';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'default', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-colors duration-200 ease-brand focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'kiosk' ? 'min-h-[72px] px-8 text-xl' : 'min-h-[48px] px-5 text-base',
        variant === 'primary' && 'bg-brand text-brand-fg hover:opacity-90',
        variant === 'outline' && 'border border-border bg-surface text-text hover:bg-surface-2',
        variant === 'ghost' && 'text-text hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  );
});

/* ───────────────────────── AiBadge ───────────────────────── */
/** The small "AI" marker on every agent-produced action. Clicking opens the
 *  Why? drawer (wired by the consumer via onClick). */
export function AiBadge({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="AI-assisted — view why"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10',
        'px-2 py-0.5 text-xs font-semibold text-accent',
        className,
      )}
      {...props}
    >
      <span aria-hidden>✦</span> AI
    </button>
  );
}

/* ───────────────────────── Card ───────────────────────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface p-5 shadow-sm', className)}
      {...props}
    />
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */
/** Every loading state uses skeletons, per the design direction. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2', className)} {...props} />;
}

/* ───────────────────────── EmptyState ───────────────────────── */
/** Every empty state teaches. */
export function EmptyState({
  title,
  hint,
  className,
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-dashed border-border p-8 text-center', className)}>
      <p className="font-medium text-text">{title}</p>
      {hint ? <p className="mt-1 text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
}

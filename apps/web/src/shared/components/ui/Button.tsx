import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-primary/40',
  secondary:
    'border border-line bg-surface text-ink hover:border-dim/70 hover:bg-canvas active:bg-subtle disabled:text-dim',
  soft: 'bg-primary-soft text-primary hover:bg-primary-muted active:bg-primary-line/70 disabled:text-primary/50',
  ghost: 'text-body hover:bg-subtle hover:text-ink active:bg-line/70 disabled:text-dim',
  danger: 'text-danger hover:bg-danger-soft active:bg-danger/10 disabled:text-danger/50',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-3 text-[13px]',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-10 gap-2 rounded-lg px-4 text-sm',
};

const ICON_ONLY: Record<ButtonSize, string> = { sm: 'w-8 px-0', md: 'w-9 px-0', lg: 'w-10 px-0' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Square button; `children` becomes the accessible label. */
  iconOnly?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    trailingIcon,
    iconOnly = false,
    block = false,
    type = 'button',
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-colors duration-150 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        VARIANT[variant],
        SIZE[size],
        iconOnly && ICON_ONLY[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 13 : 15} /> : icon}
      {children && <span className={cn(iconOnly && 'sr-only')}>{children}</span>}
      {!loading && trailingIcon}
    </button>
  );
});

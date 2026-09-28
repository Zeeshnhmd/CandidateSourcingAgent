import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type PillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONE: Record<PillTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-subtle text-body ring-line', dot: 'bg-dim' },
  primary: { pill: 'bg-primary-soft text-primary ring-primary-line', dot: 'bg-primary' },
  success: { pill: 'bg-success-soft text-success ring-success/25', dot: 'bg-success' },
  warning: { pill: 'bg-warning-soft text-warning ring-warning/25', dot: 'bg-warning' },
  danger: { pill: 'bg-danger-soft text-danger ring-danger/25', dot: 'bg-danger' },
  info: { pill: 'bg-info-soft text-info ring-info/25', dot: 'bg-info' },
};

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  icon?: ReactNode;
  dot?: boolean;
  /** Animated dot for live states. */
  pulse?: boolean;
  className?: string;
}

/** Compact status label. Use antd `Tag` for skills and keywords, `Pill` for states. */
export function Pill({ tone = 'neutral', children, icon, dot = false, pulse = false, className }: PillProps) {
  const styles = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium ring-1 ring-inset',
        styles.pill,
        className,
      )}
    >
      {icon}
      {!icon && dot && (
        <span className="relative flex size-1.5">
          {pulse && (
            <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', styles.dot)} />
          )}
          <span className={cn('relative inline-flex size-1.5 rounded-full', styles.dot)} />
        </span>
      )}
      {children}
    </span>
  );
}

import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Intent = 'primary' | 'warning' | 'danger';

const INTENT: Record<Intent, string> = {
  primary: 'bg-primary-soft text-primary ring-primary-line/60',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/20',
};

interface StateMessageProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  intent?: Intent;
  className?: string;
}

/** Empty, error and not-found states. */
export function StateMessage({ icon, title, description, action, intent = 'primary', className }: StateMessageProps) {
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center', className)}>
      <div className={cn('flex size-12 items-center justify-center rounded-2xl ring-1 ring-inset', INTENT[intent])}>
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

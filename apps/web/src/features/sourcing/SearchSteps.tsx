import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { cn } from '../../shared/lib/cn';

const STEPS = ['Describe the role', 'Review persona', 'Get shortlist'];

export function SearchSteps({ current }: { current: number }) {
  return (
    <ol className="m-0 mb-6 flex list-none items-center gap-3 p-0" aria-label="Search progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={label}>
            {index > 0 && (
              <li aria-hidden className={cn('h-px min-w-6 flex-1', done || active ? 'bg-primary-line' : 'bg-line')} />
            )}
            <li className="flex shrink-0 items-center gap-2.5" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done && 'bg-primary text-white',
                  active && 'bg-primary-soft text-primary ring-2 ring-primary',
                  !done && !active && 'bg-subtle text-muted',
                )}
              >
                {done ? <Check size={13} strokeWidth={3} aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden text-[13px] sm:inline',
                  active ? 'font-medium text-ink' : done ? 'text-body' : 'text-muted',
                )}
              >
                {label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

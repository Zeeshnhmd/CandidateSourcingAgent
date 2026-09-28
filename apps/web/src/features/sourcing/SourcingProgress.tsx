import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandMark } from '../../shared/components/BrandMark';
import { Panel } from '../../shared/components/ui/Panel';
import { Spinner } from '../../shared/components/ui/Spinner';
import { cn } from '../../shared/lib/cn';

/** Stages mirror the API pipeline. Durations are typical timings used to pace the indicator. */
const STAGES = [
  { label: 'Planning sources for this persona', typicalMs: 500 },
  { label: 'Searching the talent network and GitHub', typicalMs: 2600 },
  { label: 'Resolving duplicate identities', typicalMs: 500 },
  { label: 'Enriching profiles', typicalMs: 700 },
  { label: 'Collecting public GitHub evidence', typicalMs: 1400 },
  { label: 'Scoring and ranking candidates', typicalMs: 900 },
  { label: 'Writing match explanations', typicalMs: 2400 },
];
const TOTAL_MS = STAGES.reduce((sum, stage) => sum + stage.typicalMs, 0);

function stageAt(elapsed: number): number {
  let cumulative = 0;
  for (const [index, stage] of STAGES.entries()) {
    cumulative += stage.typicalMs;
    if (elapsed < cumulative) return index;
  }
  return STAGES.length - 1;
}

/**
 * Focused progress view while a sourcing run executes. The run is a single request, so stages advance
 * on typical timings and the last stage holds until the response arrives.
 */
export function SourcingProgress({ roleTitle }: { roleTitle: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => setElapsed(performance.now() - started), 120);
    return () => window.clearInterval(timer);
  }, []);

  const current = stageAt(elapsed);
  const progress = Math.min(94, (elapsed / TOTAL_MS) * 94);

  return (
    <Panel
      className="mx-auto max-w-xl overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={`Building shortlist for ${roleTitle}`}
    >
      <div className="h-1 bg-subtle">
        <div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="px-8 pb-8 pt-7">
        <div className="flex items-center gap-4">
          <span className="relative flex">
            <span className="absolute inset-0 animate-ping rounded-[10px] bg-primary/20" aria-hidden />
            <BrandMark size={40} className="relative" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink">Building your shortlist</h2>
            <p className="truncate text-sm text-muted">{roleTitle}</p>
          </div>
        </div>

        <ol className="m-0 mt-7 list-none space-y-3 p-0">
          {STAGES.map((stage, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li key={stage.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full',
                    done && 'bg-primary text-white',
                    active && 'text-primary',
                    !done && !active && 'border border-line',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} aria-hidden /> : active ? <Spinner size={16} /> : null}
                </span>
                <span
                  className={cn('text-[13.5px]', active ? 'font-medium text-ink' : done ? 'text-body' : 'text-dim')}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}

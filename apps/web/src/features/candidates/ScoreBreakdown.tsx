import { Info } from 'lucide-react';
import type { MatchScore } from '@csa/contracts';
import { cn } from '../../shared/lib/cn';
import { TIER_META } from './MatchScore';

/** Shows exactly where the score came from, including factors excluded from this run. */
export function ScoreBreakdown({ score }: { score: MatchScore }) {
  const earned = score.components.filter((item) => item.applicable).reduce((sum, item) => sum + item.points, 0);
  const normalised = score.applicableWeight < 100;

  return (
    <div>
      <ul className="m-0 list-none space-y-4 p-0">
        {score.components.map((item) => {
          const percent = Math.round(item.ratio * 100);
          return (
            <li key={item.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn('text-[13px] font-medium', item.applicable ? 'text-ink' : 'text-muted')}>
                  {item.label}
                </span>
                {item.applicable ? (
                  <span className="text-[13px] tabular-nums">
                    <span className="font-semibold text-ink">{item.points}</span>
                    <span className="text-dim"> / {item.weight}</span>
                  </span>
                ) : (
                  <span className="rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-muted">Not scored</span>
                )}
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle"
                role={item.applicable ? 'progressbar' : undefined}
                aria-label={item.applicable ? `${item.label} ${percent} percent` : undefined}
                aria-valuenow={item.applicable ? percent : undefined}
                aria-valuemin={item.applicable ? 0 : undefined}
                aria-valuemax={item.applicable ? 100 : undefined}
              >
                {item.applicable && (
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                  />
                )}
              </div>
              <p className="m-0 mt-1.5 text-xs leading-5 text-muted">{item.detail}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex gap-2.5 rounded-lg bg-canvas p-3.5 text-xs leading-5 text-muted ring-1 ring-inset ring-line-soft">
        <Info size={15} className="mt-0.5 shrink-0 text-dim" aria-hidden />
        <p className="m-0">
          <span className="font-medium text-ink">
            Total {score.total} ({TIER_META[score.tier].label.toLowerCase()} match)
          </span>
          {normalised
            ? ` = ${earned.toFixed(1)} earned of ${score.applicableWeight} applicable points, scaled to 100. Factors marked not scored are excluded.`
            : ` = ${earned.toFixed(1)} of 100 points.`}{' '}
          Scoring policy {score.policyVersion}. Scores are deterministic; AI contributes only semantic relevance.
        </p>
      </div>
    </div>
  );
}

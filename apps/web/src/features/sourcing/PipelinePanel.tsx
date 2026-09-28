import { useState } from 'react';
import { ChevronDown, CircleCheck, CircleDashed, CircleX, TriangleAlert, Workflow } from 'lucide-react';
import type { PipelineStage, PlanStepStatus, SourcePlanStep } from '@csa/contracts';
import { Panel } from '../../shared/components/ui/Panel';
import { Pill } from '../../shared/components/ui/Pill';
import { cn } from '../../shared/lib/cn';

const STAGE_LABEL: Record<PipelineStage, string> = {
  discover: 'Discover',
  resolve: 'Resolve',
  enrich: 'Enrich',
  evidence: 'Evidence',
  embed: 'Relevance',
  score: 'Score',
  explain: 'Explain',
};

const STATUS: Record<PlanStepStatus, { icon: typeof CircleCheck; className: string; label: string }> = {
  completed: { icon: CircleCheck, className: 'text-success', label: 'Completed' },
  partial: { icon: TriangleAlert, className: 'text-warning', label: 'Partial' },
  failed: { icon: CircleX, className: 'text-danger', label: 'Failed' },
  skipped: { icon: CircleDashed, className: 'text-dim', label: 'Skipped' },
};

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

function StageChips({ steps }: { steps: SourcePlanStep[] }) {
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0" aria-label="Pipeline stages">
      {steps.map((step) => {
        const status = STATUS[step.status];
        const Icon = status.icon;
        return (
          <li
            key={`${step.stage}-${step.providerId}`}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-subtle px-2 py-1 text-xs text-body"
            title={`${step.providerName}: ${step.detail}`}
          >
            <Icon size={13} className={status.className} aria-label={status.label} />
            {STAGE_LABEL[step.stage]}
            {step.stage === 'discover' && <span className="text-muted">· {step.providerName}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Compact view of how the run was planned and executed, expandable into per-step detail. */
export function PipelinePanel({ steps }: { steps: SourcePlanStep[] }) {
  const [open, setOpen] = useState(false);
  const totalMs = steps.reduce((sum, step) => sum + step.durationMs, 0);
  const issues = steps.filter((step) => step.status === 'failed' || step.status === 'partial').length;

  return (
    <Panel>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="block w-full rounded-xl px-5 py-3.5 text-left transition-colors hover:bg-canvas/60"
      >
        <span className="flex items-center gap-5">
          <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-ink">
            <Workflow size={16} className="text-dim" aria-hidden />
            Source plan
          </span>
          <span className="hidden min-w-0 flex-1 lg:block">
            <StageChips steps={steps} />
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted">
            {issues > 0 && <Pill tone="warning">{issues} need attention</Pill>}
            <span className="tabular-nums">{formatDuration(totalMs)}</span>
            <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
          </span>
        </span>
        <span className="mt-3 block lg:hidden">
          <StageChips steps={steps} />
        </span>
      </button>

      {open && (
        <ul className="m-0 list-none divide-y divide-line-soft border-t border-line-soft p-0">
          {steps.map((step) => {
            const status = STATUS[step.status];
            const Icon = status.icon;
            return (
              <li key={`${step.stage}-${step.providerId}-detail`} className="flex gap-3 px-5 py-3">
                <Icon size={16} className={cn('mt-0.5 shrink-0', status.className)} aria-label={status.label} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[13px] font-medium text-ink">{STAGE_LABEL[step.stage]}</span>
                    <span className="text-[13px] text-muted">{step.providerName}</span>
                    {step.capability && <Pill tone="neutral">{step.capability}</Pill>}
                  </div>
                  <p className="m-0 mt-0.5 text-[13px] text-body">{step.description}</p>
                  <p className="m-0 mt-0.5 text-xs text-muted">{step.detail}</p>
                </div>
                {step.durationMs > 0 && (
                  <span className="shrink-0 text-xs tabular-nums text-muted">{formatDuration(step.durationMs)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

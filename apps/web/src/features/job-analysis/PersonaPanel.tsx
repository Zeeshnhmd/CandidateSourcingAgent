import type { ReactNode } from 'react';
import { Info, RefreshCw, Sparkles, UserRoundSearch } from 'lucide-react';
import type { CandidatePersona, JobAnalysisResult } from '@csa/contracts';
import { Button } from '../../shared/components/ui/Button';
import { Panel, PanelHeader } from '../../shared/components/ui/Panel';
import { Pill } from '../../shared/components/ui/Pill';
import { Shimmer } from '../../shared/components/ui/Shimmer';
import { PersonaEditor } from './PersonaEditor';

interface PersonaPanelProps {
  analysis: { result: JobAnalysisResult; version: number } | null;
  analyzing: boolean;
  stale: boolean;
  onReanalyze: () => void;
  submitting: boolean;
  onSubmit: (persona: CandidatePersona) => void;
  notice?: ReactNode;
}

const EXTRACTED_FIELDS = [
  'Role and seniority',
  'Years of experience',
  'Must-have and nice-to-have skills',
  'Location and work mode',
];

function PersonaSkeleton() {
  const field = (labelWidth: string) => (
    <div className="space-y-2">
      <Shimmer className={`h-3 ${labelWidth}`} />
      <Shimmer className="h-9 w-full" />
    </div>
  );
  return (
    <div aria-hidden>
      {['Role', 'Experience', 'Skills', 'Location'].map((section, index) => (
        <div key={section} className="space-y-4 border-b border-line-soft px-5 py-5">
          <Shimmer className="h-3.5 w-24" />
          <div className={index === 2 ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
            {field('w-20')}
            {field('w-16')}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyPersona() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary ring-1 ring-inset ring-primary-line/60">
        <UserRoundSearch size={22} aria-hidden />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">Your candidate persona appears here</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">
        Analyze a job description and the agent extracts who you are looking for. You can review everything before
        sourcing.
      </p>
      <ul className="mt-6 w-full max-w-xs space-y-2 p-0 text-left">
        {EXTRACTED_FIELDS.map((field) => (
          <li
            key={field}
            className="flex list-none items-center gap-2.5 rounded-lg border border-dashed border-line px-3 py-2 text-[13px] text-muted"
          >
            <span className="size-1.5 rounded-full bg-primary-line" aria-hidden />
            {field}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PersonaPanel({
  analysis,
  analyzing,
  stale,
  onReanalyze,
  submitting,
  onSubmit,
  notice,
}: PersonaPanelProps) {
  const provider = analysis?.result.analyzedBy;
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        icon={<UserRoundSearch size={16} aria-hidden />}
        title="Candidate persona"
        description="Review and refine who you are looking for."
        actions={
          analysis && !analyzing ? (
            provider === 'openai' ? (
              <Pill tone="primary" icon={<Sparkles size={12} aria-hidden />}>
                Extracted by AI
              </Pill>
            ) : (
              <Pill tone="neutral">Rule-based extraction</Pill>
            )
          ) : null
        }
      />
      <div aria-live="polite" aria-busy={analyzing} className="flex flex-1 flex-col">
        {analyzing ? (
          <PersonaSkeleton />
        ) : !analysis ? (
          <EmptyPersona />
        ) : (
          <>
            {(stale || analysis.result.warnings.length > 0) && (
              <div className="space-y-2 px-5 pt-4">
                {stale && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning ring-1 ring-inset ring-warning/20">
                    <span>The job description changed after this analysis.</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<RefreshCw size={13} aria-hidden />}
                      onClick={onReanalyze}
                    >
                      Re-analyze
                    </Button>
                  </div>
                )}
                {analysis.result.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="flex items-start gap-2.5 rounded-lg bg-info-soft px-3.5 py-2.5 text-[13px] text-info ring-1 ring-inset ring-info/20"
                  >
                    <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
                    {warning}
                  </div>
                ))}
              </div>
            )}
            <PersonaEditor
              key={analysis.version}
              persona={analysis.result.persona}
              submitting={submitting}
              onSubmit={onSubmit}
              notice={notice}
            />
          </>
        )}
      </div>
    </Panel>
  );
}

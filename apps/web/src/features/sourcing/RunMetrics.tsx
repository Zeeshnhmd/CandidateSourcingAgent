import type { ReactNode } from 'react';
import { GitMerge, Layers, Trophy, Users } from 'lucide-react';
import type { SourcingRun } from '@csa/contracts';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';

function Metric({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        <span className="flex size-7 items-center justify-center rounded-md bg-subtle text-body">{icon}</span>
      </div>
      <p className="m-0 mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink">{value}</p>
      <p className="m-0 mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}

export function RunMetrics({ run }: { run: SourcingRun }) {
  const strong = run.candidates.filter((item) => item.score.tier === 'strong').length;
  const { stats } = run;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Metric
        icon={<Users size={15} aria-hidden />}
        label="Candidates ranked"
        value={stats.uniqueCandidates}
        hint={`From ${stats.discoveredRecords} discovered records`}
      />
      <Metric
        icon={<Trophy size={15} aria-hidden />}
        label="Strong matches"
        value={strong}
        hint="Score of 75 or higher"
      />
      <Metric
        icon={<GitMerge size={15} aria-hidden />}
        label="Duplicates merged"
        value={stats.duplicatesMerged}
        hint="Resolved to one identity"
      />
      <Metric
        icon={<Layers size={15} aria-hidden />}
        label="Enriched profiles"
        value={stats.enrichedCandidates}
        hint="Education, certifications, skills"
      />
      <Metric
        icon={<GitHubMark size={14} />}
        label="GitHub evidence"
        value={stats.liveEvidence + stats.mockEvidence}
        hint={`${stats.liveEvidence} live · ${stats.mockEvidence} sample`}
      />
    </div>
  );
}

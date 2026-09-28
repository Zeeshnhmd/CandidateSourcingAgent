import { Tooltip } from 'antd';
import { Database } from 'lucide-react';
import type { CandidateEvidence, RankedCandidate } from '@csa/contracts';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';
import { Pill } from '../../shared/components/ui/Pill';
import { discoverySources } from './filterCandidates';

export function SourceIcon({ source, size = 12 }: { source: string; size?: number }) {
  return source === 'GitHub' ? <GitHubMark size={size - 1} /> : <Database size={size} aria-hidden />;
}

/** Where the candidate was found, with merged duplicates noted in the tooltip. */
export function SourceChips({ item }: { item: RankedCandidate }) {
  const discovered = item.candidate.sourceRecords.filter((record) => record.capability === 'DISCOVER');
  return (
    <div className="flex flex-wrap gap-1">
      {discoverySources(item).map((source) => {
        const records = discovered.filter((record) => record.sourceName === source);
        return (
          <Tooltip
            key={source}
            title={
              records.length > 1
                ? `${records.length} duplicate records merged: ${records.map((record) => record.externalId).join(', ')}`
                : records[0]?.externalId
            }
          >
            <span
              tabIndex={0}
              className="inline-flex h-[22px] items-center gap-1 rounded-md bg-subtle px-1.5 text-xs text-body outline-none"
            >
              <SourceIcon source={source} />
              {source}
              {records.length > 1 && <span className="text-muted">×{records.length}</span>}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function EvidenceIndicator({ evidence }: { evidence: CandidateEvidence }) {
  switch (evidence.status) {
    case 'available':
      return evidence.github?.mode === 'live' ? (
        <Pill tone="success" icon={<GitHubMark size={11} />}>
          Live GitHub
        </Pill>
      ) : (
        <Tooltip title="Sample evidence from the talent network dataset">
          <span tabIndex={0} className="outline-none">
            <Pill tone="neutral" icon={<GitHubMark size={11} />}>
              Sample GitHub
            </Pill>
          </span>
        </Tooltip>
      );
    case 'unavailable':
      return (
        <Tooltip title={evidence.note}>
          <span tabIndex={0} className="outline-none">
            <Pill tone="warning">Unavailable</Pill>
          </span>
        </Tooltip>
      );
    case 'not-applicable':
      return <span className="text-xs text-dim">Not scored</span>;
    default:
      return <span className="text-xs text-dim">No GitHub</span>;
  }
}

import type { CandidateProfile } from '@csa/contracts';
import { Pill } from '../../shared/components/ui/Pill';
import { formatDate } from '../../shared/lib/format';
import { SourceIcon } from './SourceBadges';

/** Which provider records contributed to this candidate and which fields came from each. */
export function ProvenancePanel({ candidate }: { candidate: CandidateProfile }) {
  const fieldsByRecord = new Map<string, string[]>();
  for (const item of candidate.fieldProvenance) {
    fieldsByRecord.set(item.externalId, [...new Set([...(fieldsByRecord.get(item.externalId) ?? []), item.field])]);
  }

  return (
    <ul className="m-0 list-none divide-y divide-line-soft overflow-hidden rounded-lg border border-line-soft p-0">
      {candidate.sourceRecords.map((record) => (
        <li
          key={`${record.sourceId}-${record.capability}-${record.externalId}`}
          className="flex items-start gap-3 px-3.5 py-3"
        >
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-subtle text-body">
            <SourceIcon source={record.sourceName} size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-ink">{record.sourceName}</span>
              <Pill tone={record.capability === 'DISCOVER' ? 'primary' : 'info'}>
                {record.capability === 'DISCOVER' ? 'Discovery' : 'Enrichment'}
              </Pill>
              {record.isMock && <Pill tone="neutral">Sample</Pill>}
            </div>
            <p className="m-0 mt-1 text-xs text-muted">
              <code className="font-mono text-[11.5px] text-body">{record.externalId}</code> · Retrieved{' '}
              {formatDate(record.retrievedAt)}
            </p>
            {(fieldsByRecord.get(record.externalId)?.length ?? 0) > 0 && (
              <p className="m-0 mt-1 text-xs text-muted">
                Provided: {fieldsByRecord.get(record.externalId)?.join(', ')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

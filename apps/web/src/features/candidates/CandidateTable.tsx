import type { ReactNode } from 'react';
import { Tooltip, type TableColumnsType } from 'antd';
import { ChevronRight, Globe, Plane } from 'lucide-react';
import type { RankedCandidate } from '@csa/contracts';
import { Avatar } from '../../shared/components/ui/Avatar';
import { DataTable } from '../../shared/components/ui/DataTable';
import { SkillTag } from '../../shared/components/ui/SkillTag';
import { formatYears } from '../../shared/lib/format';
import { MatchScore } from './MatchScore';
import { EvidenceIndicator, SourceChips } from './SourceBadges';

const VISIBLE_SKILLS = 2;

export function isExperienceEstimated(item: RankedCandidate): boolean {
  return item.candidate.experience.length === 0 && item.candidate.publicActivitySince !== null;
}

/** Coverage bar and count on one line, then at most one line of matched skills. */
function SkillCoverage({ item }: { item: RankedCandidate }) {
  const { matchedMustHave, missingMustHave } = item.skillMatch;
  const total = matchedMustHave.length + missingMustHave.length;
  if (!total) return <span className="text-xs text-dim">No must-haves set</span>;
  const visible = matchedMustHave.slice(0, VISIBLE_SKILLS);
  const hidden = matchedMustHave.slice(VISIBLE_SKILLS);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-subtle" aria-hidden>
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(matchedMustHave.length / total) * 100}%` }}
          />
        </div>
        <span className="tabular-nums text-body">
          {matchedMustHave.length}/{total}
        </span>
        {missingMustHave.length > 0 && (
          <Tooltip title={`Missing: ${missingMustHave.join(', ')}`}>
            <span
              tabIndex={0}
              className="cursor-help text-muted underline decoration-dotted underline-offset-2 outline-none"
            >
              {missingMustHave.length} missing
            </span>
          </Tooltip>
        )}
      </div>
      {visible.length > 0 ? (
        <div className="flex min-w-0 flex-nowrap gap-1">
          {visible.map((skill) => (
            <SkillTag key={skill} tone="matched" className="min-w-0 shrink">
              {skill}
            </SkillTag>
          ))}
          {hidden.length > 0 && (
            <Tooltip title={hidden.join(', ')}>
              <span tabIndex={0} className="inline-flex shrink-0 rounded-md outline-none">
                <SkillTag tone="subtle">+{hidden.length}</SkillTag>
              </span>
            </Tooltip>
          )}
        </div>
      ) : (
        <span className="text-xs text-dim">No must-haves matched</span>
      )}
    </div>
  );
}

interface CandidateTableProps {
  candidates: RankedCandidate[];
  onOpen: (candidateId: string) => void;
  emptyText: ReactNode;
}

export function CandidateTable({ candidates, onOpen, emptyText }: CandidateTableProps) {
  const columns: TableColumnsType<RankedCandidate> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 52,
      sorter: (a, b) => a.rank - b.rank,
      defaultSortOrder: 'ascend',
      render: (rank: number) => <span className="font-medium tabular-nums text-muted">{rank}</span>,
    },
    {
      title: 'Candidate',
      key: 'candidate',
      width: 246,
      render: (_, item) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item.candidate.fullName} src={item.candidate.avatarUrl} size={36} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(item.candidate.id);
              }}
              className="block max-w-full truncate text-left font-medium text-ink transition-colors hover:text-primary"
            >
              {item.candidate.fullName}
            </button>
            <p className="truncate text-xs text-muted">
              {item.candidate.currentTitle}
              {item.candidate.currentCompany ? ` at ${item.candidate.currentCompany}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Match',
      key: 'score',
      width: 150,
      sorter: (a, b) => a.score.total - b.score.total,
      render: (_, item) => <MatchScore score={item.score} size={38} />,
    },
    {
      title: 'Must-have skills',
      key: 'skills',
      width: 236,
      render: (_, item) => <SkillCoverage item={item} />,
    },
    {
      title: 'Experience',
      key: 'experience',
      width: 132,
      sorter: (a, b) => a.relevantYears - b.relevantYears,
      render: (_, item) => (
        <div className="leading-tight">
          <p className="text-sm text-ink">
            {formatYears(item.relevantYears)}
            {isExperienceEstimated(item) && (
              <Tooltip title="Estimated from public GitHub activity. No employment history from this source.">
                <span
                  tabIndex={0}
                  className="ml-1 cursor-help text-xs text-dim underline decoration-dotted underline-offset-2 outline-none"
                >
                  est.
                </span>
              </Tooltip>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">relevant of {formatYears(item.candidate.totalYearsExperience)}</p>
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 150,
      render: (_, item) => (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-ink">{item.candidate.location.label}</p>
          <div className="mt-1 flex gap-2.5 text-xs text-muted">
            {item.candidate.openToRemote && (
              <span className="inline-flex items-center gap-1">
                <Globe size={12} aria-hidden /> Remote
              </span>
            )}
            {item.candidate.openToRelocation && (
              <span className="inline-flex items-center gap-1">
                <Plane size={12} aria-hidden /> Relocate
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Source',
      key: 'provenance',
      width: 172,
      render: (_, item) => (
        <div className="flex flex-col items-start gap-1.5">
          <SourceChips item={item} />
          <EvidenceIndicator evidence={item.evidence} />
        </div>
      ),
    },
    {
      title: <span className="sr-only">Open</span>,
      key: 'open',
      width: 36,
      align: 'right',
      render: () => <ChevronRight size={16} className="text-dim" aria-hidden />,
    },
  ];

  return (
    <DataTable<RankedCandidate>
      embedded
      rowKey={(item) => item.candidate.id}
      columns={columns}
      dataSource={candidates}
      tableLayout="fixed"
      scroll={{ x: 1174 }}
      pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
      locale={{ emptyText }}
      onRow={(item) => ({ onClick: () => onOpen(item.candidate.id), className: 'cursor-pointer' })}
    />
  );
}

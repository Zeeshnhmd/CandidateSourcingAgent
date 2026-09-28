import { useMemo, useState } from 'react';
import { App, Input, Popconfirm, type TableColumnsType } from 'antd';
import { AlertTriangle, ArrowRight, Bookmark, Database, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { SourcingRunSummary } from '@csa/contracts';
import { PageHeader } from '../../shared/components/PageHeader';
import { Button } from '../../shared/components/ui/Button';
import { DataTable } from '../../shared/components/ui/DataTable';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';
import { Panel } from '../../shared/components/ui/Panel';
import { Pill } from '../../shared/components/ui/Pill';
import { ScoreRing } from '../../shared/components/ui/ScoreRing';
import { Shimmer } from '../../shared/components/ui/Shimmer';
import { StateMessage } from '../../shared/components/ui/StateMessage';
import { SkillTag } from '../../shared/components/ui/SkillTag';
import { errorMessage } from '../../shared/lib/apiClient';
import { capitalize, formatDateTime, formatRelativeTime, pluralize } from '../../shared/lib/format';
import { colors } from '../../theme/tokens';
import { useDeleteSearch, useSavedSearches } from './useSourcingRuns';

function scoreColor(score: number): string {
  if (score >= 75) return colors.success;
  if (score >= 55) return colors.info;
  if (score >= 35) return colors.warning;
  return colors.dim;
}

function TableSkeleton() {
  return (
    <Panel aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-b border-line-soft px-5 py-4 last:border-b-0">
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-56" />
            <Shimmer className="h-3 w-36" />
          </div>
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-4 w-16" />
          <Shimmer className="size-8 rounded-full" />
          <Shimmer className="h-8 w-20" />
        </div>
      ))}
    </Panel>
  );
}

export function SavedSearchesPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const searchesQuery = useSavedSearches();
  const deleteSearch = useDeleteSearch();
  const [filter, setFilter] = useState('');

  const searches = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const all = searchesQuery.data ?? [];
    if (!term) return all;
    return all.filter((search) =>
      [search.roleTitle, search.location ?? '', ...search.mustHaveSkills].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [searchesQuery.data, filter]);

  const open = (id: string) => void navigate(`/searches/${id}`);
  const newSearchButton = (
    <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => void navigate('/')}>
      New search
    </Button>
  );

  const columns: TableColumnsType<SourcingRunSummary> = [
    {
      title: 'Search',
      key: 'role',
      width: 330,
      render: (_, search) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{search.roleTitle}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {capitalize(search.seniority)}
            {search.workMode === 'remote' ? ' · Remote' : search.location ? ` · ${search.location}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {search.mustHaveSkills.slice(0, 4).map((skill) => (
              <SkillTag key={skill}>{skill}</SkillTag>
            ))}
            {search.mustHaveSkills.length > 4 && <SkillTag tone="subtle">+{search.mustHaveSkills.length - 4}</SkillTag>}
          </div>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 140,
      render: (createdAt: string) => (
        <div className="leading-tight">
          <p className="text-sm text-ink">{formatRelativeTime(createdAt)}</p>
          <p className="mt-1 text-xs tabular-nums text-muted">{formatDateTime(createdAt)}</p>
        </div>
      ),
    },
    {
      title: 'Candidates',
      key: 'candidates',
      width: 140,
      render: (_, search) => (
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-sm tabular-nums text-ink">{pluralize(search.candidateCount, 'candidate')}</span>
          {search.strongCount > 0 && (
            <Pill tone="success" dot>
              {search.strongCount} strong
            </Pill>
          )}
        </div>
      ),
    },
    {
      title: 'Top match',
      key: 'top',
      width: 200,
      render: (_, search) =>
        search.topCandidate ? (
          <div className="flex items-center gap-2.5">
            <ScoreRing
              value={search.topCandidate.score}
              color={scoreColor(search.topCandidate.score)}
              size={34}
              label={`Top score ${search.topCandidate.score}`}
            />
            <span className="truncate text-sm text-body">{search.topCandidate.name}</span>
          </div>
        ) : (
          <span className="text-sm text-dim">No matches</span>
        ),
    },
    {
      title: 'Sources',
      key: 'sources',
      width: 150,
      render: (_, search) => (
        <div className="flex flex-wrap gap-1">
          {search.sources.map((source) => (
            <span
              key={source}
              className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-0.5 text-xs text-body"
            >
              {source === 'GitHub' ? <GitHubMark size={11} /> : <Database size={11} aria-hidden />}
              {source}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: <span className="sr-only">Actions</span>,
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, search) => (
        <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Popconfirm
            title="Delete this saved search?"
            description="The shortlist and its scores will be removed."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deleteSearch.isPending }}
            onConfirm={() =>
              deleteSearch.mutate(search.id, {
                onSuccess: () => void message.success('Search deleted'),
                onError: (error) => void message.error(errorMessage(error)),
              })
            }
          >
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Trash2 size={15} aria-hidden />}
              aria-label={`Delete ${search.roleTitle}`}
            >
              Delete
            </Button>
          </Popconfirm>
          <Button size="sm" trailingIcon={<ArrowRight size={14} aria-hidden />} onClick={() => open(search.id)}>
            Open
          </Button>
        </div>
      ),
    },
  ];

  const total = searchesQuery.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Saved searches"
        description="Every search is saved automatically. Reopen a shortlist anytime to review candidates and scores."
        actions={total > 0 ? newSearchButton : undefined}
      />

      {searchesQuery.isPending ? (
        <TableSkeleton />
      ) : searchesQuery.isError ? (
        <Panel>
          <StateMessage
            intent="danger"
            icon={<AlertTriangle size={22} aria-hidden />}
            title="Saved searches could not be loaded"
            description={errorMessage(searchesQuery.error)}
            action={
              <Button variant="primary" onClick={() => void searchesQuery.refetch()} loading={searchesQuery.isFetching}>
                Try again
              </Button>
            }
          />
        </Panel>
      ) : total === 0 ? (
        <Panel>
          <StateMessage
            icon={<Bookmark size={22} aria-hidden />}
            title="No saved searches yet"
            description="Run your first search and it will be saved here, ready to revisit anytime."
            action={newSearchButton}
          />
        </Panel>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Input
              allowClear
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              prefix={<Search size={15} className="text-dim" aria-hidden />}
              placeholder="Filter by role, location or skill"
              aria-label="Filter saved searches"
              className="w-full sm:w-80"
            />
            <span className="text-[13px] text-muted" role="status">
              {searches.length === total
                ? pluralize(total, 'search', 'searches')
                : `${searches.length} of ${total} searches`}
            </span>
          </div>
          <DataTable<SourcingRunSummary>
            rowKey="id"
            columns={columns}
            dataSource={searches}
            tableLayout="fixed"
            scroll={{ x: 1110 }}
            pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
            onRow={(search) => ({ onClick: () => open(search.id), className: 'cursor-pointer' })}
            locale={{
              emptyText: (
                <StateMessage
                  icon={<Search size={22} aria-hidden />}
                  title="No searches match this filter"
                  action={
                    <Button size="sm" onClick={() => setFilter('')}>
                      Clear filter
                    </Button>
                  }
                />
              ),
            }}
          />
        </>
      )}
    </>
  );
}

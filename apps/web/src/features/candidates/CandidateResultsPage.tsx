import { useMemo, useState } from 'react';
import { App } from 'antd';
import { AlertTriangle, Calendar, Plus, RefreshCw, SearchX, TriangleAlert, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import type { SourcingRun } from '@csa/contracts';
import { PageHeader } from '../../shared/components/PageHeader';
import { Button } from '../../shared/components/ui/Button';
import { Panel, PanelHeader } from '../../shared/components/ui/Panel';
import { Shimmer } from '../../shared/components/ui/Shimmer';
import { StateMessage } from '../../shared/components/ui/StateMessage';
import { SkillTag } from '../../shared/components/ui/SkillTag';
import { ApiError, errorMessage } from '../../shared/lib/apiClient';
import { capitalize, formatDateTime } from '../../shared/lib/format';
import { PipelinePanel } from '../sourcing/PipelinePanel';
import { RunMetrics } from '../sourcing/RunMetrics';
import { useSourcingRun, useStartSourcing } from '../sourcing/useSourcingRuns';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import { CandidateFilters } from './CandidateFilters';
import { CandidateTable } from './CandidateTable';
import { DEFAULT_FILTERS, filterCandidates, locationOptions, sourceOptions } from './filterCandidates';

function personaSummary(run: SourcingRun): string {
  const { persona } = run;
  const parts = [capitalize(persona.seniority)];
  if (persona.minYearsExperience !== null) {
    parts.push(
      persona.maxYearsExperience !== null
        ? `${persona.minYearsExperience} to ${persona.maxYearsExperience} years`
        : `${persona.minYearsExperience}+ years`,
    );
  }
  if (persona.workMode === 'remote') parts.push('Remote');
  else if (persona.location)
    parts.push(`${persona.location}${persona.workMode !== 'unspecified' ? ` · ${capitalize(persona.workMode)}` : ''}`);
  return parts.join(' · ');
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading shortlist">
      <Shimmer className="h-7 w-72" />
      <Shimmer className="mt-3 h-4 w-96" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Shimmer key={index} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <Shimmer className="mt-4 h-14 rounded-xl" />
      <Panel className="mt-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-5 border-b border-line-soft px-5 py-4 last:border-b-0">
            <Shimmer className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-44" />
              <Shimmer className="h-3 w-60" />
            </div>
            <Shimmer className="size-9 rounded-full" />
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-4 w-24" />
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function CandidateResultsPage() {
  const { runId = '' } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const runQuery = useSourcingRun(runId);
  const rerun = useStartSourcing();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const run = runQuery.data;
  const filtered = useMemo(() => (run ? filterCandidates(run.candidates, filters) : []), [run, filters]);
  const locations = useMemo(() => (run ? locationOptions(run.candidates) : []), [run]);
  const sources = useMemo(() => (run ? sourceOptions(run.candidates) : []), [run]);

  const newSearchButton = (
    <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => void navigate('/')}>
      New search
    </Button>
  );

  if (runQuery.isPending) return <ResultsSkeleton />;

  if (runQuery.isError || !run) {
    const notFound = runQuery.error instanceof ApiError && runQuery.error.status === 404;
    return (
      <Panel>
        <StateMessage
          intent={notFound ? 'primary' : 'danger'}
          icon={notFound ? <SearchX size={22} aria-hidden /> : <AlertTriangle size={22} aria-hidden />}
          title={notFound ? 'This search no longer exists' : 'The shortlist could not be loaded'}
          description={
            notFound
              ? 'It may have been deleted. Start a new search or open another saved search.'
              : errorMessage(runQuery.error)
          }
          action={
            notFound ? (
              <>
                <Button onClick={() => void navigate('/searches')}>Saved searches</Button>
                {newSearchButton}
              </>
            ) : (
              <Button variant="primary" onClick={() => void runQuery.refetch()} loading={runQuery.isFetching}>
                Try again
              </Button>
            )
          }
        />
      </Panel>
    );
  }

  const selected = run.candidates.find((item) => item.candidate.id === selectedId) ?? null;
  const runAgain = () =>
    rerun.mutate(run.persona, {
      onSuccess: (next) => {
        void message.success('Search refreshed with the latest data');
        void navigate(`/searches/${next.id}`);
      },
      onError: (error) => void message.error(errorMessage(error)),
    });

  return (
    <>
      <PageHeader
        title={run.persona.roleTitle}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{personaSummary(run)}</span>
            <span className="inline-flex items-center gap-1.5 text-dim">
              <Calendar size={13} aria-hidden />
              {formatDateTime(run.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            <Button icon={<RefreshCw size={15} aria-hidden />} loading={rerun.isPending} onClick={runAgain}>
              {rerun.isPending ? 'Running' : 'Run again'}
            </Button>
            {newSearchButton}
          </>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {run.persona.mustHaveSkills.map((skill) => (
            <SkillTag key={skill}>{skill}</SkillTag>
          ))}
          {run.persona.niceToHaveSkills.map((skill) => (
            <SkillTag key={skill} tone="nice">
              {skill}
            </SkillTag>
          ))}
        </div>
      </PageHeader>

      {run.warnings.length > 0 && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3.5 text-[13px] text-warning ring-1 ring-inset ring-warning/20"
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="m-0 font-medium">Some providers were degraded during this search</p>
            <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4">
              {run.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mb-5 space-y-4">
        <RunMetrics run={run} />
        <PipelinePanel steps={run.plan} />
      </div>

      {run.candidates.length === 0 ? (
        <Panel>
          <StateMessage
            icon={<Users size={22} aria-hidden />}
            title="No candidates matched this persona"
            description="The sources returned no records for these skills and role keywords. Broaden the must-have skills or try another description."
            action={newSearchButton}
          />
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Ranked candidates"
            description="Click a candidate to see the score breakdown, evidence and provenance."
            className="border-b-0 pb-0"
          />
          <CandidateFilters
            filters={filters}
            onChange={setFilters}
            skillOptions={[...run.persona.mustHaveSkills, ...run.persona.niceToHaveSkills]}
            locationOptions={locations}
            sourceOptions={sources}
            resultCount={filtered.length}
            totalCount={run.candidates.length}
          />
          <CandidateTable
            candidates={filtered}
            onOpen={setSelectedId}
            emptyText={
              <StateMessage
                icon={<SearchX size={22} aria-hidden />}
                title="No candidates match these filters"
                description="Loosen a filter to see more of the shortlist."
                action={
                  <Button size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Reset filters
                  </Button>
                }
              />
            }
          />
        </Panel>
      )}

      <CandidateDetailDrawer item={selected} persona={run.persona} onClose={() => setSelectedId(null)} />
    </>
  );
}

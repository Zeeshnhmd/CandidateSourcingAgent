import { Input, Segmented, Select, Switch } from 'antd';
import { Search } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../shared/components/ui/Button';
import { DEFAULT_FILTERS, hasActiveFilters, type CandidateFilterState, type MinimumTier } from './filterCandidates';
import { SourceIcon } from './SourceBadges';

interface CandidateFiltersProps {
  filters: CandidateFilterState;
  onChange: (filters: CandidateFilterState) => void;
  skillOptions: string[];
  locationOptions: { value: string; label: string }[];
  sourceOptions: string[];
  resultCount: number;
  totalCount: number;
}

const TIER_OPTIONS: { value: MinimumTier; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'partial', label: 'Partial+' },
  { value: 'good', label: 'Good+' },
  { value: 'strong', label: 'Strong' },
];

export function CandidateFilters({
  filters,
  onChange,
  skillOptions,
  locationOptions,
  sourceOptions,
  resultCount,
  totalCount,
}: CandidateFiltersProps) {
  const evidenceSwitchId = useId();
  const update = (patch: Partial<CandidateFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-3 border-b border-line-soft px-5 py-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          allowClear
          prefix={<Search size={15} className="text-dim" aria-hidden />}
          placeholder="Search name, title or skill"
          aria-label="Search candidates"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
          className="w-full sm:w-60"
        />
        <Segmented<MinimumTier>
          aria-label="Minimum match"
          options={TIER_OPTIONS}
          value={filters.minimumTier}
          onChange={(minimumTier) => update({ minimumTier })}
        />
        <Select
          mode="multiple"
          allowClear
          aria-label="Required skills"
          placeholder="Has skills"
          value={filters.requiredSkills}
          onChange={(requiredSkills) => update({ requiredSkills })}
          options={skillOptions.map((skill) => ({ value: skill, label: skill }))}
          maxTagCount="responsive"
          className="w-full sm:w-56"
        />
        <Select
          allowClear
          aria-label="Location"
          placeholder="Any location"
          value={filters.location}
          onChange={(location) => update({ location: location ?? null })}
          options={locationOptions}
          className="w-full sm:w-44"
        />
        {sourceOptions.length > 1 && (
          <Select
            allowClear
            aria-label="Source"
            placeholder="All sources"
            value={filters.source}
            onChange={(source) => update({ source: source ?? null })}
            options={sourceOptions.map((source) => ({
              value: source,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <SourceIcon source={source} />
                  {source}
                </span>
              ),
            }))}
            className="w-full sm:w-44"
          />
        )}
        <label htmlFor={evidenceSwitchId} className="flex cursor-pointer items-center gap-2 px-1 text-[13px] text-body">
          <Switch
            id={evidenceSwitchId}
            size="small"
            checked={filters.evidenceOnly}
            onChange={(evidenceOnly) => update({ evidenceOnly })}
          />
          With GitHub evidence
        </label>
      </div>
      <div className="flex min-h-7 items-center justify-between text-[13px] text-muted">
        <span role="status">
          Showing <span className="font-medium text-ink">{resultCount}</span> of {totalCount} candidates
        </span>
        {hasActiveFilters(filters) && (
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)}>
            Reset filters
          </Button>
        )}
      </div>
    </div>
  );
}

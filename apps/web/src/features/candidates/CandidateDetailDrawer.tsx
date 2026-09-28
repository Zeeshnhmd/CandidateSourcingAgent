import type { ReactNode } from 'react';
import { Drawer, Grid, Tooltip } from 'antd';
import {
  ArrowUpRight,
  Briefcase,
  Code2,
  Fingerprint,
  Gauge,
  Globe,
  GraduationCap,
  MapPin,
  Plane,
  Sparkles,
  Tags,
} from 'lucide-react';
import type { CandidatePersona, RankedCandidate } from '@csa/contracts';
import { Avatar } from '../../shared/components/ui/Avatar';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';
import { Pill } from '../../shared/components/ui/Pill';
import { ScoreRing } from '../../shared/components/ui/ScoreRing';
import { SkillTag, type SkillTagProps } from '../../shared/components/ui/SkillTag';
import { cn } from '../../shared/lib/cn';
import { formatMonthRange, formatYears } from '../../shared/lib/format';
import { isExperienceEstimated } from './CandidateTable';
import { EvidencePanel } from './EvidencePanel';
import { TIER_META, TierPill } from './MatchScore';
import { ProvenancePanel } from './ProvenancePanel';
import { ScoreBreakdown } from './ScoreBreakdown';

function Section({
  icon,
  title,
  aside,
  children,
}: {
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line-soft px-6 py-5 last:border-b-0">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-[13px] font-semibold text-ink">
          <span className="text-dim">{icon}</span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="m-0 text-[11.5px] text-muted">{label}</p>
      <p className="m-0 mt-0.5 text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}

function SkillGroup({
  label,
  skills,
  tone,
  sourcesFor,
}: {
  label: string;
  skills: string[];
  tone: SkillTagProps['tone'];
  sourcesFor: (skill: string) => string;
}) {
  if (!skills.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <Tooltip key={skill} title={sourcesFor(skill) ? `Source records: ${sourcesFor(skill)}` : undefined}>
            <span tabIndex={0} className="inline-flex rounded-md outline-none">
              <SkillTag tone={tone}>{skill}</SkillTag>
            </span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function SkillsSection({ item, persona }: { item: RankedCandidate; persona: CandidatePersona }) {
  const { matchedMustHave, missingMustHave, matchedNiceToHave } = item.skillMatch;
  const highlighted = new Set([...matchedMustHave, ...matchedNiceToHave].map((skill) => skill.toLowerCase()));
  const other = item.candidate.skills
    .filter((skill) => !highlighted.has(skill.name.toLowerCase()))
    .map((skill) => skill.name);
  const sourcesFor = (name: string) =>
    item.candidate.skills
      .find((skill) => skill.name.toLowerCase() === name.toLowerCase())
      ?.sourceRecordIds.join(', ') ?? '';

  return (
    <div className="space-y-3.5">
      <SkillGroup
        label={`Must-have matched · ${matchedMustHave.length} of ${persona.mustHaveSkills.length}`}
        skills={matchedMustHave}
        tone="matched"
        sourcesFor={sourcesFor}
      />
      <SkillGroup label="Must-have missing" skills={missingMustHave} tone="missing" sourcesFor={sourcesFor} />
      <SkillGroup label="Nice-to-have matched" skills={matchedNiceToHave} tone="nice" sourcesFor={sourcesFor} />
      <SkillGroup label="Other skills" skills={other} tone="neutral" sourcesFor={sourcesFor} />
      {(item.candidate.certifications.length > 0 || item.candidate.education.length > 0) && (
        <div className="grid gap-3 rounded-lg bg-canvas p-3.5 ring-1 ring-inset ring-line-soft sm:grid-cols-2">
          {item.candidate.education.length > 0 && (
            <div>
              <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-muted">
                <GraduationCap size={13} aria-hidden /> Education
              </p>
              {item.candidate.education.map((entry) => (
                <p key={`${entry.institution}-${entry.degree}`} className="m-0 mt-1 text-[13px] text-ink">
                  {entry.degree}
                  <span className="text-muted">
                    , {entry.institution}
                    {entry.endYear ? ` (${entry.endYear})` : ''}
                  </span>
                </p>
              ))}
            </div>
          )}
          {item.candidate.certifications.length > 0 && (
            <div>
              <p className="m-0 text-xs font-medium text-muted">Certifications</p>
              {item.candidate.certifications.map((certification) => (
                <p key={certification} className="m-0 mt-1 text-[13px] text-ink">
                  {certification}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExperienceSection({ item }: { item: RankedCandidate }) {
  if (!item.candidate.experience.length) {
    return (
      <p className="m-0 rounded-lg border border-dashed border-line px-4 py-4 text-[13px] leading-6 text-muted">
        {isExperienceEstimated(item)
          ? `This source has no employment history. Experience is estimated from public GitHub activity since ${item.candidate.publicActivitySince?.slice(0, 4) ?? ''}.`
          : 'No employment history is available for this candidate.'}
      </p>
    );
  }
  const relevant = new Set(item.relevantExperienceIndexes);
  return (
    <ol className="m-0 list-none space-y-0 p-0">
      {item.candidate.experience.map((position, index) => (
        <li key={`${position.company}-${position.startDate}`} className="relative flex gap-3.5 pb-5 last:pb-0">
          {index < item.candidate.experience.length - 1 && (
            <span aria-hidden className="absolute bottom-0 left-[5px] top-4 w-px bg-line" />
          )}
          <span
            aria-hidden
            className={cn(
              'relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface',
              relevant.has(index) ? 'bg-primary' : 'bg-line',
            )}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13.5px] font-medium text-ink">{position.title}</span>
              <span className="text-[13px] text-muted">at {position.company}</span>
              {relevant.has(index) && <Pill tone="primary">Relevant</Pill>}
            </div>
            <p className="m-0 mt-0.5 text-xs text-muted">{formatMonthRange(position.startDate, position.endDate)}</p>
            {position.summary && <p className="m-0 mt-1.5 text-[13px] leading-5 text-body">{position.summary}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface CandidateDetailDrawerProps {
  item: RankedCandidate | null;
  persona: CandidatePersona;
  onClose: () => void;
}

export function CandidateDetailDrawer({ item, persona, onClose }: CandidateDetailDrawerProps) {
  const screens = Grid.useBreakpoint();
  const candidate = item?.candidate;
  const githubProfile = item?.evidence.github?.mode === 'live' ? item.evidence.github.profileUrl : null;

  return (
    <Drawer
      open={item !== null}
      onClose={onClose}
      size={screens.md ? 760 : '100%'}
      destroyOnHidden
      styles={{ body: { padding: 0 }, header: { padding: '18px 24px' } }}
      title={
        candidate && (
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar name={candidate.fullName} src={candidate.avatarUrl} size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[16px] font-semibold text-ink">{candidate.fullName}</span>
                {githubProfile && (
                  <a
                    href={githubProfile}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open GitHub profile"
                    className="text-muted hover:text-ink"
                  >
                    <GitHubMark size={15} />
                  </a>
                )}
              </div>
              <p className="m-0 truncate text-[13px] font-normal text-muted">
                {candidate.currentTitle}
                {candidate.currentCompany ? ` at ${candidate.currentCompany}` : ''}
              </p>
            </div>
          </div>
        )
      }
      extra={
        item && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="m-0 text-[11.5px] text-muted">Rank #{item.rank}</p>
              <TierPill tier={item.score.tier} />
            </div>
            <ScoreRing
              value={item.score.total}
              color={TIER_META[item.score.tier].color}
              size={56}
              label={`Match score ${item.score.total} out of 100`}
            />
          </div>
        )
      }
    >
      {item && candidate && (
        <div>
          <Section
            icon={<Sparkles size={15} aria-hidden />}
            title="Summary"
            aside={
              item.explanation.generatedBy === 'openai' ? (
                <Pill tone="primary">AI written</Pill>
              ) : (
                <Pill tone="neutral">From score breakdown</Pill>
              )
            }
          >
            <p className="m-0 rounded-lg bg-primary-soft/60 px-4 py-3.5 text-[14px] leading-6 text-ink ring-1 ring-inset ring-primary-line/50">
              {item.explanation.text}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Fact
                label="Location"
                value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} className="text-dim" aria-hidden />
                    {candidate.location.label}
                  </span>
                }
              />
              <Fact
                label="Experience"
                value={`${formatYears(candidate.totalYearsExperience)}${isExperienceEstimated(item) ? ' (est.)' : ''}`}
              />
              <Fact label="Relevant" value={formatYears(item.relevantYears)} />
              <Fact
                label="Mobility"
                value={
                  candidate.openToRemote || candidate.openToRelocation ? (
                    <span className="inline-flex flex-wrap gap-2">
                      {candidate.openToRemote && (
                        <span className="inline-flex items-center gap-1">
                          <Globe size={13} className="text-dim" aria-hidden /> Remote
                        </span>
                      )}
                      {candidate.openToRelocation && (
                        <span className="inline-flex items-center gap-1">
                          <Plane size={13} className="text-dim" aria-hidden /> Relocate
                        </span>
                      )}
                    </span>
                  ) : (
                    'Not stated'
                  )
                }
              />
            </div>
          </Section>

          <Section icon={<Gauge size={15} aria-hidden />} title="Score breakdown">
            <ScoreBreakdown score={item.score} />
          </Section>

          <Section icon={<Tags size={15} aria-hidden />} title="Skills">
            <SkillsSection item={item} persona={persona} />
          </Section>

          <Section
            icon={<Briefcase size={15} aria-hidden />}
            title="Experience"
            aside={<span className="text-xs text-muted">{formatYears(item.relevantYears)} relevant</span>}
          >
            <ExperienceSection item={item} />
          </Section>

          <Section
            icon={<Code2 size={15} aria-hidden />}
            title="GitHub evidence"
            aside={
              githubProfile && (
                <a
                  href={githubProfile}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary-hover"
                >
                  View profile <ArrowUpRight size={13} aria-hidden />
                </a>
              )
            }
          >
            <EvidencePanel evidence={item.evidence} />
          </Section>

          <Section icon={<Fingerprint size={15} aria-hidden />} title="Source provenance">
            <ProvenancePanel candidate={candidate} />
          </Section>
        </div>
      )}
    </Drawer>
  );
}

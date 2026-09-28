import { ArrowUpRight, Star, TriangleAlert } from 'lucide-react';
import type { CandidateEvidence } from '@csa/contracts';
import { GitHubMark } from '../../shared/components/ui/GitHubMark';
import { Pill } from '../../shared/components/ui/Pill';
import { SkillTag } from '../../shared/components/ui/SkillTag';
import { formatDate } from '../../shared/lib/format';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line-soft bg-canvas px-3 py-2.5">
      <p className="m-0 text-lg font-semibold tabular-nums text-ink">{value.toLocaleString('en')}</p>
      <p className="m-0 text-xs text-muted">{label}</p>
    </div>
  );
}

function Quiet({ children }: { children: string }) {
  return (
    <p className="m-0 rounded-lg border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">
      {children}
    </p>
  );
}

export function EvidencePanel({ evidence }: { evidence: CandidateEvidence }) {
  if (evidence.status === 'not-applicable') return <Quiet>Public code evidence is not scored for this role.</Quiet>;
  if (evidence.status === 'unavailable') {
    return (
      <div className="flex items-start gap-2.5 rounded-lg bg-warning-soft px-3.5 py-3 text-[13px] text-warning ring-1 ring-inset ring-warning/20">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">GitHub evidence could not be retrieved.</span> {evidence.note}
        </span>
      </div>
    );
  }
  const github = evidence.github;
  if (evidence.status === 'not-found' || !github)
    return <Quiet>{evidence.note ?? 'No public GitHub profile is linked to this candidate.'}</Quiet>;

  const isLive = github.mode === 'live';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitHubMark size={16} className="text-ink" />
          {github.profileUrl ? (
            <a
              href={github.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-sm font-medium text-ink hover:text-primary"
            >
              {github.username}
              <ArrowUpRight size={14} aria-hidden />
            </a>
          ) : (
            <span className="text-sm font-medium text-ink">{github.username}</span>
          )}
          {isLive ? (
            <Pill tone="success" dot pulse>
              Live
            </Pill>
          ) : (
            <Pill tone="neutral">Sample data</Pill>
          )}
        </div>
        <span className="text-xs text-muted">Retrieved {formatDate(github.retrievedAt)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Public repos" value={github.publicRepos} />
        <Stat label="Active, 90 days" value={github.recentlyActiveRepos} />
        <Stat label="Stars" value={github.totalStars} />
        <Stat label="Followers" value={github.followers} />
      </div>

      {evidence.corroboratedSkills.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Corroborates persona skills</p>
          <div className="flex flex-wrap gap-1">
            {evidence.corroboratedSkills.map((skill) => (
              <SkillTag key={skill} tone="matched">
                {skill}
              </SkillTag>
            ))}
          </div>
        </div>
      )}

      {github.topLanguages.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Top languages</p>
          <div className="flex flex-wrap gap-1">
            {github.topLanguages.map((language) => (
              <SkillTag key={language.name} count={language.repoCount}>
                {language.name}
              </SkillTag>
            ))}
          </div>
        </div>
      )}

      {github.notableRepos.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Notable repositories</p>
          <ul className="m-0 list-none space-y-2 p-0">
            {github.notableRepos.map((repo) => (
              <li key={repo.name} className="rounded-lg border border-line-soft p-3">
                <div className="flex items-center justify-between gap-2">
                  {repo.url ? (
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[13px] font-medium text-ink hover:text-primary"
                    >
                      {repo.name}
                    </a>
                  ) : (
                    <span className="truncate text-[13px] font-medium text-ink">{repo.name}</span>
                  )}
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted">
                    <Star size={12} aria-hidden /> {repo.stars.toLocaleString('en')}
                  </span>
                </div>
                {repo.description && (
                  <p className="m-0 mt-1 line-clamp-2 text-[13px] leading-5 text-muted">{repo.description}</p>
                )}
                {(repo.language || repo.topics.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {repo.language && <SkillTag>{repo.language}</SkillTag>}
                    {repo.topics.slice(0, 4).map((topic) => (
                      <SkillTag key={topic} tone="subtle">
                        {topic}
                      </SkillTag>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

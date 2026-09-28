import { describe, expect, it, vi } from 'vitest';
import type { GitHubEvidence } from '@csa/contracts';
import { createFallbackAiAdapter } from '../../adapters/ai/fallback/fallbackAiAdapter';
import type { AiAdapter } from '../../adapters/ai/types';
import type {
  DiscoveryAdapter,
  EnrichmentAdapter,
  LiveGitHubEvidenceAdapter,
  MockGitHubEvidenceAdapter,
} from '../../adapters/types';
import { UpstreamError } from '../../shared/fetchJson';
import { HttpError } from '../../shared/httpError';
import { NOW, persona, sourceRecord, sourceRef } from '../../test/fixtures/builders';
import { createAiService } from '../ai/aiService';
import { createEvidenceService } from '../evidence/evidenceService';
import { createMemoryRunStore } from './runStore';
import { planSourcing } from './sourcePlanner';
import { createSourcingService } from './sourcingService';

const records = [
  sourceRecord('mt-1', {
    fullName: 'Asha Verma',
    skills: ['React', 'TypeScript', 'GraphQL', 'Jest'],
    currentTitle: 'Senior Frontend Engineer',
    experience: [
      {
        title: 'Senior Frontend Engineer',
        company: 'Acme',
        startDate: '2018-01',
        endDate: null,
        summary: '',
        skills: ['React'],
      },
    ],
  }),
  sourceRecord('mt-2', { fullName: 'Asha Verma', email: 'mt-1@example.test', updatedAt: '2024-01-01T00:00:00Z' }),
  sourceRecord('mt-3', {
    fullName: 'Ben Ode',
    email: null,
    profileUrl: null,
    currentCompany: 'Other',
    skills: ['Java'],
  }),
];

const mockEvidence: GitHubEvidence = {
  mode: 'mock',
  username: 'mock-asha',
  profileUrl: null,
  publicRepos: 10,
  followers: 5,
  totalStars: 120,
  recentlyActiveRepos: 2,
  topLanguages: [{ name: 'TypeScript', repoCount: 6 }],
  notableRepos: [
    {
      name: 'graphql-kit',
      description: 'React GraphQL helpers',
      language: 'TypeScript',
      stars: 120,
      pushedAt: '',
      topics: ['react'],
      url: null,
    },
  ],
  retrievedAt: NOW.toISOString(),
};

function setup(
  options: {
    discovery?: Partial<DiscoveryAdapter>;
    extraDiscovery?: DiscoveryAdapter[];
    ai?: AiAdapter;
    live?: LiveGitHubEvidenceAdapter['collect'];
  } = {},
) {
  const discovery: DiscoveryAdapter = {
    info: { id: 'mock-talent', name: 'Mock Talent Network', capabilities: ['DISCOVER'], isMock: true },
    discover: () => Promise.resolve(records),
    checkHealth: () => Promise.resolve(),
    ...options.discovery,
  };
  const enrichment: EnrichmentAdapter = {
    info: { id: 'mock-talent', name: 'Mock Talent Network', capabilities: ['ENRICH'], isMock: true },
    enrich: () =>
      Promise.resolve([
        {
          source: sourceRef('enr-1', { capability: 'ENRICH' }),
          subjectExternalId: 'mt-2',
          skills: ['Storybook'],
          certifications: [],
          education: [],
        },
      ]),
  };
  const mock: MockGitHubEvidenceAdapter = {
    info: { id: 'github-mock', name: 'GitHub (mock)', capabilities: ['EVIDENCE'], isMock: true },
    collect: () => Promise.resolve(new Map([['mt-1', mockEvidence]])),
  };
  const live: LiveGitHubEvidenceAdapter = {
    info: { id: 'github', name: 'GitHub', capabilities: ['EVIDENCE'], isMock: false },
    collect: options.live ?? (() => Promise.resolve(null)),
    checkRateLimit: () =>
      Promise.resolve({ authenticated: false, limit: 60, remaining: 60, resetAt: NOW.toISOString() }),
  };
  const fallback = createFallbackAiAdapter();
  const ai = createAiService(options.ai ?? fallback, fallback);
  return createSourcingService({
    registry: {
      discovery: [discovery, ...(options.extraDiscovery ?? [])],
      enrichment: [enrichment],
      evidence: live.info,
      ai: ai.primary.info,
    },
    evidence: createEvidenceService({ live, mock, profileMap: new Map([['mt-3', 'real-user']]) }),
    ai,
    runs: createMemoryRunStore(),
    now: () => NOW,
  });
}

describe('sourcing service', () => {
  it('runs the full pipeline with deduplication, enrichment, evidence and ranking', async () => {
    const sourcing = setup();
    const run = await sourcing.start(persona());

    expect(run.stats).toMatchObject({
      discoveredRecords: 3,
      duplicatesMerged: 1,
      uniqueCandidates: 2,
      enrichedCandidates: 1,
      mockEvidence: 1,
    });
    expect(run.plan.map((step) => [step.stage, step.status])).toEqual([
      ['discover', 'completed'],
      ['resolve', 'completed'],
      ['enrich', 'completed'],
      ['evidence', 'completed'],
      ['embed', 'completed'],
      ['score', 'completed'],
      ['explain', 'completed'],
    ]);

    const [top] = run.candidates;
    expect(top?.candidate.fullName).toBe('Asha Verma');
    expect(top?.rank).toBe(1);
    expect(top?.candidate.skills.find((skill) => skill.name === 'Storybook')?.sourceRecordIds).toEqual(['enr-1']);
    expect(top?.evidence.corroboratedSkills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'GraphQL']));
    expect(top?.explanation.text).toContain('must-have skills');
    expect(sourcing.get(run.id)).toBe(run);
  });

  it('uses live GitHub only for explicitly mapped records and survives lookup failures', async () => {
    const live = vi.fn(() => Promise.reject(new UpstreamError('GitHub', 403, 'GitHub rate limit reached')));
    const run = await setup({ live }).start(persona());

    expect(live).toHaveBeenCalledWith('real-user');
    const ben = run.candidates.find((item) => item.candidate.id === 'mt-3');
    expect(ben?.evidence).toMatchObject({ status: 'unavailable', note: 'GitHub rate limit reached' });
    expect(ben?.score.components.find((item) => item.key === 'technicalEvidence')?.applicable).toBe(false);
    expect(run.plan.find((step) => step.stage === 'evidence')?.status).toBe('partial');
    expect(run.warnings).toHaveLength(1);
  });

  it('falls back to the deterministic adapter when the AI provider fails', async () => {
    const failing: AiAdapter = {
      ...createFallbackAiAdapter(),
      info: { id: 'openai', name: 'OpenAI test', capabilities: ['ANALYZE', 'EMBEDDING'], isMock: false },
      provider: 'openai',
      embed: () => Promise.reject(new Error('timeout')),
      explainMatches: () => Promise.reject(new Error('timeout')),
    };
    const run = await setup({ ai: failing }).start(persona());

    expect(run.plan.find((step) => step.stage === 'embed')?.status).toBe('partial');
    expect(run.candidates.every((item) => item.explanation.generatedBy === 'fallback')).toBe(true);
    expect(run.warnings.some((warning) => warning.includes('OpenAI test'))).toBe(true);
  });

  it('returns an empty run when nothing is discovered', async () => {
    const run = await setup({ discovery: { discover: () => Promise.resolve([]) } }).start(persona());
    expect(run.candidates).toEqual([]);
    expect(run.plan.slice(1).every((step) => step.status === 'skipped')).toBe(true);
  });

  it('fails the run with a clear error when every talent source is down', async () => {
    const sourcing = setup({
      discovery: { discover: () => Promise.reject(new UpstreamError('Mock Talent Network', null, 'down')) },
    });
    await expect(sourcing.start(persona())).rejects.toBeInstanceOf(HttpError);
  });
});

describe('multi-source discovery', () => {
  const githubSource = (discover: DiscoveryAdapter['discover']): DiscoveryAdapter => ({
    info: { id: 'github', name: 'GitHub', capabilities: ['DISCOVER'], isMock: false, technicalRolesOnly: true },
    discover,
    checkHealth: () => Promise.resolve(),
  });

  it('keeps ranking when one source fails and records a warning', async () => {
    const run = await setup({
      extraDiscovery: [githubSource(() => Promise.reject(new Error('GitHub rate limit reached.')))],
    }).start(persona());

    expect(run.candidates.length).toBeGreaterThan(0);
    expect(run.plan.find((step) => step.stage === 'discover' && step.providerId === 'github')?.status).toBe('failed');
    expect(run.warnings[0]).toMatch(/^GitHub search failed: GitHub rate limit reached\./);
  });

  it('skips technical-only sources for non-technical roles', async () => {
    const discover = vi.fn<DiscoveryAdapter['discover']>(() => Promise.resolve([]));
    const run = await setup({ extraDiscovery: [githubSource(discover)] }).start(persona({ isTechnicalRole: false }));

    expect(discover).not.toHaveBeenCalled();
    expect(run.plan.find((step) => step.stage === 'discover' && step.providerId === 'github')).toMatchObject({
      status: 'skipped',
      detail: 'GitHub is only searched for technical roles',
    });
  });

  it('lists and deletes saved runs as summaries', async () => {
    const sourcing = setup();
    const run = await sourcing.start(persona());
    expect(sourcing.list()).toEqual([
      expect.objectContaining({ id: run.id, roleTitle: 'Senior Frontend Engineer', candidateCount: 2 }),
    ]);
    expect(sourcing.delete(run.id)).toBe(true);
    expect(sourcing.list()).toEqual([]);
  });
});

describe('planSourcing', () => {
  const registry = {
    discovery: [],
    enrichment: [],
    evidence: { id: 'github', name: 'GitHub', capabilities: ['EVIDENCE'] as const, isMock: false },
    ai: { id: 'fallback-ai', name: 'Fallback', capabilities: ['ANALYZE'] as const, isMock: false },
  };

  it('builds discovery keywords from skills and role discipline', () => {
    const plan = planSourcing(persona(), registry);
    expect(plan.query.keywords).toEqual(['React', 'TypeScript', 'GraphQL', 'Jest', 'Next.js', 'Storybook', 'frontend']);
  });

  it('skips technical evidence for non-technical roles', () => {
    const plan = planSourcing(persona({ isTechnicalRole: false }), registry);
    expect(plan.steps.find((step) => step.stage === 'evidence')?.skipReason).toMatch(/Not a technical role/);
  });
});

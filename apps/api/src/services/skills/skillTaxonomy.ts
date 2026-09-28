type SkillCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'data'
  | 'ai'
  | 'cloud'
  | 'mobile'
  | 'testing'
  | 'design'
  | 'product'
  | 'leadership';

interface SkillDefinition {
  name: string;
  category: SkillCategory;
  aliases?: string[];
  /** Match only with this exact casing in free text, for names that are also common English words. */
  caseSensitiveInText?: boolean;
}

const SKILLS: SkillDefinition[] = [
  { name: 'JavaScript', category: 'language', aliases: ['js', 'ecmascript', 'es6'] },
  { name: 'TypeScript', category: 'language', aliases: ['ts'] },
  { name: 'Python', category: 'language', aliases: ['jupyter notebook'] },
  { name: 'Java', category: 'language' },
  { name: 'Go', category: 'language', aliases: ['golang'], caseSensitiveInText: true },
  { name: 'Kotlin', category: 'language' },
  { name: 'Swift', category: 'language', caseSensitiveInText: true },
  { name: 'Dart', category: 'language', caseSensitiveInText: true },
  { name: 'Rust', category: 'language', caseSensitiveInText: true },
  { name: 'C#', category: 'language', aliases: ['csharp'] },
  { name: 'C++', category: 'language', aliases: ['cpp'] },
  { name: 'Ruby', category: 'language', caseSensitiveInText: true },
  { name: 'PHP', category: 'language' },
  { name: 'Scala', category: 'language' },
  { name: 'Objective-C', category: 'language', aliases: ['objc'] },
  { name: 'SQL', category: 'data' },
  { name: 'HTML', category: 'frontend', aliases: ['html5'] },
  { name: 'CSS', category: 'frontend', aliases: ['css3'] },
  { name: 'SCSS', category: 'frontend', aliases: ['sass'] },
  { name: 'Shell', category: 'cloud', aliases: ['bash', 'shell scripting'] },
  { name: 'React', category: 'frontend', aliases: ['react.js', 'reactjs'], caseSensitiveInText: true },
  { name: 'Next.js', category: 'frontend', aliases: ['nextjs'] },
  { name: 'Vue.js', category: 'frontend', aliases: ['vue', 'vuejs'] },
  { name: 'Nuxt', category: 'frontend', aliases: ['nuxt.js', 'nuxtjs'] },
  { name: 'Angular', category: 'frontend', aliases: ['angularjs'] },
  { name: 'Svelte', category: 'frontend', aliases: ['sveltekit'] },
  { name: 'Redux', category: 'frontend', aliases: ['redux toolkit'] },
  { name: 'RxJS', category: 'frontend' },
  { name: 'NgRx', category: 'frontend' },
  { name: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind', 'tailwindcss'] },
  { name: 'Webpack', category: 'frontend' },
  { name: 'Vite', category: 'frontend' },
  { name: 'Storybook', category: 'frontend' },
  { name: 'Design Systems', category: 'design', aliases: ['design system', 'component library'] },
  { name: 'Accessibility', category: 'design', aliases: ['a11y', 'wcag', 'web accessibility'] },
  { name: 'Web Performance', category: 'frontend', aliases: ['core web vitals', 'performance optimization'] },
  { name: 'React Query', category: 'frontend', aliases: ['tanstack query'] },
  { name: 'GraphQL', category: 'backend' },
  { name: 'Apollo', category: 'backend', aliases: ['apollo client', 'apollo graphql'] },
  { name: 'Micro-frontends', category: 'frontend', aliases: ['microfrontends', 'micro frontends'] },
  { name: 'Node.js', category: 'backend', aliases: ['node', 'nodejs'] },
  { name: 'Express', category: 'backend', aliases: ['express.js', 'expressjs'], caseSensitiveInText: true },
  { name: 'NestJS', category: 'backend', aliases: ['nest.js'] },
  { name: 'Spring Boot', category: 'backend', aliases: ['spring'], caseSensitiveInText: true },
  { name: 'Django', category: 'backend' },
  { name: 'FastAPI', category: 'backend' },
  { name: 'Flask', category: 'backend', caseSensitiveInText: true },
  { name: 'Ruby on Rails', category: 'backend', aliases: ['Rails'], caseSensitiveInText: true },
  { name: '.NET', category: 'backend', aliases: ['dotnet', 'asp.net'] },
  { name: 'gRPC', category: 'backend' },
  {
    name: 'REST APIs',
    category: 'backend',
    aliases: ['REST', 'REST API', 'RESTful', 'RESTful APIs'],
    caseSensitiveInText: true,
  },
  { name: 'Microservices', category: 'backend', aliases: ['microservice', 'microservice architecture'] },
  { name: 'Kafka', category: 'backend', aliases: ['apache kafka'] },
  { name: 'RabbitMQ', category: 'backend' },
  { name: 'Celery', category: 'backend' },
  { name: 'Redis', category: 'backend' },
  { name: 'PostgreSQL', category: 'data', aliases: ['postgres'] },
  { name: 'MySQL', category: 'data' },
  { name: 'MongoDB', category: 'data', aliases: ['mongo'] },
  { name: 'Oracle', category: 'data', caseSensitiveInText: true },
  { name: 'Elasticsearch', category: 'data', aliases: ['elastic search', 'opensearch'] },
  { name: 'Snowflake', category: 'data', caseSensitiveInText: true },
  { name: 'dbt', category: 'data', caseSensitiveInText: true },
  { name: 'Airflow', category: 'data', aliases: ['apache airflow'] },
  { name: 'Spark', category: 'data', aliases: ['apache spark', 'pyspark'], caseSensitiveInText: true },
  { name: 'Pandas', category: 'data' },
  { name: 'Looker', category: 'data' },
  { name: 'Machine Learning', category: 'ai', aliases: ['ml'] },
  { name: 'PyTorch', category: 'ai' },
  { name: 'TensorFlow', category: 'ai' },
  { name: 'scikit-learn', category: 'ai', aliases: ['sklearn'] },
  { name: 'LLM', category: 'ai', aliases: ['llms', 'large language models', 'generative ai', 'genai'] },
  { name: 'MLOps', category: 'ai' },
  { name: 'Computer Vision', category: 'ai' },
  { name: 'NLP', category: 'ai', aliases: ['natural language processing'] },
  { name: 'Statistics', category: 'ai' },
  { name: 'AWS', category: 'cloud', aliases: ['amazon web services'] },
  { name: 'Azure', category: 'cloud', aliases: ['microsoft azure'] },
  { name: 'GCP', category: 'cloud', aliases: ['google cloud', 'google cloud platform'] },
  { name: 'Docker', category: 'cloud', aliases: ['dockerfile'] },
  { name: 'Kubernetes', category: 'cloud', aliases: ['k8s', 'eks', 'gke', 'aks'] },
  { name: 'Terraform', category: 'cloud', aliases: ['hcl'] },
  { name: 'Ansible', category: 'cloud' },
  { name: 'CI/CD', category: 'cloud', aliases: ['ci cd', 'continuous integration', 'continuous delivery'] },
  { name: 'GitHub Actions', category: 'cloud' },
  { name: 'Linux', category: 'cloud' },
  { name: 'Prometheus', category: 'cloud' },
  { name: 'Grafana', category: 'cloud' },
  { name: 'PowerShell', category: 'cloud' },
  { name: 'React Native', category: 'mobile', aliases: ['react-native'] },
  { name: 'Flutter', category: 'mobile', caseSensitiveInText: true },
  { name: 'iOS', category: 'mobile' },
  { name: 'Android', category: 'mobile' },
  { name: 'SwiftUI', category: 'mobile' },
  { name: 'Jest', category: 'testing' },
  { name: 'Vitest', category: 'testing' },
  { name: 'Cypress', category: 'testing' },
  { name: 'Playwright', category: 'testing' },
  { name: 'Selenium', category: 'testing' },
  { name: 'Testing Library', category: 'testing', aliases: ['react testing library'] },
  { name: 'Figma', category: 'design' },
  { name: 'User Research', category: 'design', aliases: ['ux research'] },
  { name: 'Prototyping', category: 'design' },
  { name: 'Usability Testing', category: 'design' },
  { name: 'Product Strategy', category: 'product' },
  { name: 'Roadmapping', category: 'product', aliases: ['product roadmap', 'roadmaps'] },
  { name: 'Agile', category: 'product', aliases: ['scrum', 'kanban'] },
  { name: 'Team Leadership', category: 'leadership', aliases: ['people management', 'engineering management'] },
];

const NON_TECHNICAL_CATEGORIES = new Set<SkillCategory>(['design', 'product', 'leadership']);

/** Lookup key that ignores case, whitespace, dots, underscores and hyphens. */
export function skillKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s._-]+/g, '');
}

const byKey = new Map<string, SkillDefinition>();
for (const skill of SKILLS) {
  for (const label of [skill.name, ...(skill.aliases ?? [])]) byKey.set(skillKey(label), skill);
}

export function canonicalSkill(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  return byKey.get(skillKey(cleaned))?.name ?? cleaned;
}

export function canonicalSkills(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    const name = canonicalSkill(value);
    const key = skillKey(name);
    if (name && !seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  }
  return result;
}

export function isTechnicalSkill(name: string): boolean {
  const skill = byKey.get(skillKey(name));
  return skill !== undefined && !NON_TECHNICAL_CATEGORIES.has(skill.category);
}

export function isKnownSkill(name: string): boolean {
  return byKey.has(skillKey(name));
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const textPatterns = SKILLS.flatMap((skill) =>
  [skill.name, ...(skill.aliases ?? [])]
    .filter((label) => label.length > 1 || skill.caseSensitiveInText)
    .map((label) => ({
      skill: skill.name,
      pattern: new RegExp(
        `(?<![\\w+#.])${escapeRegExp(label)}(?![\\w+#]|\\.\\w)`,
        skill.caseSensitiveInText ? 'g' : 'gi',
      ),
    })),
);

/**
 * Finds known skills mentioned in free text, ordered by first appearance.
 * Longer matches win over overlapping shorter ones, so "React Native" does not also yield "React".
 */
export function findSkillsInText(text: string): string[] {
  const matches: { skill: string; start: number; end: number }[] = [];
  for (const { skill, pattern } of textPatterns) {
    for (const match of text.matchAll(pattern)) {
      matches.push({ skill, start: match.index, end: match.index + match[0].length });
    }
  }

  matches.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const accepted: typeof matches = [];
  for (const match of matches) {
    if (!accepted.some((other) => match.start < other.end && other.start < match.end)) accepted.push(match);
  }

  accepted.sort((a, b) => a.start - b.start);
  return canonicalSkills(accepted.map((match) => match.skill));
}

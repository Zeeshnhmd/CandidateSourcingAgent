import { describe, expect, it } from 'vitest';
import { DATA_ENGINEER_JD, FRONTEND_JD, PRODUCT_DESIGNER_JD } from '../../../test/fixtures/jobDescriptions';
import { parseJobDescription } from './heuristicJobParser';

describe('parseJobDescription', () => {
  it('extracts a structured persona from a sectioned JD', () => {
    const persona = parseJobDescription(FRONTEND_JD);

    expect(persona.roleTitle).toBe('Senior Frontend Engineer');
    expect(persona.seniority).toBe('senior');
    expect(persona.minYearsExperience).toBe(5);
    expect(persona.mustHaveSkills).toEqual(['React', 'TypeScript', 'GraphQL', 'Jest']);
    expect(persona.niceToHaveSkills).toEqual(expect.arrayContaining(['Next.js', 'Accessibility', 'Storybook']));
    expect(persona.location).toBe('Bengaluru, India');
    expect(persona.workMode).toBe('hybrid');
    expect(persona.isTechnicalRole).toBe(true);
  });

  it('ignores skills mentioned only in company context sections', () => {
    const persona = parseJobDescription(FRONTEND_JD);
    expect([...persona.mustHaveSkills, ...persona.niceToHaveSkills]).not.toContain('AWS');
  });

  it('reads experience ranges, remote work and inline nice-to-have phrases', () => {
    const persona = parseJobDescription(DATA_ENGINEER_JD);

    expect(persona.roleTitle).toBe('Data Engineer');
    expect(persona.minYearsExperience).toBe(3);
    expect(persona.maxYearsExperience).toBe(6);
    expect(persona.workMode).toBe('remote');
    expect(persona.mustHaveSkills).toEqual(['Python', 'SQL', 'Airflow', 'Snowflake']);
    expect(persona.niceToHaveSkills).toEqual(['dbt', 'Kafka']);
  });

  it('recognises non-technical roles so code evidence is not scored', () => {
    const persona = parseJobDescription(PRODUCT_DESIGNER_JD);

    expect(persona.roleTitle).toBe('Senior Product Designer');
    expect(persona.isTechnicalRole).toBe(false);
    expect(persona.location).toBe('Dubai');
    expect(persona.mustHaveSkills).toEqual(['Figma', 'User Research', 'Prototyping']);
  });

  it('is deterministic', () => {
    expect(parseJobDescription(FRONTEND_JD)).toEqual(parseJobDescription(FRONTEND_JD));
  });
});

describe('parseJobDescription with unstructured text', () => {
  it('classifies nice-to-have phrases per sentence', () => {
    const persona = parseJobDescription(
      'Job Title: Data Engineer\nWe need 3+ years building pipelines in Python and SQL on Airflow. dbt is a plus.',
    );
    expect(persona.mustHaveSkills).toEqual(['Python', 'SQL', 'Airflow']);
    expect(persona.niceToHaveSkills).toEqual(['dbt']);
  });
});

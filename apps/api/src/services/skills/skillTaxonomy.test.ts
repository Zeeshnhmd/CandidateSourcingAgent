import { describe, expect, it } from 'vitest';
import { canonicalSkill, canonicalSkills, findSkillsInText } from './skillTaxonomy';

describe('skill taxonomy', () => {
  it('maps aliases and casing to canonical names', () => {
    expect(canonicalSkill('reactjs')).toBe('React');
    expect(canonicalSkill('NodeJS')).toBe('Node.js');
    expect(canonicalSkill('postgres')).toBe('PostgreSQL');
    expect(canonicalSkill('  Some  Niche Tool ')).toBe('Some Niche Tool');
  });

  it('deduplicates by canonical name, keeping first occurrence order', () => {
    expect(canonicalSkills(['Tailwind', 'React', 'tailwindcss', 'react.js'])).toEqual(['Tailwind CSS', 'React']);
  });

  it('prefers the longest overlapping match in free text', () => {
    expect(findSkillsInText('Built apps in React Native and Next.js')).toEqual(['React Native', 'Next.js']);
  });

  it('avoids common-word false positives for ambiguous skills', () => {
    expect(findSkillsInText('You will go the extra mile with the rest of the team')).toEqual([]);
    expect(findSkillsInText('Services in Go exposing REST APIs')).toEqual(['Go', 'REST APIs']);
  });

  it('does not match skills inside other words', () => {
    expect(findSkillsInText('Strong HTML and JavaScript')).toEqual(['HTML', 'JavaScript']);
  });
});

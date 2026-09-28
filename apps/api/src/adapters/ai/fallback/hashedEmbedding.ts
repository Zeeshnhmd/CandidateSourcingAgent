import { findSkillsInText, skillKey } from '../../../services/skills/skillTaxonomy';

const DIMENSIONS = 512;
const SKILL_WEIGHT = 3;
const STOP_WORDS = new Set(
  'a an and are as at be by for from has have in is it of on or our the their this to we with you your will who work team role years experience'.split(
    ' ',
  ),
);

function hash(token: string): number {
  let value = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    value ^= token.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) % DIMENSIONS;
}

/**
 * Deterministic feature-hashed bag of words with boosted canonical skills.
 * A lexical stand-in for real embeddings so semantic relevance still works offline.
 */
export function hashedEmbedding(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  const add = (token: string, weight: number) => {
    const slot = hash(token);
    vector[slot] = (vector[slot] ?? 0) + weight;
  };

  for (const token of text.toLowerCase().split(/[^a-z0-9+#]+/)) {
    if (token.length > 1 && !STOP_WORDS.has(token)) add(token, 1);
  }
  for (const skill of findSkillsInText(text)) add(`skill:${skillKey(skill)}`, SKILL_WEIGHT);

  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((value) => value / norm);
}

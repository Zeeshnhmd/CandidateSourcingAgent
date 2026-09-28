import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SourcingRun } from '@csa/contracts';
import { createFileRunStore } from './runStore';

const run = (id: string, createdAt: string) => ({ id, createdAt, candidates: [] }) as unknown as SourcingRun;
const directories: string[] = [];
const tempFile = () => {
  const directory = mkdtempSync(join(tmpdir(), 'csa-runs-'));
  directories.push(directory);
  return join(directory, 'nested', 'runs.json');
};

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('createFileRunStore', () => {
  it('persists runs across store instances, newest first, and supports delete', () => {
    const file = tempFile();
    const store = createFileRunStore(file);
    store.save(run('old', '2026-01-01T00:00:00Z'));
    store.save(run('new', '2026-02-01T00:00:00Z'));

    const reopened = createFileRunStore(file);
    expect(reopened.list().map((item) => item.id)).toEqual(['new', 'old']);
    expect(reopened.delete('old')).toBe(true);
    expect(reopened.delete('missing')).toBe(false);
    expect(
      createFileRunStore(file)
        .list()
        .map((item) => item.id),
    ).toEqual(['new']);
  });

  it('caps the number of stored runs and tolerates a corrupt file', () => {
    const file = tempFile();
    const store = createFileRunStore(file, 2);
    for (const id of ['a', 'b', 'c']) store.save(run(id, `2026-01-0${id === 'a' ? 1 : id === 'b' ? 2 : 3}T00:00:00Z`));
    expect(JSON.parse(readFileSync(file, 'utf8'))).toHaveLength(2);
  });
});

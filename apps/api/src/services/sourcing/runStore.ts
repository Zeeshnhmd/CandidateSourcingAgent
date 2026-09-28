import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SourcingRun } from '@csa/contracts';
import { isRecord, isString } from '../../shared/guards';

export interface RunStore {
  save(run: SourcingRun): void;
  get(runId: string): SourcingRun | null;
  /** Newest first. */
  list(): SourcingRun[];
  delete(runId: string): boolean;
}

function isStoredRun(value: unknown): value is SourcingRun {
  return isRecord(value) && isString(value.id) && isString(value.createdAt) && Array.isArray(value.candidates);
}

function createStore(initial: SourcingRun[], maxRuns: number, persist: (runs: SourcingRun[]) => void): RunStore {
  let runs = [...initial].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, maxRuns);
  return {
    save(run) {
      runs = [run, ...runs.filter((item) => item.id !== run.id)].slice(0, maxRuns);
      persist(runs);
    },
    get: (runId) => runs.find((run) => run.id === runId) ?? null,
    list: () => runs,
    delete(runId) {
      const next = runs.filter((run) => run.id !== runId);
      if (next.length === runs.length) return false;
      runs = next;
      persist(runs);
      return true;
    },
  };
}

export function createMemoryRunStore(maxRuns = 50): RunStore {
  return createStore([], maxRuns, () => undefined);
}

/**
 * Saves runs as JSON on local disk so saved searches survive API restarts.
 * Writes go to a temporary file first and are then renamed, so a crash never leaves a half-written file.
 */
export function createFileRunStore(filePath: string, maxRuns = 50): RunStore {
  let initial: SourcingRun[] = [];
  if (existsSync(filePath)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      initial = Array.isArray(parsed) ? parsed.filter(isStoredRun) : [];
    } catch (error) {
      console.warn(
        `[runs] Could not read ${filePath}, starting with no saved searches:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return createStore(initial, maxRuns, (runs) => {
    mkdirSync(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    writeFileSync(temporary, JSON.stringify(runs));
    renameSync(temporary, filePath);
  });
}

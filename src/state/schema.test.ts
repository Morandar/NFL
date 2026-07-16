import { describe, expect, it } from 'vitest';
import { normalizeGameState } from './schema';
import { createTestState } from '../test/fixtures';

describe('game state schema', () => {
  it('normalizes a valid game state', () => {
    const normalized = normalizeGameState(createTestState());
    expect(normalized?.phase).toBe('season');
    expect(Object.keys(normalized?.ownership ?? {})).toHaveLength(32);
  });

  it('migrates settings missing the division rule', () => {
    const legacy = createTestState() as unknown as { settings: Record<string, unknown> };
    delete legacy.settings.lockDivisionRule;
    expect(normalizeGameState(legacy)?.settings.lockDivisionRule).toBe(false);
  });

  it('migrates a saved game without result history', () => {
    const legacy = createTestState() as unknown as { appliedResults?: unknown[] };
    delete legacy.appliedResults;
    expect(normalizeGameState(legacy)?.appliedResults).toEqual([]);
  });

  it('removes ownership pointing to a missing player', () => {
    const state = createTestState();
    state.ownership.BUF = 'missing-player';
    expect(normalizeGameState(state)?.ownership.BUF).toBeNull();
  });

  it('rejects an unknown phase', () => {
    const state = { ...createTestState(), phase: 'finished' };
    expect(normalizeGameState(state)).toBeNull();
  });
});

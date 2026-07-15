import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearState, loadState, saveState } from './persistence';
import { createTestState } from '../test/fixtures';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('local persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  it('round-trips a versioned state', () => {
    const state = createTestState();
    saveState(state);
    expect(loadState()?.ownership.BUF).toBe('p1');
  });

  it('migrates the v1 storage key', () => {
    localStorage.setItem('nfl-conquest-state-v1', JSON.stringify(createTestState()));
    expect(loadState()?.phase).toBe('season');
    expect(localStorage.getItem('nfl-conquest-state-v1')).toBeNull();
  });

  it('backs up a corrupt state instead of crashing', () => {
    localStorage.setItem('nfl-conquest-state-v2', '{broken');
    expect(loadState()).toBeNull();
    expect(localStorage.getItem('nfl-conquest-state-corrupt')).toBe('{broken');
  });

  it('clears both current and legacy state', () => {
    saveState(createTestState());
    localStorage.setItem('nfl-conquest-state-v1', '{}');
    clearState();
    expect(loadState()).toBeNull();
  });
});

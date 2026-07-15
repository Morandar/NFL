import type { GameState } from './types';
import { GAME_STATE_VERSION, normalizeGameState } from './schema';

const STORAGE_KEY = 'nfl-conquest-state-v2';
const LEGACY_STORAGE_KEY = 'nfl-conquest-state-v1';
const CORRUPT_STORAGE_KEY = 'nfl-conquest-state-corrupt';
const PREVIEW_STORAGE_KEY = 'nfl-conquest-preview-state';

type StoredState = { version: number; state: GameState; savedAt: string };

export function saveState(state: GameState): void {
  try {
    const payload: StoredState = {
      version: GAME_STATE_VERSION,
      state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadState(): GameState | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return parseStoredState(current);

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return null;
    const migrated = normalizeGameState(JSON.parse(legacy));
    if (!migrated) {
      preserveCorruptState(legacy);
      return null;
    }
    saveState(migrated);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

function parseStoredState(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) {
      preserveCorruptState(raw);
      return null;
    }
    const normalized = normalizeGameState((parsed as { state: unknown }).state);
    if (!normalized) preserveCorruptState(raw);
    return normalized;
  } catch {
    preserveCorruptState(raw);
    return null;
  }
}

function preserveCorruptState(raw: string): void {
  localStorage.setItem(CORRUPT_STORAGE_KEY, raw.slice(0, 250_000));
  localStorage.removeItem(STORAGE_KEY);
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function savePreviewState(state: GameState): void {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify({
      version: GAME_STATE_VERSION,
      state,
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to save preview state:', error);
  }
}

export function loadPreviewState(): GameState | null {
  const stored = localStorage.getItem(PREVIEW_STORAGE_KEY);
  return stored ? parseStoredState(stored) : null;
}

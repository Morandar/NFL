import { GameState } from './types';

const STORAGE_KEY = 'nfl-conquest-state-v1';

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
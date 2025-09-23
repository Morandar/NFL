import { GameState } from './types';
import { SUPABASE_ENABLED } from '../lib/supabaseClient';

const STORAGE_KEY = 'nfl-conquest-state-v1';

export function saveState(state: GameState): void {
  if (SUPABASE_ENABLED) {
    return; // Don't save locally in multiplayer mode
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadState(): GameState | null {
  if (SUPABASE_ENABLED) {
    return null; // Don't load locally in multiplayer mode
  }
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
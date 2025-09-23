import { GameState } from '../state/types';
import { calculateStandings } from './standings';

export function checkInstantWin(state: GameState): string | null {
  const standings = calculateStandings(state);
  
  for (const standing of standings) {
    if (standing.percentage >= 90) {
      return standing.player.name;
    }
  }
  
  return null;
}

export function determineWinner(state: GameState): string[] {
  const standings = calculateStandings(state);
  
  if (standings.length === 0) return [];
  
  const maxTerritories = standings[0].territories;
  return standings
    .filter(s => s.territories === maxTerritories)
    .map(s => s.player.name);
}
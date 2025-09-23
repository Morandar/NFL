import { GameState, Player } from '../state/types';
import { getPlayerTerritories } from './conquest';

export type Standing = {
  player: Player;
  territories: number;
  percentage: number;
};

export function calculateStandings(state: GameState): Standing[] {
  const totalTerritories = 32;
  
  return state.players.map(player => {
    const territories = getPlayerTerritories(state, player.id).length;
    const percentage = (territories / totalTerritories) * 100;
    
    return {
      player,
      territories,
      percentage
    };
  }).sort((a, b) => b.territories - a.territories);
}
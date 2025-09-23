import { GameState } from '../state/types';
import { getPlayerTerritories } from '../logic/conquest';

interface PlayerLegendProps {
  gameState: GameState;
  highlightPlayerId: string | null;
  onHighlight: (playerId: string | null) => void;
}

const TOTAL_TERRITORIES = 32;

export function PlayerLegend({ gameState, highlightPlayerId, onHighlight }: PlayerLegendProps) {
  if (gameState.players.length === 0) {
    return null;
  }

  const players = gameState.players
    .map((player) => {
      const territories = getPlayerTerritories(gameState, player.id).length;
      const percentage = territories > 0 ? (territories / TOTAL_TERRITORIES) * 100 : 0;
      return {
        ...player,
        territories,
        percentage,
      };
    })
    .sort((a, b) => b.territories - a.territories);

  return (
    <details className="player-legend" aria-label="Player legend">
      <summary>
        <div className="player-legend-summary">
          <strong>Legend</strong>
          <span className="legend-count">{players.length} hráčů</span>
        </div>
      </summary>
      <div className="player-legend-header">
        <strong>Legend</strong>
        {highlightPlayerId && (
          <button type="button" onClick={() => onHighlight(null)}>
            Zrušit zvýraznění
          </button>
        )}
      </div>
      <ul>
        {players.map((player) => {
          const isHighlighted = highlightPlayerId === player.id;
          return (
            <li key={player.id} className={isHighlighted ? 'active' : ''}>
              <button type="button" onClick={() => onHighlight(player.id)}>
                <span className="color-dot" style={{ backgroundColor: player.color }} />
                <span className="player-name">{player.name}</span>
                <span className="player-stats">{player.territories} · {player.percentage.toFixed(0)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

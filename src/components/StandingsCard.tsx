import { GameState } from '../state/types';
import { calculateStandings } from '../logic/standings';

interface StandingsCardProps {
  gameState: GameState;
}

export function StandingsCard({ gameState }: StandingsCardProps) {
  const standings = calculateStandings(gameState);

  return (
    <div className="standings-card">
      <h3>Standings</h3>
      <div className="standings-list">
        {standings.map((standing, index) => (
          <div key={standing.player.id} className="standing-row">
            <span className="rank">{index + 1}.</span>
            <span className="color-dot" style={{ backgroundColor: standing.player.color }} aria-label={`${standing.player.name}'s color`} />
            <span className="player-name">{standing.player.name}</span>
            <span className="territories">{standing.territories} teams</span>
            <span className="percentage">({standing.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

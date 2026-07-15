import { GameState } from '../state/types';
import { calculateStandings } from '../logic/standings';

interface StandingsCardProps {
  gameState: GameState;
}

export function StandingsCard({ gameState }: StandingsCardProps) {
  const standings = calculateStandings(gameState);

  return (
    <div className="standings-card">
      <div className="lobby-section-title">
        <span className="section-number">LIVE</span>
        <h3>Pořadí</h3>
      </div>
      <div className="standings-list">
        {standings.map((standing, index) => (
          <div key={standing.player.id} className="standing-row">
            <span className="rank">{String(index + 1).padStart(2, '0')}</span>
            <span className="color-dot" style={{ backgroundColor: standing.player.color }} aria-label={`Barva hráče ${standing.player.name}`} />
            <span className="player-name">{standing.player.name}</span>
            <span className="territories">{standing.territories}</span>
            <span className="percentage">{standing.percentage.toFixed(0)} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}

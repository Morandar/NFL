import { GameState, TeamId } from '../state/types';
import { TEAM_COLORS } from '../data/teamColors';
import { TEAM_LOGOS, TEAM_LOGOS_BW } from '../data/teamLogos';
import { NFL_TEAMS } from '../data/nflTeams';

interface TeamGridProps {
  gameState: GameState;
  showHint?: boolean;
  selectedTeamId?: TeamId | null;
  highlightPlayerId?: string | null;
  onSelectTeam?: (teamId: TeamId) => void;
}

const lightenColor = (hex: string, amount: number) => {
  const normalized = hex.replace('#', '');
  const num = parseInt(normalized, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.round(r + (255 - r) * amount));
  g = Math.min(255, Math.round(g + (255 - g) * amount));
  b = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

export function TeamGrid({
  gameState,
  showHint = true,
  selectedTeamId = null,
  highlightPlayerId = null,
  onSelectTeam,
}: TeamGridProps) {
  return (
    <div className="team-grid" aria-label="NFL team ownership grid">
      <div className="team-grid-board">
        {NFL_TEAMS.map((team) => {
          const ownerId = gameState.ownership[team.id];
          const owner = ownerId ? gameState.players.find((player) => player.id === ownerId) : undefined;
          const isSelected = selectedTeamId === team.id;
          const matchesHighlight = highlightPlayerId ? owner?.id === highlightPlayerId : true;

          const teamColor = TEAM_COLORS[team.id] ?? '#1b1d24';
          const backgroundColor = owner
            ? matchesHighlight || isSelected
              ? teamColor
              : lightenColor(teamColor, 0.2)
            : lightenColor(teamColor, 0.55);

          const borderColor = isSelected
            ? '#FFFFFF'
            : owner?.color ?? 'rgba(24, 28, 38, 0.7)';

          const logoUrl = owner
            ? TEAM_LOGOS[team.id] ?? TEAM_LOGOS_BW[team.id]
            : TEAM_LOGOS_BW[team.id] ?? TEAM_LOGOS[team.id];

          const ownerLabel = owner ? owner.name : 'Volné';

          return (
            <button
              key={team.id}
              type="button"
              className={`team-grid-tile ${owner ? 'owned' : 'free'} ${isSelected ? 'selected' : ''}`}
              style={{ backgroundColor, borderColor }}
              onClick={() => onSelectTeam?.(team.id)}
            >
              <div
                className={`team-grid-logo ${owner ? 'owned' : 'free'}`}
                style={{ backgroundImage: logoUrl ? `url(${logoUrl})` : undefined }}
              />
              <div className="team-grid-labels">
                <span className="team-grid-abbr">{team.id}</span>
                <span className="team-grid-owner">{ownerLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
      {showHint && (
        <p className="team-grid-hint">
          Tip: otevři soubor `nfl_team_grid.svg` pro přesnou editaci barev nebo tisk draft boardu.
        </p>
      )}
    </div>
  );
}

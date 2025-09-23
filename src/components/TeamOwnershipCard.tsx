import { GameState, TeamId } from '../state/types';
import { NFL_TEAMS } from '../data/nflTeams';
import { getPlayerTerritories } from '../logic/conquest';

interface TeamOwnershipCardProps {
  gameState: GameState;
  teamId: TeamId | null;
  highlightPlayerId: string | null;
  onSelectTeam: (teamId: TeamId | null) => void;
  onToggleHighlight: (playerId: string | null) => void;
}

const TEAM_LOOKUP = new Map(NFL_TEAMS.map((team) => [team.id, team]));

export function TeamOwnershipCard({
  gameState,
  teamId,
  highlightPlayerId,
  onSelectTeam,
  onToggleHighlight,
}: TeamOwnershipCardProps) {
  if (!teamId) {
    return (
      <div className="team-ownership-card empty">
        <h3>Detail týmu</h3>
        <p>Klikni na tým na mapě nebo v mřížce a zobrazíš si vlastníka a statistiky.</p>
      </div>
    );
  }

  const team = TEAM_LOOKUP.get(teamId);
  const ownerId = gameState.ownership[teamId];
  const owner = ownerId ? gameState.players.find((player) => player.id === ownerId) : undefined;
  const ownerTerritories = owner ? getPlayerTerritories(gameState, owner.id) : [];
  const isHighlighted = owner ? highlightPlayerId === owner.id : false;

  const ownerTeamNames = ownerTerritories
    .map((id) => TEAM_LOOKUP.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => `${t.city} ${t.name}`);

  return (
    <div className="team-ownership-card">
      <div className="team-ownership-header">
        <div
          className="team-id-badge"
          style={{ borderColor: owner?.color ?? '#555' }}
          aria-label={`Selected team ${teamId}`}
        >
          {teamId}
        </div>
        <div className="team-identity">
          <h3>{team ? `${team.city} ${team.name}` : teamId}</h3>
          <p>{team ? `${team.conference} ${team.division}` : 'Unknown division'}</p>
        </div>
      </div>

      <div className="team-ownership-body">
        {owner ? (
          <>
            <div className="owner-summary">
              <span className="owner-name">
                <span className="color-dot" style={{ backgroundColor: owner.color }} />
                {owner.name}
              </span>
              <span className="territory-count">Území: {ownerTerritories.length}</span>
            </div>
            {ownerTeamNames.length > 0 && (
              <div className="owner-teams">
                {ownerTeamNames.map((name) => (
                  <span key={name} className="team-chip">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="owner-summary no-owner">Tento tým zatím nikdo nevlastní.</div>
        )}
      </div>

      <div className="team-ownership-actions">
        <button type="button" onClick={() => onSelectTeam(null)}>
          Zrušit výběr
        </button>
        {owner && (
          <button
            type="button"
            className={isHighlighted ? 'active' : ''}
            onClick={() => onToggleHighlight(owner.id)}
          >
            {isHighlighted ? 'Zrušit zvýraznění' : 'Zvýraznit území hráče'}
          </button>
        )}
      </div>
    </div>
  );
}

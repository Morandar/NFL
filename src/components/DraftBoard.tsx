import { GameState, TeamId } from '../state/types';
import { NFL_TEAMS, NFL_TEAM_MAP } from '../data/nflTeams';
import { TEAM_COLORS } from '../data/teamColors';

interface DraftBoardProps {
  gameState: GameState;
  onPickTeam: (teamId: TeamId) => void;
  currentUserPlayerId: string | null;
  isHost: boolean;
  onReset: () => void;
  onRemovePlayer: (playerId: string) => void;
}

export function DraftBoard({ gameState, onPickTeam, currentUserPlayerId, isHost, onReset, onRemovePlayer }: DraftBoardProps) {
  const { players, draftOrder, currentPickIndex, ownership } = gameState;
  const currentPlayerId = draftOrder[currentPickIndex];
  const currentPlayer = players.find((player) => player.id === currentPlayerId);

  const totalPicks = players.length * gameState.settings.picksPerPlayer;
  const picksCompleted = Object.values(ownership).filter((owner) => owner !== null).length;
  const draftComplete = picksCompleted >= totalPicks;

  const getRound = () => Math.floor(currentPickIndex / players.length) + 1;
  const getPickInRound = () => (currentPickIndex % players.length) + 1;

  return (
    <div className="draft-board">
      <div className="draft-header">
        <h2>Snake Draft</h2>
        {!draftComplete && currentPlayer && (
          <div className="current-pick">
            <span>Round {getRound()}, Pick {getPickInRound()}</span>
            <span className="picking-player">
              <span className="color-dot" style={{ backgroundColor: currentPlayer.color }} />
              {currentPlayer.name} is picking
            </span>
          </div>
        )}
        {draftComplete && <div className="draft-complete">Draft Complete!</div>}
        {isHost && (
          <button onClick={onReset} className="reset-btn" style={{ marginTop: '1rem' }}>
            Reset to Setup
          </button>
        )}
      </div>

      <div className="teams-grid">
        {NFL_TEAMS.map((team) => {
          const owner = ownership[team.id];
          const ownerPlayer = owner ? players.find((player) => player.id === owner) : null;
          const isAvailable = !owner;
          const divisionLocked =
            gameState.settings.lockDivisionRule &&
            !!currentPlayer &&
            currentPlayer.teamsOwned.some((ownedId) => {
              const ownedMeta = NFL_TEAM_MAP[ownedId];
              return (
                ownedMeta &&
                ownedMeta.division === team.division &&
                ownedMeta.conference === team.conference
              );
            });
          const disabled = !isAvailable || draftComplete || divisionLocked || (currentUserPlayerId !== currentPlayerId);

          return (
            <button
              key={team.id}
              className={`team-card ${!isAvailable ? 'taken' : ''} ${divisionLocked ? 'division-locked' : ''}`}
              onClick={() => isAvailable && !draftComplete && !divisionLocked && (currentUserPlayerId === currentPlayerId) && onPickTeam(team.id)}
              disabled={disabled}
              style={{
                backgroundColor: ownerPlayer ? ownerPlayer.color : '#2a2a2a',
                borderColor: TEAM_COLORS[team.id],
              }}
              aria-label={`${team.city} ${team.name} ${ownerPlayer ? `- owned by ${ownerPlayer.name}` : divisionLocked ? '- blocked by division rule' : '- available'}`}
              title={divisionLocked ? 'Divizní pravidlo: hráč už vlastní tým v této divizi.' : undefined}
            >
              <div className="team-id">{team.id}</div>
              <div className="team-name">{team.name}</div>
              {ownerPlayer && <div className="owner-name">{ownerPlayer.name}</div>}
            </button>
          );
        })}
      </div>

      <div className="draft-order">
        <h3>Draft Order</h3>
        <div className="order-list">
          {draftOrder.map((playerId, index) => {
            const player = players.find((p) => p.id === playerId);
            const isActive = index === currentPickIndex;

            return (
              <div key={`${playerId}-${index}`} className={`order-item ${isActive ? 'active' : ''}`}>
                <span className="pick-number">{index + 1}.</span>
                <span className="color-dot" style={{ backgroundColor: player?.color }} />
                <span>{player?.name}</span>
              </div>
            );
          })}
        </div>
        {isHost && gameState.players.length > 0 && (
          <div className="player-management" style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#222', borderRadius: '8px' }}>
            <h4>Manage Players</h4>
            {gameState.players.map((player) => (
              <div key={player.id} className="player-manage-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="color-dot" style={{ backgroundColor: player.color }} />
                <span>{player.name}</span>
                <button onClick={() => onRemovePlayer(player.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

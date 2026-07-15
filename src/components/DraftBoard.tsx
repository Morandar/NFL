import { GameState, TeamId } from '../state/types';
import { NFL_TEAMS, NFL_TEAM_MAP } from '../data/nflTeams';
import { TEAM_COLORS } from '../data/teamColors';

interface DraftBoardProps {
  gameState: GameState;
  onPickTeam: (teamId: TeamId) => void;
  userPlayerIds: string[];
  isHost: boolean;
  onReset: () => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdatePlayerName: (playerId: string, name: string) => void;
}

export function DraftBoard({ gameState, onPickTeam, userPlayerIds, isHost, onReset, onRemovePlayer, onUpdatePlayerName }: DraftBoardProps) {
  const { players, draftOrder, currentPickIndex, ownership } = gameState;
  const currentPlayerId = draftOrder[currentPickIndex];
  const currentPlayer = players.find((player) => player.id === currentPlayerId);

  const totalPicks = players.length * gameState.settings.picksPerPlayer;
  const picksCompleted = Object.values(ownership).filter((owner) => owner !== null).length;
  const draftComplete = picksCompleted >= totalPicks;
  const progress = totalPicks > 0 ? Math.min(100, (picksCompleted / totalPicks) * 100) : 0;
  const isMyTurn = userPlayerIds.includes(currentPlayerId);

  const getRound = () => Math.floor(currentPickIndex / players.length) + 1;
  const getPickInRound = () => (currentPickIndex % players.length) + 1;

  return (
    <div className="draft-board">
      <div className="draft-header">
        <div>
          <p className="eyebrow">SNAKE DRAFT</p>
          <h2>Vyberte si svoje týmy</h2>
          <p className="panel-description">Každý výběr určí vaše počáteční území na mapě.</p>
        </div>
        <div className="draft-header-actions">
          {!draftComplete && currentPlayer && (
            <div className={`current-pick ${isMyTurn ? 'my-turn' : ''}`}>
              <span>Kolo {getRound()} · výběr {getPickInRound()}</span>
              <span className="picking-player">
                <span className="color-dot" style={{ backgroundColor: currentPlayer.color }} />
                {isMyTurn ? 'Jsi na řadě' : `${currentPlayer.name} vybírá`}
              </span>
            </div>
          )}
          {draftComplete && <div className="draft-complete">Draft dokončen</div>}
          {isHost && (
            <button onClick={onReset} className="ghost-button">Zpět na začátek</button>
          )}
        </div>
      </div>

      <div className="draft-progress" aria-label={`${picksCompleted} z ${totalPicks} výběrů dokončeno`}>
        <div><span>Průběh draftu</span><strong>{picksCompleted}/{totalPicks}</strong></div>
        <span><i style={{ width: `${progress}%` }} /></span>
      </div>

      <div className="draft-layout">
        <div className="draft-team-section">
          <div className="lobby-section-title">
            <span className="section-number">01</span>
            <h3>Dostupné týmy</h3>
            <span>{NFL_TEAMS.length - picksCompleted} volných</span>
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
          const disabled = !isAvailable || draftComplete || divisionLocked || !isMyTurn;

          return (
            <button
              key={team.id}
              className={`team-card ${!isAvailable ? 'taken' : ''} ${divisionLocked ? 'division-locked' : ''}`}
              onClick={() => isAvailable && !draftComplete && !divisionLocked && isMyTurn && onPickTeam(team.id)}
              disabled={disabled}
              style={{
                '--team-color': TEAM_COLORS[team.id],
                backgroundColor: ownerPlayer ? ownerPlayer.color : undefined,
                borderColor: TEAM_COLORS[team.id],
              } as React.CSSProperties}
              aria-label={`${team.city} ${team.name} ${ownerPlayer ? `- owned by ${ownerPlayer.name}` : divisionLocked ? '- blocked by division rule' : '- available'}`}
              title={divisionLocked ? 'Divizní pravidlo: hráč už vlastní tým v této divizi.' : undefined}
            >
              <div className="team-card-top"><span>{team.conference}</span><span>{team.division}</span></div>
              <div className="team-id">{team.id}</div>
              <div className="team-city">{team.city}</div>
              <div className="team-name">{team.name}</div>
              {ownerPlayer && <div className="owner-name">Vybral {ownerPlayer.name}</div>}
              {divisionLocked && !ownerPlayer && <div className="owner-name">Blokovaná divize</div>}
            </button>
          );
        })}
          </div>
        </div>

      <aside className="draft-order">
        <div className="lobby-section-title">
          <span className="section-number">02</span>
          <h3>Pořadí</h3>
        </div>
        <div className="order-list">
          {draftOrder.map((playerId, index) => {
            const player = players.find((p) => p.id === playerId);
            const isActive = index === currentPickIndex;

            return (
              <div key={`${playerId}-${index}`} className={`order-item ${isActive ? 'active' : ''}`}>
                <span className="pick-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="color-dot" style={{ backgroundColor: player?.color }} />
                <span>{player?.name}</span>
              </div>
            );
          })}
        </div>
        {isHost && gameState.players.length > 0 && (
          <div className="player-management">
            <h4>Správa hráčů</h4>
            {gameState.players.map((player) => (
              <div key={player.id} className="player-manage-row">
                <span className="color-dot" style={{ backgroundColor: player.color }} />
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => onUpdatePlayerName(player.id, e.target.value)}
                  aria-label={`Jméno hráče ${player.name}`}
                />
                <button onClick={() => onRemovePlayer(player.id)} className="icon-button danger" aria-label={`Odebrat ${player.name}`}>×</button>
              </div>
            ))}
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}

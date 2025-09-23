import { useState } from 'react';
import { Player, Settings } from '../state/types';

interface JoinScreenProps {
  availablePlayers: Player[];
  onClaimPlayer: (playerId: string, name: string) => void;
  isHost: boolean;
  allClaimed: boolean;
  onStartDraft: (players: Player[], settings: Settings) => void;
  connectedUsers: string[];
  assignedUsers: string[];
  onAssignPlayer: (playerId: string, userId: string) => void;
}

export function JoinScreen({ availablePlayers, onClaimPlayer, isHost, allClaimed, onStartDraft, connectedUsers, assignedUsers, onAssignPlayer }: JoinScreenProps) {
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  const handleClaim = (playerId: string) => {
    const name = playerNames[playerId]?.trim();
    if (name) {
      onClaimPlayer(playerId, name);
    }
  };

  return (
    <div className="join-screen">
      <h2>{isHost ? 'Přiřadit hráče' : 'Připojit se k hře'}</h2>
      {isHost && (
        <div className="connected-users">
          <h3>Připojení uživatelé: {connectedUsers.join(', ')}</h3>
        </div>
      )}
      {!isHost && <p>Vyber si volný slot a zadej své jméno:</p>}
      {availablePlayers.length === 0 ? (
        <p>Žádné volné sloty. Počkej na admina, aby přidal hráče.</p>
      ) : (
        <div className="available-players">
          {availablePlayers.map((player) => (
            <div key={player.id} className="player-slot">
              <span className="color-dot" style={{ backgroundColor: player.color }} />
              <span>{player.name}</span>
              {isHost ? (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssignPlayer(player.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Přiřadit uživatele</option>
                  {connectedUsers.filter(user => !assignedUsers.includes(user)).map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Tvé jméno"
                    value={playerNames[player.id] || ''}
                    onChange={(e) => setPlayerNames(prev => ({...prev, [player.id]: e.target.value}))}
                    onKeyPress={(e) => e.key === 'Enter' && handleClaim(player.id)}
                  />
                  <button
                    onClick={() => handleClaim(player.id)}
                    disabled={!playerNames[player.id]?.trim()}
                  >
                    Připojit
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {isHost && allClaimed && (
        <button onClick={() => onStartDraft([], { picksPerPlayer: 1, useMarginRules: false, playoffBoost: false, superBowlSweep: false, lockDivisionRule: false })}>
          Start Draft
        </button>
      )}
    </div>
  );
}
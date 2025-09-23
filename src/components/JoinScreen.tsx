import { useState } from 'react';
import { Player, Settings } from '../state/types';

interface JoinScreenProps {
  availablePlayers: Player[];
  onClaimPlayer: (playerId: string, name: string) => void;
  isHost: boolean;
  allClaimed: boolean;
  onStartDraft: (players: Player[], settings: Settings) => void;
}

export function JoinScreen({ availablePlayers, onClaimPlayer, isHost, allClaimed, onStartDraft }: JoinScreenProps) {
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  const handleClaim = (playerId: string) => {
    const name = playerNames[playerId]?.trim();
    if (name) {
      onClaimPlayer(playerId, name);
    }
  };

  return (
    <div className="join-screen">
      <h2>Připojit se k hře</h2>
      <p>Vyber si volný slot a zadej své jméno:</p>
      {availablePlayers.length === 0 ? (
        <p>Žádné volné sloty. Počkej na admina, aby přidal hráče.</p>
      ) : (
        <div className="available-players">
          {availablePlayers.map((player) => (
            <div key={player.id} className="player-slot">
              <span className="color-dot" style={{ backgroundColor: player.color }} />
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
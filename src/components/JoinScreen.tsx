import { useState } from 'react';
import { Player, Settings } from '../state/types';

interface JoinScreenProps {
  players: Player[];
  onClaimPlayer: (playerId: string) => void;
  isHost: boolean;
  allClaimed: boolean;
  onStartDraft: (players: Player[], settings: Settings) => void;
  connectedUsers: string[];
  assignedUsers: string[];
  onAssignPlayer: (playerId: string, userId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  messages: { user: string; text: string; timestamp: string }[];
  onSendMessage: (text: string) => void;
}

export function JoinScreen({ players, onClaimPlayer, isHost, allClaimed, onStartDraft, connectedUsers, assignedUsers, onAssignPlayer, onRemovePlayer, messages, onSendMessage }: JoinScreenProps) {
  const [chatMessage, setChatMessage] = useState('');

  const handleClaim = (playerId: string) => {
    onClaimPlayer(playerId);
  };

  return (
    <div className="join-screen">
      <h2>Lobby</h2>
      <div className="lobby-info">
        <div className="connected-users">
          <h3>Připojení uživatelé: {connectedUsers.join(', ')}</h3>
        </div>
        <div className="assigned-players">
          <h3>Přiřazení hráči:</h3>
          <ul>
            {players.map(player => (
              <li key={player.id}>
                {player.name}: {player.userId || 'nepřiřazeno'}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {!isHost && <p>Vyber si volný slot:</p>}
      <div className="available-players">
        {players.map((player) => (
          <div key={player.id} className="player-slot">
            <span className="color-dot" style={{ backgroundColor: player.color }} />
            <span>{player.name}</span>
            {player.userId ? (
              <span>Claimed by {player.userId}</span>
            ) : (
              <>
                {isHost ? (
                  <>
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
                    <button onClick={() => onRemovePlayer(player.id)} style={{ marginLeft: '0.5rem' }}>
                      Odebrat
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleClaim(player.id)}>
                    Claim
                  </button>
                )}
              </>
            )}
            {isHost && (
              <button onClick={() => onRemovePlayer(player.id)} style={{ marginLeft: '0.5rem' }}>
                Odebrat
              </button>
            )}
          </div>
        ))}
      </div>
      {isHost && allClaimed && (
        <button onClick={() => onStartDraft([], { picksPerPlayer: 1, useMarginRules: false, playoffBoost: false, superBowlSweep: false, lockDivisionRule: false })}>
          Start Draft
        </button>
      )}
      <div className="chat-section">
        <h3>Chat</h3>
        <div className="chat-messages">
          {messages.slice(-10).map((msg, index) => (
            <div key={index} className="chat-message">
              <strong>{msg.user}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Napiš zprávu..."
            maxLength={200}
          />
          <button onClick={handleSendMessage} disabled={!chatMessage.trim()}>
            Odeslat
          </button>
        </div>
      </div>
    </div>
  );

  function handleSendMessage() {
    if (chatMessage.trim()) {
      onSendMessage(chatMessage.trim());
      setChatMessage('');
    }
  }
}
import { useState } from 'react';
import { Player } from '../state/types';

interface JoinScreenProps {
  players: Player[];
  onClaimPlayer: (playerId: string) => void;
  isHost: boolean;
  allClaimed: boolean;
  onStartDraft: () => void;
  connectedUsers: string[];
  assignedUsers: string[];
  onAssignPlayer: (playerId: string, userId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onUnclaimPlayer: (playerId: string) => void;
  onAddPlayer: () => void;
  messages: { user: string; text: string; timestamp: string }[];
  onSendMessage: (text: string) => void;
}

export function JoinScreen({ players, onClaimPlayer, isHost, allClaimed, onStartDraft, connectedUsers, assignedUsers, onAssignPlayer, onRemovePlayer, onUnclaimPlayer, onAddPlayer, messages, onSendMessage }: JoinScreenProps) {
  const [chatMessage, setChatMessage] = useState('');

  const handleClaim = (playerId: string) => {
    onClaimPlayer(playerId);
  };

  return (
    <div className="join-screen">
      <div className="panel-heading lobby-heading">
        <div>
          <p className="eyebrow">HERNÍ LOBBY</p>
          <h2>Rozdělte si hráče</h2>
          <p className="panel-description">
            {isHost ? 'Přiřaď účastníkům jejich slot a spusť draft.' : 'Vyber si volný hráčský slot.'}
          </p>
        </div>
        <div className="lobby-presence">
          <span className="status-dot" aria-hidden="true" />
          {connectedUsers.length} {connectedUsers.length === 1 ? 'připojený' : 'připojení'}
        </div>
      </div>

      <div className="connected-strip" aria-label="Připojení uživatelé">
        {connectedUsers.map((user) => <span key={user}>{user.slice(0, 1).toUpperCase()}<strong>{user}</strong></span>)}
      </div>

      <div className="lobby-section-title">
        <span className="section-number">01</span>
        <h3>Hráčské sloty</h3>
        <span>{players.filter((player) => player.userId).length}/{players.length} obsazeno</span>
      </div>
      <div className="available-players">
        {players.map((player) => (
          <div key={player.id} className={`player-slot ${player.userId ? 'claimed' : ''}`}>
            <span className="slot-number">{String(players.indexOf(player) + 1).padStart(2, '0')}</span>
            <span className="color-dot" style={{ backgroundColor: player.color }} />
            <div className="slot-identity">
              <strong>{player.name}</strong>
              <small>{player.userId ? `Ovládá ${player.userId}` : 'Čeká na hráče'}</small>
            </div>
            {player.userId ? (
              <>
                <span className="claimed-badge">Obsazeno</span>
                {isHost && (
                  <button onClick={() => onUnclaimPlayer(player.id)} className="ghost-button">
                    Uvolnit
                  </button>
                )}
              </>
            ) : (
              <>
                {isHost ? (
                  <>
                    <select
                      aria-label={`Přiřadit uživatele slotu ${player.name}`}
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignPlayer(player.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Vybrat uživatele</option>
                      {connectedUsers.filter(user => !assignedUsers.includes(user)).map((user) => (
                        <option key={user} value={user}>
                          {user}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleClaim(player.id)} className="secondary-button">
                      Vzít pro sebe
                    </button>
                    <button onClick={() => onRemovePlayer(player.id)} className="icon-button danger" aria-label={`Odebrat ${player.name}`}>
                      ×
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleClaim(player.id)} className="primary-button">
                    Vybrat slot
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {isHost && (
        <div className="lobby-actions">
          <button onClick={onAddPlayer} className="secondary-button">+ Přidat slot</button>
          <button onClick={onStartDraft} className="primary-button" disabled={!allClaimed}>
            Spustit draft <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      <div className="chat-section">
        <div className="lobby-section-title">
          <span className="section-number">02</span>
          <h3>Chat</h3>
        </div>
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

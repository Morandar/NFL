import { useState } from 'react';
import { Player, Settings } from '../state/types';

interface SetupPanelProps {
  onAddPlayers: (players: Player[], settings: Settings) => void;
}

const RANDOM_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FECA57',
  '#FF9FF3',
  '#54A0FF',
  '#48DBFB',
];

export function SetupPanel({ onAddPlayers }: SetupPanelProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<Settings>({
    picksPerPlayer: 1,
    useMarginRules: false,
    playoffBoost: false,
    superBowlSweep: false,
    lockDivisionRule: false,
  });

  const addPlayer = () => {
    if (players.length < 8) {
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        name: `Player ${players.length + 1}`,
        color: RANDOM_COLORS[players.length % RANDOM_COLORS.length],
        teamsOwned: [],
        userId: null,
      };
      setPlayers([...players, newPlayer]);
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((player) => player.id !== id));
  };

  const canStartDraft = players.length >= 2;

  return (
    <div className="setup-panel">
      <h2>Game Setup</h2>

      <div className="section">
        <h3>Add Players (2-8)</h3>
        <button
          onClick={addPlayer}
          disabled={players.length >= 8}
          aria-label="Add player"
        >
          Add Player
        </button>

        <div className="players-list">
          {players.map((player) => (
            <div key={player.id} className="player-item">
              <span className="color-dot" style={{ backgroundColor: player.color }} aria-label={`Player color: ${player.color}`} />
              <span>{player.name}</span>
              <button
                onClick={() => removePlayer(player.id)}
                aria-label={`Remove ${player.name}`}
                className="remove-btn"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Settings</h3>

        <label className="setting-row">
          <span>Picks per player:</span>
          <select
            value={settings.picksPerPlayer}
            onChange={(event) =>
              setSettings({ ...settings, picksPerPlayer: parseInt(event.target.value, 10) as 1 | 2 | 3 })
            }
            aria-label="Picks per player"
          >
            <option value={1}>1 team</option>
            <option value={2}>2 teams</option>
            <option value={3}>3 teams</option>
          </select>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.useMarginRules}
            onChange={(event) => setSettings({ ...settings, useMarginRules: event.target.checked })}
            aria-label="Use margin rules"
          />
          <span>Margin Rules (8+ points = extra capture)</span>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.playoffBoost}
            onChange={(event) => setSettings({ ...settings, playoffBoost: event.target.checked })}
            aria-label="Playoff boost"
          />
          <span>Playoff Boost (+1 capture)</span>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.superBowlSweep}
            onChange={(event) => setSettings({ ...settings, superBowlSweep: event.target.checked })}
            aria-label="Super Bowl sweep"
          />
          <span>Super Bowl Sweep (winner takes all)</span>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.lockDivisionRule}
            onChange={(event) => setSettings({ ...settings, lockDivisionRule: event.target.checked })}
            aria-label="Zakázat týmy ze stejné divize"
          />
          <span>Zakázat draft týmů ze stejné divize</span>
        </label>
      </div>

      <button className="start-draft-btn" onClick={() => onAddPlayers(players, settings)} disabled={!canStartDraft} aria-label="Add players">
        Add Players
      </button>
    </div>
  );
}

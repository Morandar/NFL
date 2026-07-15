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
      <div className="panel-heading">
        <div>
          <p className="eyebrow">NOVÁ HRA</p>
          <h2>Připravte draft</h2>
          <p className="panel-description">Přidejte hráče a nastavte pravidla pro tuto sezónu.</p>
        </div>
        <span className="player-count">{players.length}/8 hráčů</span>
      </div>

      <div className="section">
        <div className="section-heading">
          <div>
            <span className="section-number">01</span>
            <h3>Hráči</h3>
          </div>
        <button
          onClick={addPlayer}
          disabled={players.length >= 8}
          aria-label="Přidat hráče"
          className="secondary-button"
        >
          + Přidat hráče
        </button>
        </div>

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
        <div className="section-heading">
          <div>
            <span className="section-number">02</span>
            <h3>Pravidla</h3>
          </div>
        </div>

        <label className="setting-row">
          <span>Počet týmů na hráče</span>
          <select
            value={settings.picksPerPlayer}
            onChange={(event) =>
              setSettings({ ...settings, picksPerPlayer: parseInt(event.target.value, 10) as 1 | 2 | 3 })
            }
            aria-label="Počet týmů na hráče"
          >
            <option value={1}>1 tým</option>
            <option value={2}>2 týmy</option>
            <option value={3}>3 týmy</option>
          </select>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.useMarginRules}
            onChange={(event) => setSettings({ ...settings, useMarginRules: event.target.checked })}
            aria-label="Výhra o osm a více bodů"
          />
          <span><strong>Výhra o 8+ bodů</strong><small>Jeden extra zábor území</small></span>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.playoffBoost}
            onChange={(event) => setSettings({ ...settings, playoffBoost: event.target.checked })}
            aria-label="Playoff boost"
          />
          <span><strong>Playoff boost</strong><small>Playoff výhra přidá jeden zábor</small></span>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.superBowlSweep}
            onChange={(event) => setSettings({ ...settings, superBowlSweep: event.target.checked })}
            aria-label="Super Bowl sweep"
          />
          <span><strong>Super Bowl sweep</strong><small>Vítěz získá všechna území soupeře</small></span>
        </label>

        <label className="setting-row checkbox">
          <input
            type="checkbox"
            checked={settings.lockDivisionRule}
            onChange={(event) => setSettings({ ...settings, lockDivisionRule: event.target.checked })}
            aria-label="Zakázat týmy ze stejné divize"
          />
          <span><strong>Unikátní divize</strong><small>Nelze draftovat dva týmy ze stejné divize</small></span>
        </label>
      </div>

      <button className="start-draft-btn primary-button" onClick={() => onAddPlayers(players, settings)} disabled={!canStartDraft} aria-label="Pokračovat do lobby">
        Pokračovat do lobby <span aria-hidden="true">→</span>
      </button>
      {!canStartDraft && <p className="form-hint">Pro pokračování přidejte alespoň dva hráče.</p>}
    </div>
  );
}

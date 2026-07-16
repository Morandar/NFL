import { useEffect, useMemo, useState } from 'react';
import { GameState, TeamId } from '../state/types';
import maskTemplateUrl from '../assets/nfl_map_mask_template.svg?url';
import maskPreviewUrl from '../assets/nfl_map_mask.svg?url';
import teamGridAssetUrl from '../assets/nfl_team_grid.svg?url';
import { NFL_TEAMS } from '../data/nflTeams';
import type { MultiplayerStatus } from '../hooks/useSupabaseSync';

type ManualRow = {
  id: string;
  winner: TeamId | '';
  winnerScore: string;
  loser: TeamId | '';
  loserScore: string;
  phase: 'regular' | 'playoff' | 'superbowl';
};

function createEmptyRow(week: number): ManualRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    winner: '',
    winnerScore: '',
    loser: '',
    loserScore: '',
    phase: week > 18 ? 'playoff' : 'regular',
  };
}

type ViewMode = 'map' | 'grid';

interface ControlPanelProps {
  gameState: GameState;
  viewMode: ViewMode;
  selectedTeamId: TeamId | null;
  highlightPlayerId: string | null;
  highlightedPlayerName?: string | null;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onSelectTeam: (teamId: TeamId | null) => void;
  onApplyCsv: (csv: string) => void;
  onReset: () => void;
  onClearHighlight: () => void;
  onExportRegions: () => string;
  onResetRegions: () => void;
  onResetSession: () => void;
  onSetWeek: (week: number) => void;
  multiplayerStatus: MultiplayerStatus;
  multiplayerError: string | null;
  isMultiplayerEnabled: boolean;
  onUpdatePlayerName: (playerId: string, name: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onAssignPlayer: (playerId: string, userId: string | undefined) => void;
  onRemoveTeams: (playerId: string, teamIds: TeamId[]) => void;
  userPlayerIds: string[];
  username: string;
  isHost: boolean;
}

export function ControlPanel({
  gameState,
  viewMode,
  selectedTeamId,
  highlightPlayerId,
  highlightedPlayerName,
  isAdminMode,
  onToggleAdmin,
  onChangeViewMode,
  onSelectTeam,
  onApplyCsv,
  onReset,
  onClearHighlight,
  onExportRegions,
  onResetRegions,
  onResetSession,
  onSetWeek,
  multiplayerStatus,
  multiplayerError,
  isMultiplayerEnabled,
  onUpdatePlayerName,
  onRemovePlayer,
  onAssignPlayer,
  onRemoveTeams,
  userPlayerIds,
  username,
  isHost,
}: ControlPanelProps) {
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState('');
  const [exportVisible, setExportVisible] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportValue, setExportValue] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(true);

  const [manualRows, setManualRows] = useState<ManualRow[]>([createEmptyRow(gameState.week)]);
  const [selectedTeamsToRemove, setSelectedTeamsToRemove] = useState<Record<string, TeamId[]>>({});
  const multiplayerStatusLabel = useMemo(() => {
    switch (multiplayerStatus) {
      case 'connecting':
        return 'Připojuji k Supabase...';
      case 'ready':
        return 'Připojeno k Supabase';
      case 'error':
        return 'Chyba připojení';
      case 'disabled':
      default:
        return 'Multiplayer vypnutý';
    }
  }, [multiplayerStatus]);


  useEffect(() => {
    if (!useManualEntry) return;
    setManualRows((rows) => (rows.length === 0 ? [createEmptyRow(gameState.week)] : rows));
  }, [useManualEntry, gameState.week]);


  const handleApplyCsv = () => {
    try {
      setError('');
      onApplyCsv(csvData);
      setCsvData('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Neznámá chyba při zpracování CSV.');
      }
    }
  };

  const openPreview = () => {
    window.open('/preview.html', 'nfl-conquest-preview', 'width=1320,height=860');
  };

  const openAsset = (url: string, name: string) => {
    window.open(url, name, 'noopener');
  };

  const handleExportRegions = async () => {
    const json = onExportRegions();
    setExportValue(json);
    setExportVisible(true);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(json);
        setExportMessage('Souřadnice zkopírovány do schránky.');
        return;
      }
    } catch (error) {
      console.warn('Clipboard write failed', error);
    }
    setExportMessage('Zkopíruj obsah pole ručně.');
  };

  const handleCloseExport = () => {
    setExportVisible(false);
    setExportMessage(null);
  };


  const handleManualRowChange = (rowId: string, updates: Partial<ManualRow>) => {
    setManualRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  };

  const handleAddManualRow = () => {
    setManualRows((rows) => [...rows, createEmptyRow(gameState.week)]);
  };

  const handleRemoveManualRow = (rowId: string) => {
    setManualRows((rows) => {
      if (rows.length === 1) {
        return [createEmptyRow(gameState.week)];
      }
      return rows.filter((row) => row.id !== rowId);
    });
  };

  const manualRowsValid = manualRows.every(
    (row) =>
      row.winner &&
      row.winnerScore.trim() !== '' &&
      row.loser &&
      row.loserScore.trim() !== '' &&
      row.winner !== row.loser &&
      !isNaN(parseInt(row.winnerScore, 10)) &&
      !isNaN(parseInt(row.loserScore, 10)) &&
      parseInt(row.winnerScore, 10) >= 0 &&
      parseInt(row.loserScore, 10) >= 0 &&
      parseInt(row.winnerScore, 10) !== parseInt(row.loserScore, 10),
  );

  const manualRowsToCsv = () => {
    const header = 'week,winner,loser,margin,isPlayoff,isSuperBowl';
    const lines = manualRows.map((row) => {
      const firstScore = parseInt(row.winnerScore);
      const secondScore = parseInt(row.loserScore);
      const firstWon = firstScore > secondScore;
      const margin = Math.abs(firstScore - secondScore);
      const parts = [
        gameState.week.toString(),
        firstWon ? row.winner : row.loser,
        firstWon ? row.loser : row.winner,
        margin.toString(),
        row.phase !== 'regular' ? 'true' : 'false',
        row.phase === 'superbowl' ? 'true' : 'false',
      ];
      return parts.join(',');
    });
    return [header, ...lines].join('\n');
  };

  const handleApplyManualRows = () => {
    if (!manualRowsValid) {
      setError(`Zkontroluj týmy a skóre pro týden ${gameState.week}. Remízu zatím nelze zapsat.`);
      return;
    }

    const csv = manualRowsToCsv();
    try {
      setError('');
      onApplyCsv(csv);
      setManualRows([createEmptyRow(gameState.week)]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Neznámá chyba při zpracování ručních výsledků.');
      }
    }
  };


  return (
    <div className="control-panel">
      <div className="control-panel-heading">
        <div>
          <p className="eyebrow">SEZÓNA · TÝDEN {gameState.week}</p>
          <h3>Centrum hry</h3>
        </div>
        <button onClick={openPreview} className="secondary-button">Otevřít projekci</button>
      </div>

      <details className="admin-disclosure multiplayer-status-card">
        <summary className="multiplayer-header">
          <span><i className={`status-dot ${multiplayerStatus}`} aria-hidden="true" /> Připojení</span>
          <strong>{multiplayerStatusLabel}</strong>
        </summary>
        {isMultiplayerEnabled ? (
          <div className="multiplayer-body">
            {multiplayerError && <div className="error-message">{multiplayerError}</div>}
            {isHost && (
              <>
                <button type="button" onClick={onReset} className="reset-btn" style={{ marginTop: '0.5rem' }}>
                  Nová hra
                </button>
                <button type="button" onClick={onResetSession} className="reset-btn" style={{ marginTop: '0.5rem' }}>
                  Vymazat online relaci
                </button>
                {gameState.players.length > 0 && (
                  <>
                    <div className="player-selection-row" style={{ marginTop: '1rem' }}>
                      <span>Přiřadit mně:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {gameState.players.map((player) => (
                          <label key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={player.userId === username}
                              onChange={(e) => onAssignPlayer(player.id, e.target.checked ? username : undefined)}
                            />
                            <span className="color-dot" style={{ backgroundColor: player.color }} />
                            {player.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    {userPlayerIds.length > 0 && (
                      <div className="player-names-row" style={{ marginTop: '0.5rem' }}>
                        <span>Moje jména:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {userPlayerIds.map((playerId) => {
                            const player = gameState.players.find((p) => p.id === playerId);
                            return (
                              <input
                                key={playerId}
                                type="text"
                                value={player?.name ?? ''}
                                onChange={(e) => onUpdatePlayerName(playerId, e.target.value)}
                                maxLength={20}
                                placeholder={`Player ${playerId}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="player-management" style={{ marginTop: '1rem' }}>
                      <h4>Správa hráčů</h4>
                      {gameState.players.map((player) => (
                        <div key={player.id} className="player-manage-row" style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span className="color-dot" style={{ backgroundColor: player.color }} />
                            <input
                              type="text"
                              value={player.name}
                              onChange={(e) => onUpdatePlayerName(player.id, e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <select
                              value={player.userId || ''}
                              onChange={(e) => {
                                const newUserId = e.target.value || undefined;
                                onAssignPlayer(player.id, newUserId);
                              }}
                            >
                              <option value="">Nepřiřazeno</option>
                              {gameState.connectedUsers.map((user) => (
                                <option key={user} value={user}>
                                  {user}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => onRemovePlayer(player.id)}>Odebrat</button>
                          </div>
                          <div className="player-teams">
                            {(() => {
                              const ownedTeams = Object.entries(gameState.ownership)
                                .filter(([, owner]) => owner === player.id)
                                .map(([teamId]) => teamId as TeamId);
                              return (
                                <>
                                  <strong>Týmy ({ownedTeams.length}):</strong>
                                  <div className="player-team-list">
                                    {ownedTeams.map((teamId) => (
                                      <label key={teamId} className="player-team-item">
                                        <input
                                          type="checkbox"
                                          checked={(selectedTeamsToRemove[player.id] || []).includes(teamId)}
                                          onChange={(e) => {
                                            setSelectedTeamsToRemove((prev) => {
                                              const current = prev[player.id] || [];
                                              if (e.target.checked) {
                                                return { ...prev, [player.id]: [...current, teamId] };
                                              } else {
                                                return { ...prev, [player.id]: current.filter((id) => id !== teamId) };
                                              }
                                            });
                                          }}
                                        />
                                        <span>{teamId}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const teams = selectedTeamsToRemove[player.id] || [];
                                      if (teams.length > 0) {
                                        onRemoveTeams(player.id, teams);
                                        setSelectedTeamsToRemove((prev) => ({ ...prev, [player.id]: [] }));
                                      }
                                    }}
                                    disabled={(selectedTeamsToRemove[player.id] || []).length === 0}
                                    style={{ marginTop: '0.25rem' }}
                                  >
                                    Odebrat označené týmy
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="multiplayer-body">
            <p>Supabase není nakonfigurováno, multiplayer zůstává jen lokální.</p>
          </div>
        )}
      </details>

      <div className="week-info">
        <div><span className="section-number">01</span><strong>Aktuální týden</strong></div>
        {isHost ? (
          <>
            <input
              type="number"
              value={gameState.week}
              onChange={(e) => onSetWeek(parseInt(e.target.value) || 1)}
              min={1}
              aria-label="Aktuální týden"
            />
            <button onClick={() => onSetWeek(gameState.week + 1)} className="primary-button">
              Další týden →
            </button>
          </>
        ) : (
          gameState.week
        )}
      </div>

      <div className="season-toolbar">
      <div className="view-mode-section" aria-label="Zobrazení herní mapy">
        <span className="section-label">Zobrazení</span>
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => onChangeViewMode('map')}
          >
            Mapa
          </button>
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => onChangeViewMode('grid')}
          >
            Mřížka
          </button>
        </div>
      </div>

      <div className="team-jump">
        <span className="section-label">Detail týmu</span>
        <select
          aria-label="Rychlý výběr týmu"
          value={selectedTeamId ?? ''}
          onChange={(event) => onSelectTeam(event.target.value ? (event.target.value as TeamId) : null)}
        >
          <option value="">— žádný —</option>
          {[...NFL_TEAMS].sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`)).map((team) => (
            <option key={team.id} value={team.id}>
              {team.city} {team.name}
            </option>
          ))}
        </select>
      </div>
      </div>

      {(selectedTeamId || highlightPlayerId) && (
        <div className="selection-info">
          {selectedTeamId && (
            <span>
              Vybraný tým: <strong>{selectedTeamId}</strong>
            </span>
          )}
          {highlightPlayerId && (
            <span>
              Zvýrazněný hráč: <strong>{highlightedPlayerName ?? highlightPlayerId}</strong>
            </span>
          )}
          <div className="selection-actions">
            {selectedTeamId && (
              <button type="button" onClick={() => onSelectTeam(null)}>
                Zrušit výběr
              </button>
            )}
            {highlightPlayerId && (
              <button type="button" onClick={onClearHighlight}>
                Zrušit zvýraznění
              </button>
            )}
          </div>
        </div>
      )}

      {isHost && (
        <details className="admin-disclosure asset-links">
        <summary>Podklady mapy</summary>
        <div className="asset-buttons">
          <button type="button" onClick={() => openAsset(maskPreviewUrl, 'nfl-conquest-mask')}>
            Náhled masky (SVG)
          </button>
          <button type="button" onClick={() => openAsset(maskTemplateUrl, 'nfl-mask-template')}>
            Otevřít šablonu masky
          </button>
          <button type="button" onClick={() => openAsset(teamGridAssetUrl, 'nfl-team-grid')}>
            Otevřít týmovou mřížku
          </button>
        </div>
      </details>
      )}

      {isHost && (
        <details className="admin-disclosure csv-section">
          <summary>Importovat výsledky přes CSV</summary>
          <label htmlFor="csv-input">CSV data</label>
          <textarea
            id="csv-input"
            value={csvData}
            onChange={(event) => setCsvData(event.target.value)}
            placeholder={
              'week,winner,loser,margin,isPlayoff,isSuperBowl\n1,KC,CIN,7,false,false\n1,SF,DAL,10,false,false'
            }
            rows={6}
            aria-label="CSV výsledky zápasů"
          />
          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              onClick={handleApplyCsv}
              disabled={!csvData.trim()}
              aria-label={`Použít CSV výsledky pro týden ${gameState.week}`}
            >
              Zapsat výsledky týdne {gameState.week}
            </button>
          </div>
        </details>
      )}

      {isHost && (
         <div className="manual-results">
          <div className="results-heading">
            <div>
              <span className="section-number">02</span>
              <div><h4>Výsledky zápasů</h4><p>Zapiš odehrané zápasy a mapa se okamžitě přepočítá.</p></div>
            </div>
          <button
            type="button"
            className="toggle-manual-btn"
            onClick={() => {
              setUseManualEntry((value) => {
                if (!value && manualRows.length === 0) {
                  setManualRows([createEmptyRow(gameState.week)]);
                }
                return !value;
              });
            }}
          >
            {useManualEntry ? 'Skrýt ruční zadání' : 'Přidat zápasy ručně'}
          </button>
          </div>

          {useManualEntry && (
            <div className="manual-results-table-wrapper">
              <table className="manual-results-table">
                <thead>
                  <tr>
                    <th>Tým A</th>
                    <th>Skóre</th>
                    <th>Tým B</th>
                    <th>Skóre</th>
                    <th>Fáze</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <select
                          value={row.winner}
                          onChange={(event) => handleManualRowChange(row.id, { winner: event.target.value as TeamId })}
                        >
                          <option value="">— vyber —</option>
                          {[...NFL_TEAMS].sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`)).map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.city} {team.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={row.winnerScore}
                          onChange={(event) => handleManualRowChange(row.id, { winnerScore: event.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={row.loser}
                          onChange={(event) => handleManualRowChange(row.id, { loser: event.target.value as TeamId })}
                        >
                          <option value="">— vyber —</option>
                          {[...NFL_TEAMS].sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`)).map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.city} {team.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={row.loserScore}
                          onChange={(event) => handleManualRowChange(row.id, { loserScore: event.target.value })}
                        />
                      </td>
                      <td>
                        <select value={row.phase} onChange={(event) => handleManualRowChange(row.id, { phase: event.target.value as ManualRow['phase'] })}>
                          <option value="regular">Základní část</option>
                          <option value="playoff">Playoff</option>
                          <option value="superbowl">Super Bowl</option>
                        </select>
                      </td>
                      <td>
                        <button type="button" onClick={() => handleRemoveManualRow(row.id)}>
                          Odebrat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="manual-results-actions">
                <button type="button" onClick={handleAddManualRow}>
                  + Přidat zápas
                </button>
                <button type="button" onClick={handleApplyManualRows} disabled={!manualRowsValid}>
                  Zapsat zápasy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isHost && (
        <details className="admin-disclosure admin-tools">
        <summary>Pokročilá správa mapy</summary>
        <div className="admin-actions">
          <button type="button" className={isAdminMode ? 'active' : ''} onClick={onToggleAdmin}>
            {isAdminMode ? 'Ukončit úpravy mapy' : 'Upravit pozice týmů'}
          </button>
          <button type="button" onClick={handleExportRegions}>
            Exportovat souřadnice
          </button>
          <button type="button" onClick={onResetRegions}>
            Obnovit výchozí rozložení
          </button>
        </div>
        <p className="admin-hint">
          V režimu úprav přetáhni myší kroužky na mapě. Souřadnice se ukládají do prohlížeče.
        </p>
        {exportVisible && (
          <div className="export-panel">
            <div className="export-header">
              <strong>Souřadnice týmů</strong>
              <button type="button" onClick={handleCloseExport}>Zavřít</button>
            </div>
            <textarea value={exportValue} onChange={(event) => setExportValue(event.target.value)} rows={8} readOnly />
            {exportMessage && <div className="export-message">{exportMessage}</div>}
          </div>
        )}
      </details>
      )}

      <div className="log-section">
        <div className="results-heading">
          <div><span className="section-number">03</span><div><h4>Průběh hry</h4><p>Poslední změny vlastnictví území.</p></div></div>
        </div>
        <div className="game-log">
          {gameState.log.length === 0 && <div className="empty-log">Zatím se nic nestalo.</div>}
          {gameState.log.slice(-10).reverse().map((entry, index) => (
            <div key={index} className="log-entry">
              <span>{String(gameState.log.length - index).padStart(2, '0')}</span>{entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

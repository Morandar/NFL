import { useEffect, useMemo, useState } from 'react';
import { GameState, TeamId } from '../state/types';
import maskTemplateUrl from '../assets/nfl_map_mask_template.svg?url';
import maskPreviewUrl from '../assets/nfl_map_mask.svg?url';
import teamGridAssetUrl from '../assets/nfl_team_grid.svg?url';
import { NFL_TEAMS } from '../data/nflTeams';
import type { MultiplayerStatus } from '../hooks/useSupabaseSync';

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
  sessionId: string | null;
  multiplayerStatus: MultiplayerStatus;
  multiplayerError: string | null;
  isMultiplayerEnabled: boolean;
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
  sessionId,
  multiplayerStatus,
  multiplayerError,
  isMultiplayerEnabled,
}: ControlPanelProps) {
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState('');
  const [exportVisible, setExportVisible] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportValue, setExportValue] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  type ManualRow = {
    id: string;
    week: string;
    winner: TeamId | '';
    loser: TeamId | '';
    margin: string;
    isPlayoff: boolean;
    isSuperBowl: boolean;
  };

  const createEmptyRow = (week: number): ManualRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    week: week.toString(),
    winner: '',
    loser: '',
    margin: '',
    isPlayoff: false,
    isSuperBowl: false,
  });

  const [manualRows, setManualRows] = useState<ManualRow[]>([createEmptyRow(gameState.week)]);
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

  const shareUrl = useMemo(() => {
    if (!sessionId || typeof window === 'undefined') {
      return null;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    return url.toString();
  }, [sessionId]);

  useEffect(() => {
    if (!useManualEntry) return;
    setManualRows((rows) => (rows.length === 0 ? [createEmptyRow(gameState.week)] : rows));
  }, [useManualEntry, gameState.week]);

  useEffect(() => {
    if (!shareFeedback) return;
    const timeout = window.setTimeout(() => setShareFeedback(null), 3500);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [shareFeedback]);

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

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Odkaz zkopírován do schránky.');
        return;
      }
    } catch (copyError) {
      console.warn('Clipboard write failed', copyError);
    }
    setShareFeedback('Zkopíruj odkaz ručně z pole níže.');
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
      row.week.trim() !== '' &&
      row.winner &&
      row.loser &&
      row.winner !== row.loser,
  );

  const manualRowsToCsv = () => {
    const header = 'week,winner,loser,margin,isPlayoff,isSuperBowl';
    const lines = manualRows.map((row) => {
      const parts = [
        row.week.trim(),
        row.winner,
        row.loser,
        row.margin.trim(),
        row.isPlayoff ? 'true' : 'false',
        row.isSuperBowl ? 'true' : 'false',
      ];
      return parts.join(',');
    });
    return [header, ...lines].join('\n');
  };

  const handleApplyManualRows = () => {
    if (!manualRowsValid) {
      setError('Vyplň týden, vítěze a poraženého u každého zápasu.');
      return;
    }

    const csv = manualRowsToCsv();
    try {
      setError('');
      onApplyCsv(csv);
      setUseManualEntry(false);
      setManualRows([createEmptyRow(gameState.week + 1)]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Neznámá chyba při zpracování ručních výsledků.');
      }
    }
  };

  const handleLoadCsvIntoTable = () => {
    if (!csvData.trim()) return;
    const lines = csvData.trim().split('\n');
    if (!lines.length) return;
    const header = lines[0].toLowerCase();
    if (!header.startsWith('week')) {
      setError('CSV neobsahuje očekávanou hlavičku.');
      return;
    }

    const parsed: ManualRow[] = lines
      .slice(1)
      .map((line) => line.split(',').map((part) => part.trim()))
      .filter((parts) => parts.length >= 3)
      .map((parts) => {
        const [week, winner, loser, margin = '', isPlayoff = 'false', isSuperBowl = 'false'] = parts;
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          week: week || gameState.week.toString(),
          winner: (winner as TeamId) || '',
          loser: (loser as TeamId) || '',
          margin,
          isPlayoff: isPlayoff === 'true',
          isSuperBowl: isSuperBowl === 'true',
        };
      });

    if (parsed.length === 0) {
      setError('CSV neobsahuje žádné platné řádky.');
      return;
    }

    setManualRows(parsed);
    setUseManualEntry(true);
    setError('');
  };

  return (
    <div className="control-panel">
      <h3>Control Panel</h3>

      <div className="multiplayer-status-card">
        <div className="multiplayer-header">
          <strong>Multiplayer:</strong> {multiplayerStatusLabel}
        </div>
        {isMultiplayerEnabled ? (
          <div className="multiplayer-body">
            <div className="session-row">
              <span>ID místnosti:</span>
              <code>{sessionId ?? '—'}</code>
            </div>
            {shareUrl && (
              <>
                <button type="button" onClick={handleCopyShareLink} disabled={multiplayerStatus !== 'ready'}>
                  Zkopírovat odkaz
                </button>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Odkaz pro sdílení relace"
                />
              </>
            )}
            {shareFeedback && <div className="info-message">{shareFeedback}</div>}
            {multiplayerError && <div className="error-message">{multiplayerError}</div>}
          </div>
        ) : (
          <div className="multiplayer-body">
            <p>Supabase není nakonfigurováno, multiplayer zůstává jen lokální.</p>
          </div>
        )}
      </div>

      <div className="week-info">
        <strong>Current Week:</strong> {gameState.week}
      </div>

      <div className="view-mode-section" aria-label="Map display mode selector">
        <span className="section-label">Vizualizace mapy:</span>
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => onChangeViewMode('map')}
          >
            Geografická mapa
          </button>
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => onChangeViewMode('grid')}
          >
            Týmová mřížka
          </button>
        </div>
      </div>

      <div className="team-jump">
        <span className="section-label">Rychlý výběr týmu:</span>
        <select
          value={selectedTeamId ?? ''}
          onChange={(event) => onSelectTeam(event.target.value ? (event.target.value as TeamId) : null)}
        >
          <option value="">— žádný —</option>
          {NFL_TEAMS.map((team) => (
            <option key={team.id} value={team.id}>
              {team.city} {team.name}
            </option>
          ))}
        </select>
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

      <div className="asset-links">
        <span className="section-label">Práce s podklady:</span>
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
      </div>

      <div className="csv-section">
        <label htmlFor="csv-input">CSV Data:</label>
        <textarea
          id="csv-input"
          value={csvData}
          onChange={(event) => setCsvData(event.target.value)}
          placeholder={
            'week,winner,loser,margin,isPlayoff,isSuperBowl\n1,KC,CIN,7,false,false\n1,SF,DAL,10,false,false'
          }
          rows={6}
          aria-label="CSV game results input"
        />
        {error && <div className="error-message">{error}</div>}

        <div className="button-group">
          <button
            onClick={handleApplyCsv}
            disabled={!csvData.trim()}
            aria-label="Apply CSV results for current week"
          >
            Apply CSV for Week {gameState.week}
          </button>
          <button
            type="button"
            onClick={handleLoadCsvIntoTable}
            disabled={!csvData.trim()}
          >
            Načíst CSV do tabulky
          </button>
          <button onClick={openPreview} aria-label="Open preview window">
            Open Preview
          </button>
          <button onClick={onReset} className="reset-btn" aria-label="Reset game">
            Reset to Setup
          </button>
        </div>
      </div>

      <div className="manual-results">
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

        {useManualEntry && (
          <div className="manual-results-table-wrapper">
            <table className="manual-results-table">
              <thead>
                <tr>
                  <th>Týden</th>
                  <th>Vítěz</th>
                  <th>Poražený</th>
                  <th>Margin</th>
                  <th>Playoff</th>
                  <th>Super Bowl</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={row.week}
                        onChange={(event) => handleManualRowChange(row.id, { week: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={row.winner}
                        onChange={(event) => handleManualRowChange(row.id, { winner: event.target.value as TeamId })}
                      >
                        <option value="">— vyber —</option>
                        {NFL_TEAMS.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.city} {team.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.loser}
                        onChange={(event) => handleManualRowChange(row.id, { loser: event.target.value as TeamId })}
                      >
                        <option value="">— vyber —</option>
                        {NFL_TEAMS.map((team) => (
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
                        value={row.margin}
                        onChange={(event) => handleManualRowChange(row.id, { margin: event.target.value })}
                      />
                    </td>
                    <td className="manual-checkbox">
                      <input
                        type="checkbox"
                        checked={row.isPlayoff}
                        onChange={(event) => handleManualRowChange(row.id, { isPlayoff: event.target.checked })}
                      />
                    </td>
                    <td className="manual-checkbox">
                      <input
                        type="checkbox"
                        checked={row.isSuperBowl}
                        onChange={(event) => handleManualRowChange(row.id, { isSuperBowl: event.target.checked })}
                      />
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

      <div className="admin-tools">
        <span className="section-label">Admin Tools</span>
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
      </div>

      <div className="log-section">
        <h4>Game Log</h4>
        <div className="game-log">
          {gameState.log.slice(-10).map((entry, index) => (
            <div key={index} className="log-entry">
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

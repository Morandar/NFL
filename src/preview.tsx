import { useState, useEffect, StrictMode, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { MapBoard } from './components/MapBoard';
import { StandingsCard } from './components/StandingsCard';
import { TeamGrid } from './components/TeamGrid';
import { loadState } from './state/persistence';
import { GameState, TeamId } from './state/types';
import { DEFAULT_MAP_REGIONS } from './data/mapRegions';
import type { MapRegion } from './data/mapRegions';
import { loadStoredRegions } from './data/regionStorage';
import './styles.css';

function PreviewApp() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId | null>(null);
  const [highlightPlayerId, setHighlightPlayerId] = useState<string | null>(null);
  const [mapRegions, setMapRegions] = useState<MapRegion[]>(loadStoredRegions());

  useEffect(() => {
    const loadCurrentState = () => {
      const state = loadState();
      setGameState(state);
      setMapRegions(loadStoredRegions());
    };

    loadCurrentState();

    const interval = setInterval(loadCurrentState, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectTeam = useCallback((teamId: TeamId | null) => {
    setSelectedTeamId((current) => {
      if (teamId === null) return null;
      return current === teamId ? null : teamId;
    });

    if (!gameState) return;
    if (!teamId) {
      setHighlightPlayerId(null);
      return;
    }
    const ownerId = gameState.ownership[teamId];
    setHighlightPlayerId(ownerId ?? null);
  }, [gameState]);

  if (!gameState) {
    return (
      <div className="preview-loading">
        <h1>NFL Conquest Map - Preview</h1>
        <p>Waiting for game data...</p>
      </div>
    );
  }

  return (
    <div className="preview-app">
      <header className="preview-header">
        <h1>NFL Conquest Map - Week {gameState.week}</h1>
      </header>

      <main className="preview-content">
        <div className="preview-map">
          <MapBoard
            gameState={gameState}
            viewMode="map"
            selectedTeamId={selectedTeamId}
            highlightPlayerId={highlightPlayerId}
            regions={mapRegions.length ? mapRegions : DEFAULT_MAP_REGIONS}
            isEditing={false}
            onSelectTeam={handleSelectTeam}
            onUpdateRegion={() => undefined}
            onHighlightPlayer={(playerId) => setHighlightPlayerId(playerId)}
          />
        </div>

        <div className="preview-side">
          <div className="preview-standings">
            <StandingsCard gameState={gameState} />
          </div>
          <div className="preview-grid">
            <TeamGrid
              gameState={gameState}
              showHint={false}
              selectedTeamId={selectedTeamId}
              highlightPlayerId={highlightPlayerId}
              onSelectTeam={(teamId) => handleSelectTeam(teamId)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

const style = document.createElement('style');
style.textContent = `
  .preview-app {
    min-height: 100vh;
    background-color: #0f1115;
    color: #e0e0e0;
  }

  .preview-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: #0f1115;
    color: #e0e0e0;
  }

  .preview-header {
    background-color: #08090c;
    padding: 1.25rem 2rem;
    border-bottom: 2px solid #1f2430;
    text-align: center;
  }

  .preview-header h1 {
    font-size: 2.5rem;
    margin: 0;
  }

  .preview-content {
    display: flex;
    gap: 2rem;
    padding: 2rem;
    max-width: 1800px;
    margin: 0 auto;
  }

  .preview-map {
    flex: 3;
  }

  .preview-side {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .preview-grid .team-grid {
    background: rgba(15, 17, 21, 0.75);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #222;
  }

  .preview-grid .team-grid-svg {
    width: 100%;
    min-height: 320px;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('preview-root')!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
);

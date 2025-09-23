import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { GameState, Player, Settings, TeamId } from './state/types';
import { saveState, loadState, clearState } from './state/persistence';
import { SetupPanel } from './components/SetupPanel';
import { DraftBoard } from './components/DraftBoard';
import { MapBoard } from './components/MapBoard';
import { ControlPanel } from './components/ControlPanel';
import { StandingsCard } from './components/StandingsCard';
import { TeamOwnershipCard } from './components/TeamOwnershipCard';
import { Login } from './components/Login';
import { applyWeekResults } from './logic/conquest';
import { checkInstantWin } from './logic/endgame';
import { TEAM_COLORS } from './data/teamColors';
import { DEFAULT_MAP_REGIONS, MapRegion } from './data/mapRegions';
import { clearStoredRegions, loadStoredRegions, persistRegions } from './data/regionStorage';
import { NFL_TEAM_MAP } from './data/nflTeams';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { getSupabaseClient } from './lib/supabaseClient';
import './styles.css';

const initialState: GameState = {
  phase: 'setup',
  players: [],
  draftOrder: [],
  currentPickIndex: 0,
  snakeForward: true,
  ownership: {} as Record<TeamId, string | null>,
  week: 1,
  settings: {
    picksPerPlayer: 1,
    useMarginRules: false,
    playoffBoost: false,
    superBowlSweep: false,
    lockDivisionRule: false,
  },
  log: [],
};

const TEAM_IDS: TeamId[] = [
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LV',
  'LAC',
  'LAR',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WAS',
];

function createEmptyOwnership(): Record<TeamId, string | null> {
  return TEAM_IDS.reduce((acc, id) => {
    acc[id] = null;
    return acc;
  }, {} as Record<TeamId, string | null>);
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState>(() => {
    const loaded = loadState();
    if (loaded) {
      return {
        ...loaded,
        players: loaded.players.map((player) => ({
          ...player,
          homeTeamId: player.homeTeamId ?? player.teamsOwned[0] ?? null,
        })),
        settings: {
          ...loaded.settings,
          lockDivisionRule: loaded.settings.lockDivisionRule ?? false,
        },
      };
    }

    return { ...initialState, ownership: createEmptyOwnership() };
  });
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId | null>(null);
  const [highlightPlayerId, setHighlightPlayerId] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentUserPlayerId, setCurrentUserPlayerId] = useState<string | null>(null);
  const [mapRegions, setMapRegions] = useState<MapRegion[]>(() => loadStoredRegions());

  const client = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [client]);

  const { sessionId, status: multiplayerStatus, error: multiplayerError, isEnabled: isMultiplayerEnabled } = useSupabaseSync(
    gameState,
    setGameState,
  );

  useEffect(() => {
    saveState(gameState);
  }, [gameState]);

  useEffect(() => {
    persistRegions(mapRegions);
  }, [mapRegions]);

  const handleStartDraft = (players: Player[], settings: Settings) => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const draftOrder: string[] = [];

    for (let round = 0; round < settings.picksPerPlayer; round++) {
      if (round % 2 === 0) {
        draftOrder.push(...shuffled.map((player) => player.id));
      } else {
        draftOrder.push(...shuffled.map((player) => player.id).reverse());
      }
    }

    setGameState({
      ...gameState,
      phase: 'draft',
      players,
      draftOrder,
      settings,
      currentPickIndex: 0,
      snakeForward: true,
      log: ['Draft started!'],
    });
  };

  const handleSelectTeam = useCallback(
    (teamId: TeamId | null) => {
      setSelectedTeamId((current) => {
        const next = teamId === null ? null : current === teamId ? null : teamId;
        const nextOwner = next ? gameState.ownership[next] ?? null : null;
        setHighlightPlayerId(nextOwner);
        return next;
      });
    },
    [gameState.ownership],
  );

  const handleToggleHighlight = useCallback((playerId: string | null) => {
    if (!playerId) {
      setHighlightPlayerId(null);
      return;
    }
    setHighlightPlayerId((current) => (current === playerId ? null : playerId));
  }, []);

  const handleUpdateRegion = useCallback((teamId: TeamId, updates: Partial<MapRegion>) => {
    setMapRegions((current) =>
      current.map((region) =>
        region.id === teamId
          ? { ...region, ...updates }
          : region,
      ),
    );
  }, []);

  const handlePickTeam = (teamId: TeamId) => {
    const { players, draftOrder, currentPickIndex } = gameState;
    const currentPlayerId = draftOrder[currentPickIndex];
    const playerIndex = players.findIndex((player) => player.id === currentPlayerId);

    if (playerIndex === -1) return;

    const updatedPlayers = [...players];
    const player = updatedPlayers[playerIndex];

    if (gameState.settings.lockDivisionRule) {
      const teamMeta = NFL_TEAM_MAP[teamId];
      if (teamMeta) {
        const conflictingTeamId = player.teamsOwned.find((ownedId) => {
          const ownedMeta = NFL_TEAM_MAP[ownedId];
          return (
            ownedMeta &&
            ownedMeta.division === teamMeta.division &&
            ownedMeta.conference === teamMeta.conference
          );
        });

        if (conflictingTeamId) {
          const conflictingMeta = NFL_TEAM_MAP[conflictingTeamId];
          setGameState({
            ...gameState,
            log: [
              ...gameState.log,
              `${player.name} nemůže draftovat ${teamMeta.city} ${teamMeta.name} (stejná divize jako ${conflictingMeta?.city ?? conflictingTeamId}).`,
            ],
          });
          return;
        }
      }
    }

    if (player.teamsOwned.length === 0) {
      player.color = TEAM_COLORS[teamId];
      player.homeTeamId = teamId;
    }

    player.teamsOwned.push(teamId);

    const newOwnership = { ...gameState.ownership, [teamId]: currentPlayerId };
    const totalPicks = players.length * gameState.settings.picksPerPlayer;
    const nextIndex = currentPickIndex + 1;
    const draftComplete = nextIndex >= totalPicks;

    setGameState({
      ...gameState,
      players: updatedPlayers,
      ownership: newOwnership,
      currentPickIndex: nextIndex,
      phase: draftComplete ? 'season' : 'draft',
      log: [...gameState.log, `${player.name} drafted ${teamId}`],
    });
  };

  const handleApplyCsv = (csv: string) => {
    const newState = applyWeekResults(gameState, csv);

    const winner = checkInstantWin(newState);
    if (winner) {
      newState.log.push(`🏆 ${winner} has won by controlling 90% of the map!`);
    }

    setGameState(newState);
  };

  const handleReset = () => {
    clearState();
    const resetPlayers = gameState.players.map((player) => ({
      ...player,
      teamsOwned: [],
      homeTeamId: null,
    }));
    setGameState({
      ...initialState,
      players: resetPlayers,
      ownership: createEmptyOwnership(),
    });
    setViewMode('map');
    setSelectedTeamId(null);
    setHighlightPlayerId(null);
  };

  const handleResetRegions = () => {
    setMapRegions(DEFAULT_MAP_REGIONS);
    clearStoredRegions();
  };

  const handleUpdatePlayerName = (playerId: string, name: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
    }));
  };

  const highlightedPlayer = highlightPlayerId
    ? gameState.players.find((player) => player.id === highlightPlayerId)
    : undefined;

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>NFL Conquest Map</h1>
        <div className="user-info">
          <span>Přihlášen: {user.email}</span>
          <button onClick={() => client?.auth.signOut()}>Odhlásit</button>
        </div>
      </header>

      <main className="app-content">
        {gameState.phase === 'setup' && <SetupPanel onStartDraft={handleStartDraft} />}

        {gameState.phase === 'draft' && (
           <DraftBoard gameState={gameState} onPickTeam={handlePickTeam} currentUserPlayerId={currentUserPlayerId} />
         )}

        {gameState.phase === 'season' && (
          <div className="season-layout">
            <div className="main-content">
              <MapBoard
                gameState={gameState}
                viewMode={viewMode}
                selectedTeamId={selectedTeamId}
                highlightPlayerId={highlightPlayerId}
                regions={mapRegions}
                isEditing={isAdminMode}
                onSelectTeam={handleSelectTeam}
                onUpdateRegion={handleUpdateRegion}
                onHighlightPlayer={handleToggleHighlight}
              />
              <ControlPanel
                gameState={gameState}
                viewMode={viewMode}
                selectedTeamId={selectedTeamId}
                highlightPlayerId={highlightPlayerId}
                highlightedPlayerName={highlightedPlayer?.name ?? null}
                isAdminMode={isAdminMode}
                onToggleAdmin={() => setIsAdminMode((value) => !value)}
                onChangeViewMode={setViewMode}
                onSelectTeam={handleSelectTeam}
                onApplyCsv={handleApplyCsv}
                onReset={handleReset}
                onClearHighlight={() => setHighlightPlayerId(null)}
                onExportRegions={() => JSON.stringify(mapRegions, null, 2)}
                onResetRegions={handleResetRegions}
                sessionId={sessionId}
                multiplayerStatus={multiplayerStatus}
                multiplayerError={multiplayerError}
                isMultiplayerEnabled={isMultiplayerEnabled}
                currentUserPlayerId={currentUserPlayerId}
                onSetCurrentUserPlayerId={setCurrentUserPlayerId}
                onUpdatePlayerName={handleUpdatePlayerName}
              />
            </div>
            <aside className="sidebar">
              <StandingsCard gameState={gameState} />
              <TeamOwnershipCard
                gameState={gameState}
                teamId={selectedTeamId}
                highlightPlayerId={highlightPlayerId}
                onSelectTeam={handleSelectTeam}
                onToggleHighlight={handleToggleHighlight}
              />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

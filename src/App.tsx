import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Settings, TeamId } from './state/types';
import { saveState, loadState, clearState } from './state/persistence';
import { SetupPanel } from './components/SetupPanel';
import { DraftBoard } from './components/DraftBoard';
import { MapBoard } from './components/MapBoard';
import { ControlPanel } from './components/ControlPanel';
import { StandingsCard } from './components/StandingsCard';
import { TeamOwnershipCard } from './components/TeamOwnershipCard';
import { Login } from './components/Login';
import { JoinScreen } from './components/JoinScreen';
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
  hostId: null,
  connectedUsers: [],
  messages: [],
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
  const [username, setUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nfl-username') || null;
    } catch {
      return null;
    }
  });
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
  const [chatMessage, setChatMessage] = useState('');
  const [mapRegions, setMapRegions] = useState<MapRegion[]>(() => loadStoredRegions());

  const handleLogin = (name: string) => {
    setUsername(name);
    localStorage.setItem('nfl-username', name);
    // Add to connected users if not already
    setGameState(prev => ({
      ...prev,
      connectedUsers: prev.connectedUsers.includes(name) ? prev.connectedUsers : [...prev.connectedUsers, name]
    }));
  };

  const handleSendMessage = (text: string) => {
    if (!username || !text.trim()) return;
    setGameState(prev => ({
      ...prev,
      messages: [...prev.messages, { user: username, text: text.trim(), timestamp: new Date().toISOString() }]
    }));
  };

  const sendMessage = () => {
    if (chatMessage.trim()) {
      handleSendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };

  useEffect(() => {
    if (gameState.hostId === null && username && gameState.players.length === 0) {
      setGameState(prev => ({...prev, hostId: username}));
    }
  }, [gameState.hostId, username, gameState.players.length]);

  useEffect(() => {
    if (username) {
      const myPlayer = gameState.players.find(p => p.userId === username);
      setCurrentUserPlayerId(myPlayer?.id || null);
    } else {
      setCurrentUserPlayerId(null);
    }
  }, [username, gameState.players]);

  const { sessionId, status: multiplayerStatus, error: multiplayerError, isEnabled: isMultiplayerEnabled } = useSupabaseSync(
    gameState,
    setGameState,
  );

  const isHost = username && gameState.connectedUsers[0] === username;

  useEffect(() => {
    saveState(gameState);
  }, [gameState]);

  useEffect(() => {
    persistRegions(mapRegions);
  }, [mapRegions]);

  const handleAddPlayers = (players: Player[], settings: Settings) => {
    setGameState(prev => ({
      ...prev,
      players,
      settings,
    }));
  };

  const handleStartDraft = () => {
    const players = gameState.players;
    const settings = gameState.settings;
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

  const handleSetWeek = (week: number) => {
    setGameState((prev) => ({ ...prev, week }));
  };

  const handleRemovePlayer = (playerId: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));
  };

  const handleUpdatePlayerName = (playerId: string, name: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
    }));
  };

  const handleReset = () => {
    clearState();
    setGameState({
      ...initialState,
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

  const handleResetSession = async () => {
    if (sessionId) {
      // @ts-ignore
      await getSupabaseClient().from('game_sessions').delete().eq('id', sessionId);
    }
    setGameState(initialState);
    setCurrentUserPlayerId(null);
    setViewMode('map');
    setSelectedTeamId(null);
    setHighlightPlayerId(null);
  };


  const handleClaimPlayer = (playerId: string) => {
    if (!username) return;
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, name: username, userId: username } : p)),
    }));
  };

  const highlightedPlayer = highlightPlayerId
    ? gameState.players.find((player) => player.id === highlightPlayerId)
    : undefined;

  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>NFL Conquest Map</h1>
        <div className="user-info">
          <span>Přihlášen: {username}</span>
          <button onClick={() => {
            setUsername(null);
            localStorage.removeItem('nfl-username');
          }}>Odhlásit</button>
        </div>
      </header>

      <main className="app-content">
        {gameState.phase === 'setup' && gameState.players.length === 0 && isHost && <SetupPanel onAddPlayers={handleAddPlayers} />}
        {gameState.phase === 'setup' && gameState.players.length === 0 && !isHost && (
          <div className="waiting-screen">
            <h2>Čekání na hosta</h2>
            <p>Host připravuje hru...</p>
            <div className="connected-users">
              <h3>Připojení uživatelé: {gameState.connectedUsers.join(', ')}</h3>
            </div>
            <div className="chat-section">
              <h3>Chat</h3>
              <div className="chat-messages">
                {gameState.messages.slice(-10).map((msg, index) => (
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
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Napiš zprávu..."
                  maxLength={200}
                />
                <button onClick={sendMessage} disabled={!chatMessage.trim()}>
                  Odeslat
                </button>
              </div>
            </div>
          </div>
        )}
        {gameState.phase === 'setup' && gameState.players.length > 0 && (
          <JoinScreen
            players={gameState.players}
            onClaimPlayer={handleClaimPlayer}
            isHost={!!isHost}
            allClaimed={gameState.players.every(p => p.userId)}
            onStartDraft={handleStartDraft}
            connectedUsers={gameState.connectedUsers}
            assignedUsers={gameState.players.filter(p => p.userId).map(p => p.userId!)}
            onAssignPlayer={handleClaimPlayer}
            onRemovePlayer={handleRemovePlayer}
            messages={gameState.messages}
            onSendMessage={handleSendMessage}
          />
        )}

        {gameState.phase === 'draft' && (
            <DraftBoard gameState={gameState} onPickTeam={handlePickTeam} currentUserPlayerId={currentUserPlayerId} isHost={!!isHost} onReset={handleReset} onRemovePlayer={handleRemovePlayer} />
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
                onResetSession={handleResetSession}
                onSetWeek={handleSetWeek}
                currentUserPlayerId={currentUserPlayerId}
                onSetCurrentUserPlayerId={setCurrentUserPlayerId}
                onUpdatePlayerName={handleUpdatePlayerName}
                onRemovePlayer={handleRemovePlayer}
                multiplayerStatus={multiplayerStatus}
                multiplayerError={multiplayerError}
                isMultiplayerEnabled={isMultiplayerEnabled}
                isHost={!!isHost}
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

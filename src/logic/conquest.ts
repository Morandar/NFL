import { GameState, ResultRow, TeamId } from '../state/types';

export function applyRow(state: GameState, row: ResultRow): GameState {
  const newState: GameState = {
    ...state,
    log: [...state.log],
    ownership: { ...state.ownership },
  };

  const winnerOwner = newState.ownership[row.winner];
  const loserOwner = newState.ownership[row.loser];
  const canTakeHomeTeam = row.isPlayoff || row.isSuperBowl;

  const isHomeProtected = (teamId: TeamId, ownerId: string | null) => {
    if (!ownerId) return false;
    const player = newState.players.find((p) => p.id === ownerId);
    if (!player) return false;
    if (player.homeTeamId && player.homeTeamId === teamId) {
      return !canTakeHomeTeam;
    }
    return false;
  };

  if (winnerOwner && loserOwner) {
    if (isHomeProtected(row.loser, loserOwner)) {
      newState.log.push(
        `${row.winner} beat ${row.loser}, ale ${row.loser} je domácí tým – nedošlo k převzetí (jen playoff/SB).`,
      );
    } else {
      newState.ownership[row.loser] = winnerOwner;
      newState.log.push(`${row.winner} beat ${row.loser} (captured 1 territory)`);
    }
  }

  if (!winnerOwner && loserOwner) {
    if (isHomeProtected(row.loser, loserOwner)) {
      newState.log.push(
        `${row.winner} (neutral) beat ${row.loser}, ale domácí tým zůstává v držení ${loserOwner}.`,
      );
    } else {
      newState.ownership[row.winner] = loserOwner;
      newState.log.push(`${row.winner} (neutral) beat ${row.loser}, maintaining ${loserOwner}'s control`);
    }
  }

  let extraCaptures = 0;

  if (state.settings.useMarginRules && row.margin && row.margin >= 8) {
    extraCaptures++;
  }

  if (state.settings.playoffBoost && row.isPlayoff) {
    extraCaptures++;
  }

  if (extraCaptures > 0 && winnerOwner) {
    const loserTerritories = getPlayerTerritories(newState, loserOwner || '');
    let captured = 0;

    for (const territory of loserTerritories) {
      if (captured >= extraCaptures) break;
      if (territory === row.loser) continue;
      if (isHomeProtected(territory, loserOwner)) continue;
      newState.ownership[territory] = winnerOwner;
      captured++;
    }

    if (captured > 0) {
      newState.log.push(`  + ${captured} extra capture(s) from margin/playoff rules`);
    }
  }

  if (state.settings.superBowlSweep && row.isSuperBowl && winnerOwner) {
    const loserTerritories = getPlayerTerritories(newState, loserOwner || '');
    for (const territory of loserTerritories) {
      newState.ownership[territory] = winnerOwner;
    }
    newState.log.push(`🏆 SUPER BOWL SWEEP! ${row.winner} captured ALL ${loserTerritories.length} territories from ${row.loser}!`);
  }

  return newState;
}

export function getPlayerTerritories(state: GameState, playerId: string): TeamId[] {
  return Object.entries(state.ownership)
    .filter(([, owner]) => owner === playerId)
    .map(([teamId]) => teamId as TeamId);
}

export function applyWeekResults(state: GameState, csvData: string): GameState {
  const trimmed = csvData.trim();
  if (!trimmed) {
    throw new Error('CSV data is empty.');
  }

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const header = lines[0];

  if (!header.startsWith('week,winner,loser')) {
    throw new Error('Invalid CSV format. Expected: week,winner,loser,margin,isPlayoff,isSuperBowl');
  }

  let newState: GameState = {
    ...state,
    log: [...state.log],
    ownership: { ...state.ownership },
  };

  const weekResults = lines.slice(1)
    .map((line) => {
      const [week, winner, loser, margin, isPlayoff, isSuperBowl] = line.split(',');
      const weekNumber = Number.parseInt(week, 10);

      if (Number.isNaN(weekNumber)) {
        throw new Error(`Invalid week value "${week}" in row: ${line}`);
      }

      if (!winner || !loser) {
        throw new Error(`Winner and loser must be provided in row: ${line}`);
      }

      return {
        week: weekNumber,
        winner: winner as TeamId,
        loser: loser as TeamId,
        margin: margin ? Number.parseInt(margin, 10) : undefined,
        isPlayoff: isPlayoff === 'true',
        isSuperBowl: isSuperBowl === 'true',
      } as ResultRow;
    })
    .filter((row) => row.week === state.week);

  for (const row of weekResults) {
    newState = applyRow(newState, row);
  }

  newState = {
    ...newState,
    week: state.week + 1,
  };

  return newState;
}

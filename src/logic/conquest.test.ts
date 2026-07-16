import { describe, expect, it } from 'vitest';
import { applyRow, applyWeekResults } from './conquest';
import { createTestState } from '../test/fixtures';

describe('conquest rules', () => {
  it('protects a home team during the regular season', () => {
    const result = applyRow(createTestState(), { week: 1, winner: 'BUF', loser: 'MIA' });
    expect(result.ownership.MIA).toBe('p2');
    expect(result.log[result.log.length - 1]).toContain('domácí tým');
  });

  it('allows a home team capture in the playoffs', () => {
    const result = applyRow(createTestState(), {
      week: 1, winner: 'BUF', loser: 'MIA', isPlayoff: true,
    });
    expect(result.ownership.MIA).toBe('p1');
  });

  it('adds an extra neutral capture after a large win', () => {
    const state = createTestState();
    state.settings.useMarginRules = true;
    const result = applyRow(state, { week: 1, winner: 'BUF', loser: 'NYJ', margin: 10 }, () => 0);
    const aliceTerritories = Object.values(result.ownership).filter((owner) => owner === 'p1');
    expect(aliceTerritories).toHaveLength(3);
  });

  it('captures a non-home territory after an owned-team win', () => {
    const state = createTestState();
    state.ownership.NE = 'p2';
    const result = applyRow(state, { week: 1, winner: 'BUF', loser: 'NE' });
    expect(result.ownership.NE).toBe('p1');
  });

  it('captures a neutral opponent for the winner owner', () => {
    const result = applyRow(createTestState(), { week: 1, winner: 'BUF', loser: 'NYJ' });
    expect(result.ownership.NYJ).toBe('p1');
  });

  it('does not transfer territory when a neutral team wins', () => {
    const state = createTestState();
    state.ownership.NE = 'p2';
    const result = applyRow(state, { week: 1, winner: 'NYJ', loser: 'NE' });
    expect(result.ownership.NE).toBe('p2');
  });

  it('stacks margin and playoff bonus captures', () => {
    const state = createTestState();
    state.settings.useMarginRules = true;
    state.settings.playoffBoost = true;
    const result = applyRow(state, {
      week: 19, winner: 'BUF', loser: 'NYJ', margin: 8, isPlayoff: true,
    }, () => 0);
    const aliceTerritories = Object.values(result.ownership).filter((owner) => owner === 'p1');
    expect(aliceTerritories).toHaveLength(4);
  });

  it('applies a Super Bowl sweep only when enabled', () => {
    const state = createTestState();
    state.settings.superBowlSweep = true;
    state.ownership.NE = 'p2';
    const result = applyRow(state, {
      week: 22, winner: 'BUF', loser: 'MIA', isPlayoff: true, isSuperBowl: true,
    });
    expect(result.ownership.MIA).toBe('p1');
    expect(result.ownership.NE).toBe('p1');
  });

  it('rejects an unknown team code', () => {
    expect(() => applyWeekResults(
      createTestState(),
      'week,winner,loser,margin,isPlayoff,isSuperBowl\n1,XXX,MIA,7,false,false',
    )).toThrow('Unknown NFL team code');
  });

  it('rejects a file without the active week', () => {
    expect(() => applyWeekResults(
      createTestState(),
      'week,winner,loser,margin,isPlayoff,isSuperBowl\n2,BUF,MIA,7,false,false',
    )).toThrow('týden 1');
  });

  it('prevents applying the same matchup twice', () => {
    const csv = 'week,winner,loser,margin,isPlayoff,isSuperBowl\n1,BUF,NYJ,7,false,false';
    const once = applyWeekResults(createTestState(), csv);
    expect(() => applyWeekResults(once, csv)).toThrow('už byly zapsané');
  });

  it('synchronizes player territory lists after a result batch', () => {
    const result = applyWeekResults(
      createTestState(),
      'week,winner,loser,margin,isPlayoff,isSuperBowl\n1,BUF,NYJ,7,false,false',
    );
    expect(result.players.find((player) => player.id === 'p1')?.teamsOwned).toContain('NYJ');
  });
});

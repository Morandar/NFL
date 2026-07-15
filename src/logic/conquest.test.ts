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
    const result = applyRow(state, { week: 1, winner: 'BUF', loser: 'NYJ', margin: 10 });
    const aliceTerritories = Object.values(result.ownership).filter((owner) => owner === 'p1');
    expect(aliceTerritories).toHaveLength(3);
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
});

import { describe, it, expect } from 'vitest';
import { buildDemoRawData, buildDemoUIData } from '../dev/demoData';

/**
 * Dane demo są tym, co większość osób zobaczy jako pierwsze (`npm run dev`).
 * Jeśli się rozjadą — brak długu, wszyscy rozliczeni albo zduplikowane id —
 * podgląd przestaje pokazywać stany, dla których istnieje.
 */
describe('dane demo', () => {
  it('buduje pełny zestaw: 8 graczy, 22 sesje, historia od najnowszej', () => {
    const data = buildDemoUIData();
    expect(data.playerNames).toHaveLength(8);
    expect(data.summary.totalWeeks).toBe(22);
    expect(data.history.length).toBe(22);
    expect(data.history[0].datePlayed > data.history[21].datePlayed).toBe(true);
  });

  it('pokazuje wszystkie stany salda: dług, rozliczenie i nadpłatę', () => {
    const data = buildDemoUIData();
    const balances = data.players.filter(p => p.name !== 'Kamil').map(p => p.currentDebt);
    expect(balances.some(balance => balance > 1)).toBe(true);
    expect(balances.some(balance => Math.abs(balance) <= 0.01)).toBe(true);
    expect(balances.some(balance => balance < 0)).toBe(true);
  });

  it('skarbnik ma saldo do odzyskania, a nie własny dług', () => {
    const data = buildDemoUIData();
    const organizer = data.players.find(p => p.name === 'Kamil');
    expect(organizer.currentDebt).toBeLessThan(0);
    expect(data.summary.totalToCollect).toBeGreaterThan(0);
  });

  it('identyfikatory sesji i wpłat są unikalne', () => {
    const raw = buildDemoRawData();
    const sessionIds = raw.weeks.map(w => w.id);
    expect(new Set(sessionIds).size).toBe(sessionIds.length);
    const paymentIds = Object.values(raw.payments).flat().map(p => p.id);
    expect(new Set(paymentIds).size).toBe(paymentIds.length);
  });

  it('każda sesja ma komplet danych potrzebnych do rozliczenia', () => {
    const raw = buildDemoRawData();
    for (const week of raw.weeks) {
      expect(week.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(week.present.length).toBeGreaterThan(1);
      expect(week.cost).toBeGreaterThan(0);
      expect(week.present).toContain('Kamil');
      for (const name of week.multiPlayers) expect(week.present).toContain(name);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { buildEditForm } from '../utils/editForm';
import { getTotalWithRackets } from '../utils/sessionCost';

const base = {
  id: 's1', datePlayed: '2025-03-12', sport: 'squash', totalCost: 60, costPerPerson: 0, costPerPersonMulti: 0,
  presentPlayers: ['Ala', 'Bartek', 'Cezary', 'Dorota'], multisportPlayers: ['Bartek'],
};

describe('buildEditForm — formularz edycji z zapisanej sesji', () => {
  it('stara sesja: sam kort, bez konfiguracji kortów i bez ceny przed zwrotem', () => {
    const form = buildEditForm({ ...base, sport: 'pingpong' });
    expect(form).toEqual({
      date: '2025-03-12', cost: 60, present: base.presentPlayers, multiPlayers: ['Bartek'], sport: 'pingpong',
      racketCount: 0, racketPrice: 5, ownRacketPlayers: [], courtCount: undefined, durationHours: undefined,
      singleScanPlayers: [], discountModel: undefined,
    });
    expect(form).not.toHaveProperty('courtGross');
  });

  it('brak sportu w rekordzie liczy się jako ping-pong', () => {
    expect(buildEditForm({ ...base, sport: undefined }).sport).toBe('pingpong');
  });

  it('odejmuje rakiety od kwoty i odtwarza ich liczbę oraz cenę', () => {
    const form = buildEditForm({ ...base, totalCost: 70, racketCost: 10, ownRacketPlayers: ['Ala'] });
    expect(form.cost).toBe(60);
    expect(form.racketCount).toBe(2);
    expect(form.racketPrice).toBe(5);
    expect(form.ownRacketPlayers).toEqual(['Ala']);
  });

  it('edycja bez zmian odtwarza dokładnie kwotę sesji', () => {
    for (const [totalCost, racketCost] of [[60, undefined], [70, 10], [48.5, 8.5], [100.01, 15]]) {
      const form = buildEditForm({ ...base, totalCost, racketCost });
      expect(getTotalWithRackets(form.cost, (form.racketCount ?? 0) * (form.racketPrice ?? 0))).toBe(totalCost);
    }
  });

  it('kopiuje tablice, więc zmiana formularza nie rusza wiersza historii', () => {
    const row = { ...base, ownRacketPlayers: ['Ala'], singleScanPlayers: ['Bartek'] };
    const form = buildEditForm(row);
    form.present.push('Ewa');
    form.multiPlayers.push('Ewa');
    form.ownRacketPlayers.push('Ewa');
    form.singleScanPlayers.push('Ewa');
    expect(row.presentPlayers).toHaveLength(4);
    expect(row.multisportPlayers).toEqual(['Bartek']);
    expect(row.ownRacketPlayers).toEqual(['Ala']);
    expect(row.singleScanPlayers).toEqual(['Bartek']);
  });

  describe('nowa zasada z ceną przed zwrotem', () => {
    const perScan = {
      ...base, discountModel: 'perScan', courtCount: 1, durationHours: 1, totalCost: 85,
      multisportPlayers: ['Bartek', 'Cezary'],
    };

    it('zwrot zgodny z regułami zostaje automatyczny', () => {
      // 2 odbicia × 15 zł = 30 zł zwrotu; cena 115 zł, kwota po zwrocie 85 zł.
      const form = buildEditForm({ ...perScan, courtGross: 115 });
      expect(form.courtGross).toBe(115);
      expect(form.refundOverride).toBeUndefined();
      expect(form.cost).toBe(85);
    });

    it('zwrot inny niż wg reguł staje się ręczny i zachowuje zapisaną kwotę', () => {
      const form = buildEditForm({ ...perScan, courtGross: 100 });
      expect(form.courtGross).toBe(100);
      expect(form.refundOverride).toBe(15);
    });

    it('bez ceny przed zwrotem formularz zostaje przy jednym polu kosztu', () => {
      const form = buildEditForm(perScan);
      expect(form).not.toHaveProperty('courtGross');
      expect(form).not.toHaveProperty('refundOverride');
      expect(form.discountModel).toBe('perScan');
    });

    it('cena przed zwrotem bez zasady perScan jest ignorowana', () => {
      const form = buildEditForm({ ...base, courtGross: 90 });
      expect(form).not.toHaveProperty('courtGross');
    });
  });
});

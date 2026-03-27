// ============================================================================
// SESSION COST HELPERS
// ============================================================================
//
// Centralised cost-per-player logic used everywhere in the app.
// Avoids duplicating the squash/pingpong branching in AdminTab,
// AttendanceTab, HistoryTab, and calculations.js.

import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '../constants';
import { roundToTwoDecimals } from './calculations';

/**
 * Calculate how much a specific player owes for a single session.
 *
 * Ping-pong: Multisport players pay 0; remaining players split the cost.
 * Squash:    Everyone splits the rental; Multisport holders deduct 15 zł.
 *
 * @param {Object} session — must have { totalCost, presentPlayers[], multisportPlayers[], sport? }
 * @param {string} playerName
 * @returns {number} cost rounded to 2 decimals (never negative)
 */
export function getPlayerSessionCost(session, playerName) {
  const present = session.presentPlayers ?? session.present ?? [];
  const multi   = session.multisportPlayers ?? session.multiPlayers ?? [];
  const cost    = session.totalCost ?? session.cost ?? 0;
  const sport   = session.sport || SPORT.PINGPONG;
  const isMulti = multi.includes(playerName);

  if (!present.includes(playerName)) return 0;

  if (sport === SPORT.SQUASH) {
    // Hypothetical full cost (as if no cards were used) ensures the sum always equals actual cost.
    const multiCount = multi.filter(p => present.includes(p)).length;
    const hypothetical = cost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    const base = present.length > 0 ? hypothetical / present.length : 0;
    return roundToTwoDecimals(Math.max(0, isMulti ? base - SQUASH_MULTISPORT_DISCOUNT : base));
  }

  // Ping-pong
  if (isMulti) return 0;
  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? roundToTwoDecimals(cost / paying.length) : 0;
}

/**
 * Get the base (non-multisport) cost per person for a session.
 * Used for display purposes (e.g., HistoryTab "NA OSOBĘ" column).
 */
export function getSessionBaseCost(session) {
  const present = session.presentPlayers ?? session.present ?? [];
  const multi   = session.multisportPlayers ?? session.multiPlayers ?? [];
  const cost    = session.totalCost ?? session.cost ?? 0;
  const sport   = session.sport || SPORT.PINGPONG;

  if (sport === SPORT.SQUASH) {
    const multiCount = multi.filter(p => present.includes(p)).length;
    const hypothetical = cost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    return present.length > 0 ? roundToTwoDecimals(hypothetical / present.length) : 0;
  }

  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? roundToTwoDecimals(cost / paying.length) : 0;
}

// ============================================================================
// SESSION COST HELPERS
// ============================================================================
//
// Centralised cost-per-player logic used everywhere in the app.
// Avoids duplicating the squash/pingpong branching in AdminTab,
// AttendanceTab, HistoryTab, and calculations.js.

import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '../constants';

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
    const base = present.length > 0 ? cost / present.length : 0;
    return round2(Math.max(0, isMulti ? base - SQUASH_MULTISPORT_DISCOUNT : base));
  }

  // Ping-pong
  if (isMulti) return 0;
  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? round2(cost / paying.length) : 0;
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
    return present.length > 0 ? round2(cost / present.length) : 0;
  }

  const paying = present.filter(p => !multi.includes(p));
  return paying.length > 0 ? round2(cost / paying.length) : 0;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

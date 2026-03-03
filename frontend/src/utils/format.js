// ============================================================================
// FORMATOWANIE — daty i kwoty po polsku
// ============================================================================

/**
 * '2025-03-08' → '08.03.2025'
 */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

/**
 * 13.75 → '13,75 zł'
 * Opcjonalnie bez symbolu: formatAmount(13.75, false) → '13,75'
 */
export function formatAmount(value, withSymbol = true) {
  const str = Number(value).toFixed(2).replace('.', ',');
  return withSymbol ? `${str} zł` : str;
}

/**
 * Skrót dla kwoty na kartach — bez spacji
 */
export function formatAmountShort(value) {
  return Number(value).toFixed(2).replace('.', ',');
}

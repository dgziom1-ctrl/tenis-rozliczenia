export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function formatAmount(value: number, withSymbol = true): string {
  const str = Number(value).toFixed(2).replace('.', ',');
  return withSymbol ? `${str} zł` : str;
}

export function formatAmountShort(value: number): string {
  return formatAmount(value, false);
}

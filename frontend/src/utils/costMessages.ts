import { parseAmount } from './format';

// Jeden zestaw komunikatów dla pól kwot. Wcześniej AdminTab i EditSessionForm
// miały własne, różne teksty („Wpisz koszt sesji żeby kontynuować” kontra
// „Wpisz koszt kortu”) i zapis kodowy „>= 0”.

/** Komunikat dla pola „koszt kortu” albo null, gdy wartość jest poprawna. */
export function costError(text: string): string | null {
  if (text.trim() === '') return 'Wpisz koszt kortu';
  const amount = parseAmount(text);
  if (Number.isNaN(amount)) return 'Wpisz kwotę cyframi, np. 41';
  if (amount < 0) return 'Koszt nie może być ujemny';
  return null;
}

/** Komunikat dla pola „cena rakietki” albo null, gdy wartość jest poprawna. */
export function racketPriceError(text: string): string | null {
  if (text.trim() === '') return 'Wpisz cenę rakietki';
  const amount = parseAmount(text);
  if (Number.isNaN(amount)) return 'Wpisz cenę cyframi, np. 5';
  if (amount < 0) return 'Cena nie może być ujemna';
  return null;
}

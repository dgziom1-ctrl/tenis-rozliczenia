/**
 * Bezpiecznie kopiuje tekst do schowka. Zwraca `true` przy powodzeniu.
 * Nigdy nie rzuca wyjątku ani nie tworzy nieobsłużonego odrzucenia Promise:
 * - używa Clipboard API, gdy jest dostępne (kontekst bezpieczny / HTTPS),
 * - w razie braku uprawnień lub kontekstu robi fallback na `execCommand('copy')`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof text !== 'string') return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // przechodzimy do fallbacku poniżej
  }

  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Czas aktywności: 3725 → „1 h 02 min”, 95 → „1 min 35 s”. */
export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${String(Math.round(seconds % 60)).padStart(2, '0')} s`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** „5 min temu”, „wczoraj 21:14”, „12.11 09:30”. */
export function fmtAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return 'przed chwilą';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min temu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} godz. temu`;
  return fmtDateTime(ts);
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw',
  });
}

export function fmtDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${d}.${m}`;
}

/** Anonimowe urządzenie dostaje czytelną etykietę z końcówki ID. */
export function deviceLabel(name: string, did: string): string {
  return name || `anonim ${did.slice(-4)}`;
}

export const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'] as const;

const TYPE_LABELS: Record<string, string> = {
  app_start: 'start aplikacji',
  app_hidden: 'ukrycie karty',
  app_visible: 'powrót do karty',
  session_end: 'koniec sesji',
  heartbeat: 'puls aktywności',
  perf: 'czasy ładowania',
  page_view: 'wejście w zakładkę',
  data_ready: 'dane gotowe',
  network: 'zmiana sieci',
  modal_open: 'otwarcie okna',
  session_added: 'dodanie sesji',
  session_edited: 'edycja sesji',
  session_deleted: 'usunięcie sesji',
  session_restored: 'przywrócenie sesji',
  player_added: 'dodanie gracza',
  player_removed: 'usunięcie gracza',
  player_restored: 'przywrócenie gracza',
  player_purged: 'trwałe usunięcie gracza',
  multisport_defaults_saved: 'zapis domyślnych kart',
  payment_added: 'wpłata',
  payment_undone: 'cofnięcie wpłaty',
  csv_export: 'eksport CSV',
  theme_change: 'zmiana motywu',
  share_copy: 'skopiowanie wiadomości',
  blik_copy: 'skopiowanie numeru BLIK',
  admin_unlock: 'kod admina',
  easter_egg: 'easter egg',
  push_permission: 'zgoda na powiadomienia',
  push_registered: 'rejestracja powiadomień',
  push_error: 'błąd powiadomień',
  push_open: 'otwarcie z powiadomienia',
  pwa_prompt: 'instalacja PWA (pytanie)',
  pwa_installed: 'zainstalowano PWA',
  js_error: 'błąd JS',
  js_rejection: 'odrzucona obietnica',
  react_error: 'awaria widoku',
  connection_slow: 'wolne połączenie',
  connection_error: 'błąd połączenia',
  boot_timeout: 'przekroczony czas startu',
  hard_reset: 'twardy reset',
};

/** Polska etykieta typu zdarzenia; nieznane typy zostają bez zmian. */
export function typeLabel(type: string): string {
  const [base, suffix] = type.split(' (');
  const label = TYPE_LABELS[base] ?? base;
  return suffix ? `${label} (${suffix}` : label;
}

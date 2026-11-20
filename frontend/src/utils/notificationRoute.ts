/**
 * Zamienia adres z powiadomienia push (`/?tab=attendance&player=Ola`) na trasę
 * routera. Zwraca `null`, gdy adres nie niesie `tab` — wtedy nic nie przekierowujemy.
 *
 * Używane w dwóch miejscach: przy kliknięciu w powiadomienie, gdy apka jest już
 * otwarta (wiadomość z Service Workera), oraz przy zimnym starcie, gdy
 * `clients.openWindow` otwiera po prostu `/?tab=…`.
 */
export function routeFromNotificationUrl(url: URL): string | null {
  const tab = url.searchParams.get('tab');
  if (tab === 'attendance') {
    const player = url.searchParams.get('player');
    return player ? `/attendance?player=${encodeURIComponent(player)}` : '/attendance';
  }
  if (tab === 'dashboard') return '/';
  if (tab === 'admin') return '/admin';
  return null;
}

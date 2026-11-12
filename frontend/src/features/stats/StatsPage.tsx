import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router';
import { readStorage, writeStorage } from '@/utils/storage';
import { isOptedOut, setOptOut } from '@/lib/analytics/identity';
import { STATS_PATH } from '@/lib/analytics/statsRoute';
import { fetchStats, StatsAuthError, type StatsData } from './statsApi';
import StatsView from './StatsView';

const KEY_STORAGE = 'cp-stats-key';
const REFRESH_MS = 60_000;

/** Klucz z fragmentu adresu (`#k=…`), którego przeglądarka nie wysyła na serwer. */
function takeKeyFromUrl(): string | null {
  const match = /(?:^|[#&])k=([^&]+)/.exec(window.location.hash);
  if (!match) return null;
  try {
    const key = decodeURIComponent(match[1]);
    // Klucz znika z paska adresu i z historii — nie zostaje w zrzutach ekranu.
    window.history.replaceState(null, '', window.location.pathname);
    return key;
  } catch {
    return null;
  }
}

/**
 * Ukryty panel statystyk. Brak ważnego klucza = zwykłe przekierowanie na stronę
 * główną, więc nic nie zdradza, że ta ścieżka istnieje.
 */
export default function StatsPage() {
  const [key, setKey] = useState<string | null>(() => {
    const fromUrl = takeKeyFromUrl();
    if (fromUrl) writeStorage(KEY_STORAGE, fromUrl);
    return fromUrl ?? readStorage(KEY_STORAGE);
  });
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optedOut, setOptedOut] = useState(isOptedOut);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!key) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      if (import.meta.env.DEV && key === 'demo') {
        const { buildDemoStats } = await import('./demoStats');
        setData(buildDemoStats());
      } else {
        setData(await fetchStats(key, controller.signal));
      }
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof StatsAuthError) {
        try { localStorage.removeItem(KEY_STORAGE); } catch { /* brak magazynu */ }
        setKey(null);
        return;
      }
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać statystyk');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_MS);
    return () => { clearInterval(timer); abortRef.current?.abort(); };
  }, [load]);

  useEffect(() => {
    document.title = 'Statystyki';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex,nofollow' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!key || !STATS_PATH) return <Navigate to="/" replace />;

  return (
    <StatsView
      data={data}
      error={error}
      loading={loading}
      onRefresh={() => { void load(); }}
      optedOut={optedOut}
      onToggleOptOut={() => { setOptOut(!optedOut); setOptedOut(!optedOut); }}
    />
  );
}

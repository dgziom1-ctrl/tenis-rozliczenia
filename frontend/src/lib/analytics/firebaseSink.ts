import { ref, push, update } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import type { AnalyticsEvent } from './track';

/**
 * Jeden zapis wielu zdarzeń (multi-path `update`). Klucze generuje klient
 * (`push().key`, działa offline), a reguły dopuszczają wyłącznie tworzenie
 * nowych wpisów — nikt nie nadpisze ani nie skasuje cudzych statystyk.
 */
export async function firebaseSink(events: AnalyticsEvent[]): Promise<void> {
  const updates: Record<string, AnalyticsEvent> = {};
  for (const event of events) {
    const key = push(ref(database, 'analytics/events')).key;
    if (key) updates[`analytics/events/${key}`] = event;
  }
  if (Object.keys(updates).length > 0) await update(ref(database), updates);
}

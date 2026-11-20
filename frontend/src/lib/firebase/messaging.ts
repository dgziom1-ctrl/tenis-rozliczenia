/**
 * Leniwe wczytanie SDK Firebase Cloud Messaging.
 *
 * Messaging (z `installations` i `idb`) to kilkadziesiąt kB, potrzebnych tylko
 * osobom z włączonymi powiadomieniami — i dopiero po starcie. Statyczny import
 * dokładał je do paczki pobieranej przy każdym uruchomieniu, przed pierwszym
 * malowaniem. Teraz trafiają do osobnej paczki (patrz `manualChunks`
 * w `vite.config.ts`), pobieranej przy pierwszym użyciu.
 *
 * Obietnica jest zapamiętywana, więc kolejne wywołania nie pobierają niczego
 * drugi raz. Nieudane pobranie (np. offline) jest zapominane, żeby następna
 * próba mogła się powieść.
 */
type MessagingSdk = typeof import('firebase/messaging');

let pending: Promise<MessagingSdk> | null = null;

export function loadMessagingSdk(): Promise<MessagingSdk> {
  pending ??= import('firebase/messaging').catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

# Konfiguracja Push Notyfikacji

## Kroki w Firebase Console

### 1. Włącz Cloud Messaging
1. Wejdź na https://console.firebase.google.com
2. Wybierz swój projekt
3. Lewy panel → Build → Cloud Messaging
4. Upewnij się że jest włączone

### 2. Wygeneruj klucz VAPID
1. Firebase Console → Project Settings (koło zębate) → Cloud Messaging
2. Sekcja "Web configuration" → "Web Push certificates"
3. Kliknij "Generate key pair"
4. Skopiuj wygenerowany klucz

### 3. Skonfiguruj .env.local
W pliku `frontend/.env.local` dodaj VAPID key (pozostałe VITE_FIREBASE_* powinny
już być — te same wartości są teraz potrzebne do service workera):
```
VITE_FIREBASE_VAPID_KEY=twoj_klucz_vapid_tutaj
```

> ⚠️ **Ważne**: Plik `firebase-messaging-sw.js` jest teraz generowany
> automatycznie przez Vite podczas `npm run build` i `npm run dev`.
> **Nie edytuj go ręcznie** — zmiany zostaną nadpisane przy kolejnym buildzie.
> Wcześniej trzeba było ręcznie wklejać config do tego pliku — to już
> nie jest potrzebne.

### 4. Dodaj regułę do Firebase Realtime Database
W Firebase Console → Realtime Database → Rules:
```json
{
  "rules": {
    "appData": { ".read": true, ".write": true },
    "fcmTokens": { ".read": true, ".write": true }
  }
}
```

### 5. Deploy Cloud Functions
```bash
cd tenis-rozliczenia-main
npm install -g firebase-tools   # jeśli nie masz
firebase login
firebase deploy --only functions
```

### 6. Zbuduj i wdróż apkę
```bash
cd frontend
npm run build   # Vite automatycznie generuje firebase-messaging-sw.js z prawdziwym configiem
cd ..
firebase deploy --only hosting
```

## Jak działa

- Przy pierwszym wejściu na dashboard pojawia się banner z prośbą o zgodę
- Użytkownik wybiera swoje imię i klika "Włącz"
- Token FCM zapisuje się do Firebase (`fcmTokens/`)
- Gdy ktoś doda sesję → Cloud Function wykrywa zmianę → wysyła push do wszystkich tokenów
- **Apka w tle**: powiadomienie pojawia się przez service worker (onBackgroundMessage)
- **Apka otwarta**: powiadomienie pojawia się przez natywny Notification API (onMessage)
- Gdy ktoś zrobi serię 5/10/15/20/25/30 z rzędu → osobny push z gratulacjami

## Sprawdzanie logów Cloud Functions

Jeśli powiadomienia nadal nie działają, sprawdź logi funkcji:
```bash
firebase functions:log --only onSessionAdded
```

Powinieneś zobaczyć linie jak:
```
Tygodnie: przed=5, po=6
Nowa sesja: 2026-03-19, 4 graczy, 27 zł/os.
Tokenów FCM: 3
FCM: 3 sukces, 0 błąd z 3
```

## Wymagania

- Firebase Blaze plan (Functions wymagają płatnego planu, ale darmowy limit = 2M wywołań/miesiąc)
- Node.js 20+
- iOS: tylko jako PWA (dodane do ekranu głównego), iOS 16.4+
- Android: Chrome, Edge, Firefox

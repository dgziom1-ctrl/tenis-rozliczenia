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

### 3. Dodaj klucz do .env
W pliku `frontend/.env.local` dodaj:
```
VITE_FIREBASE_VAPID_KEY=twoj_klucz_vapid_tutaj
```

### 4. Zaktualizuj Service Worker
W pliku `frontend/public/firebase-messaging-sw.js` 
zastąp PLACEHOLDER wartościami z Firebase Config:
```js
const firebaseConfig = {
  apiKey: "twoj-api-key",
  authDomain: "twoj-projekt.firebaseapp.com",
  projectId: "twoj-projekt",
  storageBucket: "twoj-projekt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc",
};
```
(Te same wartości co w VITE_FIREBASE_* w .env.local)

### 5. Dodaj regułę do Firebase Realtime Database
W Firebase Console → Realtime Database → Rules dodaj:
```json
{
  "rules": {
    "appData": { ".read": true, ".write": true },
    "fcmTokens": { ".read": true, ".write": true }
  }
}
```

### 6. Deploy Cloud Functions
```bash
cd tenis-rozliczenia-main
npm install -g firebase-tools   # jeśli nie masz
firebase login
firebase deploy --only functions
```

### 7. Deploy całej apki
```bash
cd frontend && npm run build
cd ..
firebase deploy
```

## Jak działa

- Przy pierwszym wejściu na dashboard pojawia się banner z prośbą o zgodę
- Użytkownik wybiera swoje imię i klika "Włącz"
- Token FCM zapisuje się do Firebase (`fcmTokens/`)
- Gdy ktoś doda sesję → Cloud Function wykrywa zmianę → wysyła push do wszystkich tokenów
- Gdy ktoś zrobi serię 10/15/20... z rzędu → osobny push z gratulacjami

## Wymagania

- Firebase Blaze plan (Functions wymagają płatnego planu, ale darmowy limit = 2M wywołań/miesiąc)
- Node.js 20+

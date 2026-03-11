# 🕹️ Cyber Ponk

> System rozliczeń dla rodzinnej grupy ping-pong. Kto był, ile płaci, kto zalega — wszystko w jednym miejscu.

---

## ✨ Funkcje

### 💰 Dashboard
- Karty graczy z aktualnym długiem w czasie rzeczywistym
- Oznaczanie płatności jednym kliknięciem
- **Undo** — 10 sekund na cofnięcie oznaczenia płatności
- Szczegółowy breakdown zaległości (które tygodnie, ile za każdy)
- Numer BLIK do szybkiego kopiowania

### 📊 Frekwencja
- **Leaderboard** z podium olimpijskim (🥇🥈🥉) i ex aequo
- Rangi graczy: LEGENDA / MISTRZ / WETERAN / STAŁY / GOŚĆ / DUCH
- Tytuły specjalne: 👑 Król frekwencji, 🔥 Seria, ⚡ Multi King, 💀 Rzadki gość
- Raport miesięczny z tabelą obecności

### ⚙️ Panel Admina
- Dodawanie tygodnia z wyborem daty (dzień/miesiąc/rok)
- Szybkie przyciski kosztów: FREE / 15 / 30 / 45 / 60 PLN
- Wszyscy gracze domyślnie zaznaczeni
- Multisport — automatycznie preloadowany z ustawień

### 📅 Historia
- Pełna lista rozgrywek z kosztami i składem
- Edycja i usuwanie tygodnia **zabezpieczone hasłem**

### 👥 Gracze
- Dodawanie nowych graczy
- Soft delete (kosz) i przywracanie
- Usuwanie **zabezpieczone hasłem**

### 🎮 Misc
- Animacja pong w nagłówku z dźwiękami
- Easter egg 🏓 (znajdź sam)
- PWA — działa jak aplikacja na telefonie
- Pełna synchronizacja w czasie rzeczywistym (Firebase)

---

## 🛠️ Tech stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Baza danych | Firebase Realtime Database |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |
| Ikony | Lucide React |

---

## 🚀 Lokalne uruchomienie

### Wymagania
- Node.js 20+
- Konto Firebase z projektem Realtime Database

### Instalacja

```bash
git clone https://github.com/twoj-login/tenis-rozliczenia.git
cd tenis-rozliczenia/frontend
npm install
```

### Konfiguracja

Utwórz plik `frontend/.env.local`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_BLIK_NUMBER=...
```

> ⚠️ Plik `.env.local` jest w `.gitignore` — nigdy nie trafia do repozytorium.

### Uruchomienie

```bash
npm run dev
```

Aplikacja dostępna pod `http://localhost:5173`

---

## 🔐 Bezpieczeństwo

- Klucze Firebase trzymane w **GitHub Secrets** — nie ma ich w kodzie
- Hasło do edycji/usuwania danych chroni przed przypadkowymi zmianami
- Firebase Rules ograniczają zapis do autoryzowanych klientów
- Numer BLIK zakodowany przez zmienną środowiskową

---

## 📦 Deploy

Deploy odbywa się automatycznie po każdym pushu do `main`:

```
git push origin main
```

GitHub Actions: instaluje zależności → buduje React → deployuje na Firebase Hosting.

---

## 🏗️ Struktura projektu

```
tenis-rozliczenia/
├── frontend/
│   ├── public/
│   │   ├── manifest.json        # PWA config
│   │   ├── icon-192v2.png
│   │   └── icon-512v2.png
│   ├── src/
│   │   ├── firebase.js          # Cała logika bazy danych
│   │   ├── App.jsx              # Root + routing między tabami
│   │   └── components/
│   │       ├── layout/
│   │       │   ├── Header.jsx
│   │       │   └── Navigation.jsx
│   │       ├── dashboard/
│   │       │   └── DashboardTab.jsx
│   │       ├── attendance/
│   │       │   └── AttendanceTab.jsx
│   │       ├── admin/
│   │       │   └── AdminTab.jsx
│   │       ├── history/
│   │       │   └── HistoryTab.jsx
│   │       └── players/
│   │           └── PlayersTab.jsx
│   ├── index.html
│   └── package.json
├── .github/
│   └── workflows/
│       └── firebase-hosting-merge.yml
├── firebase.json
└── README.md
```

---

## 👾 Credits

Frontend design oparty na projekcie **cyber-pong-club** by [@k-michalek](https://github.com/k-michalek).

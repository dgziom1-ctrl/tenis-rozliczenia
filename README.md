# 🕹️ Cyber Ponk

> A real-time debt tracker for a private ping-pong group. Who showed up, what they owe, and who's behind — all in one place.

---

## ✨ Features

### 💰 Dashboard
- Live player cards showing each person's current balance
- One-click payment settlement with an **8-second undo** window
- Detailed debt breakdown — which sessions, how much each cost
- Quick BLIK payment button with exact amount pre-filled
- Per-card partial payment entry with its own undo

### 📊 Attendance
- **Leaderboard** with an Olympic podium (🥇🥈🥉) and ex aequo support
- Player ranks: LEGENDA / MISTRZ / WETERAN / STAŁY / GOŚĆ / DUCH
- Special titles: 👑 Król frekwencji · 🔥 Streak · ⚡ Multi King · 💀 Rzadki gość
- Monthly attendance table

### ⚙️ Add Session
- Date picker with quick-cost buttons: FREE / 15 / 30 / 45 / 60 PLN
- All players pre-selected; Multisport defaults loaded from settings
- Live per-person cost preview before saving
- Post-save summary with a one-tap "copy to group chat" message

### 📅 History
- Full session list grouped by month
- Edit and delete — both **password-protected**

### 👥 Players
- Add players; soft-delete to trash with restore option
- Permanent deletion is **password-protected**
- Set a default Multisport roster (auto-checked for every new session)

### 🎨 Themes
Three themes switchable from the header: **Cyber** (default) · **Arcade** · **Zen** — each with its own colour palette, fonts, and sound effects.

### 📱 PWA
Installable as a home-screen app on mobile. Works offline for reading; writes sync when back online.

---

## 🛠️ Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Database | Firebase Realtime Database |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |
| Icons | Lucide React |
| Component explorer | Storybook |

---

## 🚀 Local setup

### Prerequisites
- Node.js 20+
- A Firebase project with Realtime Database enabled

### Install

```bash
git clone https://github.com/your-username/tenis-rozliczenia.git
cd tenis-rozliczenia/frontend
npm install
```

### Configure

Create `frontend/.env.local`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_PASSWORD=...
VITE_BLIK_NUMBER=...
```

> ⚠️ `.env.local` is in `.gitignore` and never committed to the repository.

### Run

```bash
npm run dev        # dev server at http://localhost:5173
npm run storybook  # component explorer at http://localhost:6006
npm test           # unit tests (Vitest)
```

---

## 📦 Deployment

Every push to `main` triggers an automatic deploy:

```
git push origin main
```

GitHub Actions pipeline: install → build → deploy to Firebase Hosting.

A nightly GitHub Action also backs up the Realtime Database to `backups/` in the repo.

---

## 🏗️ Project structure

```
tenis-rozliczenia/
├── frontend/
│   ├── public/
│   │   ├── manifest.json               # PWA config
│   │   ├── icon-192v2.png
│   │   └── icon-512v2.png
│   └── src/
│       ├── components/
│       │   ├── admin/
│       │   │   └── AdminTab.jsx        # Add session form
│       │   ├── attendance/
│       │   │   └── AttendanceTab.jsx   # Leaderboard, monthly report
│       │   ├── common/
│       │   │   ├── ErrorBoundary.jsx
│       │   │   ├── LoadingSkeleton.jsx
│       │   │   ├── PWAInstallBanner.jsx
│       │   │   └── Toast.jsx
│       │   ├── dashboard/
│       │   │   ├── BreakdownPanel.jsx  # Session/payment detail accordion
│       │   │   ├── ConfettiOverlay.jsx
│       │   │   ├── DashboardTab.jsx    # Player cards, settle flow
│       │   │   ├── PlayerCard.jsx      # Single player card
│       │   │   └── SettleConfirmModal.jsx
│       │   ├── history/
│       │   │   └── HistoryTab.jsx      # Session list with edit/delete
│       │   ├── layout/
│       │   │   ├── Header.jsx
│       │   │   └── Navigation.jsx
│       │   └── players/
│       │       └── PlayersTab.jsx      # Roster management
│       ├── constants/
│       │   └── index.js                # App-wide constants and theme data
│       ├── context/
│       │   └── ThemeContext.jsx        # Theme provider + token map
│       ├── firebase/
│       │   ├── config.js               # Firebase initialisation
│       │   ├── index.js                # Public re-export barrel
│       │   ├── payments.js             # Settle, undo, add/remove payments
│       │   ├── players.js              # Add, delete, restore players
│       │   ├── state.js                # Current data snapshot reference
│       │   ├── subscriptions.js        # onValue listener + UI data builder
│       │   ├── utils.js                # withTransaction helper
│       │   └── weeks.js                # Add, update, delete sessions
│       ├── hooks/
│       │   ├── useAudio.js             # Web Audio API sound engine
│       │   ├── useDebounce.js
│       │   ├── usePaymentUndo.js       # Per-card payment undo countdown
│       │   └── useUndoTimer.js         # Generic undo countdown timer
│       ├── stories/                    # Storybook stories
│       ├── utils/
│       │   ├── calculations.js         # Debt, rankings, breakdowns
│       │   ├── format.js               # Date and currency formatting
│       │   └── id.js                   # Collision-resistant ID generator
│       ├── App.jsx                     # Root component, theme, data subscription
│       └── main.jsx
├── .github/
│   └── workflows/
│       ├── firebase-hosting-merge.yml  # Deploy on push to main
│       ├── firebase-hosting-pull-request.yml
│       ├── firebase_backup.yml         # Nightly DB backup
│       └── tests.yml                   # Run Vitest on every PR
├── firebase.json
└── README.md
```

---

## 🧮 How the debt calculation works

Each session has a total cost split equally among players who **don't** have Multisport. Players with Multisport attend for free. The debt for a player is:

```
debt = sum(costPerSession for each session since last settlement)
     - sum(all recorded payments)
```

A positive value means money is owed; a negative value is a credit carried forward to future sessions.

Settlement records the current net debt as a payment and advances the player's `paidUntilWeek` cursor to the latest session.

---

## 🧪 Tests

Unit tests live in `src/__tests__/` and cover:

- `calculations.test.js` — debt calculation, breakdown logic, edge cases (Multisport-only sessions, zero-cost weeks)
- `format.test.js` — date and currency formatting
- `robustness.test.js` — null/undefined/empty data guards

```bash
npm test
```

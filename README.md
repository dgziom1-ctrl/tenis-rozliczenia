# 🕹️ Cyber-Pong

> A real-time debt tracker and attendance leaderboard for a private ping-pong group. Who showed up, what they owe, who's on a streak — all in one place.

---

## ✨ Features

### 💰 Dashboard
- Live player cards showing each person's current balance
- One-click full settlement with an **8-second undo** window
- Per-card partial payment entry with its own undo countdown
- Detailed debt breakdown — which sessions contributed, how much each cost
- Quick BLIK payment button with the exact amount pre-filled

### 📊 Ranking
- Olympic podium (🥇🥈🥉) with ex-aequo support
- Full leaderboard sorted by attendance percentage
- Player ranks: **LEGENDA / MISTRZ / WETERAN / STAŁY / GOŚĆ / DUCH**
- Special title badges: 👑 Król frekwencji · 🔥 Streak · ⚡ Multi King · 💀 Rzadki gość
- Active streak counter shown on each card
- **Ranking history chart** — each player's position plotted over time
- **Per-player modal** — full session drill-down, attendance heatmap, and earned achievements
- Achievements: Debiut · Perfekcyjny miesiąc · 10/25/50 sesji · Multisport x5 · Streak milestones (5/10/20/30/50/100)
- Monthly attendance table

### ⚙️ Add Session
- Date picker with quick-cost buttons: FREE / 15 / 30 / 45 / 60 PLN
- All players pre-selected; Multisport defaults loaded from settings
- Live per-person cost preview before saving
- Post-save summary modal with a one-tap **"copy to group chat"** message

### 📅 History
- Full session list grouped by month
- Edit and delete — both **password-protected**

### 👥 Players
- Add players; soft-delete to trash with restore option
- Permanent deletion is **password-protected**
- Set a default Multisport roster (auto-checked for every new session)

### 🔔 Push Notifications
Powered by Firebase Cloud Messaging. Three automatic triggers:

| Event | Notification |
|-------|-------------|
| New session added | "🏓 Nowa sesja dodana! — date · players · cost/person" |
| Streak milestone (5/10/20/30/50/100) | "⚡ Seria 5! — Kamil ma 5 sesji z rzędu!" |
| New player joins | "🎮 Nowy gracz! — Marek dołączył do gry!" |
| Every Tuesday at 19:00 (Warsaw time) | "🏓 Jutro ping-pong! Jutro sesja — kto gra?" |

- Tapping a **session notification** navigates to Dashboard
- Tapping a **streak notification** navigates to Ranking and opens that player's modal directly
- Works in background (Service Worker) and foreground (active app)
- Per-device opt-in from the Dashboard banner; token stored in Firebase under `fcmTokens/`

### 🎨 Theme
Two themes switchable from the header: **Cyber** (dark, default) · **Light** — persisted in `localStorage`.

### 📱 PWA
Installable as a home-screen app on mobile. Works offline for reading; writes sync when back online.

---

## 🛠️ Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Database | Firebase Realtime Database |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Backend triggers | Firebase Cloud Functions (Node 20) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |
| Icons | Lucide React |
| Component explorer | Storybook |

---

## 🚀 Local setup

### Prerequisites
- Node.js 20+
- A Firebase project with Realtime Database and Cloud Messaging enabled

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
VITE_FIREBASE_VAPID_KEY=...
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

Every push to `main` triggers an automatic deploy via GitHub Actions:

```
git push origin main
```

Pipeline: install → test → build → deploy hosting + functions.

A weekly GitHub Action backs up the Realtime Database to `backups/` in the repo every Sunday at midnight UTC.

---

## 🏗️ Project structure

```
tenis-rozliczenia/
├── frontend/
│   ├── public/
│   │   ├── firebase-messaging-sw.js    # FCM Service Worker (background notifications)
│   │   ├── manifest.json               # PWA config
│   │   ├── icon-192v2.png
│   │   └── icon-512v2.png
│   └── src/
│       ├── components/
│       │   ├── admin/
│       │   │   └── AdminTab.jsx        # Add session form + post-save summary modal
│       │   ├── attendance/
│       │   │   └── AttendanceTab.jsx   # Ranking, podium, history chart, player modal
│       │   ├── common/
│       │   │   ├── ErrorBoundary.jsx
│       │   │   ├── LoadingSkeleton.jsx
│       │   │   ├── PWAInstallBanner.jsx
│       │   │   ├── PushPermissionBanner.jsx  # FCM opt-in UI
│       │   │   ├── SharedUI.jsx
│       │   │   ├── Toast.jsx
│       │   │   └── UndoBar.jsx
│       │   ├── dashboard/
│       │   │   ├── BreakdownPanel.jsx  # Session/payment detail accordion
│       │   │   ├── ConfettiOverlay.jsx
│       │   │   ├── DashboardTab.jsx    # Player cards + settle flow
│       │   │   ├── PaymentModal.jsx    # Partial payment entry
│       │   │   ├── PlayerCard.jsx      # Single player card
│       │   │   └── SettleConfirmModal.jsx
│       │   ├── history/
│       │   │   └── HistoryTab.jsx      # Session list with edit/delete
│       │   ├── layout/
│       │   │   ├── Header.jsx
│       │   │   ├── Navigation.jsx
│       │   │   └── ZenLeaves.jsx
│       │   └── players/
│       │       └── PlayersTab.jsx      # Roster management
│       ├── constants/
│       │   ├── index.js                # Ranks, tabs, sounds, podium config
│       │   └── playerColors.js         # Per-player accent colours
│       ├── context/
│       │   └── ThemeContext.jsx
│       ├── firebase/
│       │   ├── config.js               # Firebase initialisation
│       │   ├── index.js                # Public re-export barrel
│       │   ├── payments.js             # Settle, undo, add/remove payments
│       │   ├── players.js              # Add, soft-delete, restore, permanent-delete
│       │   ├── state.js                # Current data snapshot reference
│       │   ├── subscriptions.js        # onValue listener + UI data builder
│       │   ├── transforms.js           # Raw RTDB → UI data shape
│       │   ├── utils.js                # withTransaction helper
│       │   └── weeks.js                # Add, update, delete sessions + notification trigger
│       ├── hooks/
│       │   ├── useAudio.js             # Web Audio API sound engine
│       │   ├── useDebounce.js
│       │   ├── usePaymentUndo.js       # Per-card payment undo countdown
│       │   ├── usePushNotifications.js # FCM token registration
│       │   ├── useScrolled.js
│       │   ├── useTheme.js             # Dark/light toggle persisted to localStorage
│       │   └── useUndoTimer.js         # Generic undo countdown timer
│       ├── stories/                    # Storybook stories
│       ├── utils/
│       │   ├── calculations.js         # Debt, rankings, breakdowns, achievements
│       │   ├── format.js               # Date and currency formatting
│       │   └── id.js                   # Collision-resistant ID generator
│       ├── App.jsx                     # Root — data subscription, routing, SW message handler
│       └── main.jsx
├── functions/
│   └── index.js                        # Cloud Functions: onSessionAdded · onPlayerAdded · weeklyReminder
├── .github/
│   └── workflows/
│       ├── firebase-hosting-merge.yml  # Deploy on push to main
│       ├── firebase-hosting-pull-request.yml
│       ├── firebase_backup.yml         # Weekly DB backup (Sunday 00:00 UTC)
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

## 🔔 How push notifications work

When a session is added, `addSession()` writes `lastAddedSession: { id, ts }` inside the same Firebase transaction as the session data. The Cloud Function `onSessionAdded` watches `/appData` and fires when `lastAddedSession.id` changes — this is reliable even when sessions are deleted and re-added rapidly, because the ID is always fresh.

The `weeklyReminder` function runs on a Cloud Scheduler cron (`0 19 * * 2`, Europe/Warsaw) and requires `functions.admin` IAM role to deploy — use the local Firebase CLI for the first deploy, GitHub Actions handles subsequent updates.

---

## 🧪 Tests

Unit tests live in `src/__tests__/` and cover:

- `calculations.test.js` — debt calculation, breakdown logic, edge cases (Multisport-only sessions, zero-cost weeks)
- `format.test.js` — date and currency formatting
- `robustness.test.js` — null/undefined/empty data guards
- `components.test.jsx` — basic component rendering
- `hooks.test.js` — custom hook behaviour

```bash
npm test
```

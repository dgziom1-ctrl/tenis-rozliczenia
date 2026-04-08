# 🕹️ Cyber-Pong

> A real-time debt tracker and attendance leaderboard for a private ping-pong & squash group. Who showed up, what they owe, who's on a streak — all in one place.

---

## ✨ Features

### 💰 Dashboard
- Live player cards showing each person's current balance
- **Green** balance display for overpayments (credits), **pink** for outstanding debt
- One-click full settlement with an **8-second undo** window
- Per-card partial payment entry with its own undo countdown
- Detailed debt breakdown — which sessions contributed, how much each cost
- Quick BLIK payment button with the exact amount pre-filled
- Session dot history (last 6 on mobile, last 10 on desktop)

### 📊 Ranking
- Olympic podium (🥇🥈🥉) with ex-aequo support
- Full leaderboard sorted by attendance percentage
- Player ranks: **LEGENDA / MISTRZ / WETERAN / STAŁY / GOŚĆ / DUCH**
- Special title badges: 👑 Król frekwencji · 🔥 Streak · ⚡ Multi King · 💀 Rzadki gość
- Active streak counter shown on each leaderboard row
- **Ranking history chart** — each player's position plotted over time
- **Season selector** — filter all stats by calendar year
- **Per-player modal** — full session drill-down, rank progression bar, and earned achievements
- Achievements: Debiut · Perfekcyjny miesiąc · 10/25/50 sesji · Multisport x5 · Streak milestones (5/10/20/30/50/100)
- Monthly attendance table
- **Yearly Wrapped** — Spotify-style end-of-year summary for past seasons

### ⚙️ Add Session
- Date picker with sport selector: **Ping-Pong** or **Squash**
- Ping-pong quick-cost buttons: FREE / 15 / 30 / 45 / 60 PLN
- Squash quick-cost buttons: 55 / 70 / 85 / 110 / 125 / 140 / 155 / 170 PLN (Multisport holders get a −15 PLN discount; non-Multisport players split the remaining cost equally)
- All players pre-selected; Multisport defaults loaded from settings
- Live per-person cost preview before saving
- Post-save summary modal with a one-tap **"copy to group chat"** message

### 📅 History
- Full session list grouped by month
- **Player filter** — filter history by one or more players
- Attendance trend chart
- Edit and delete — both **password-protected**

### 👥 Players
- Add players; soft-delete to trash with restore option
- Permanent deletion is **password-protected**
- Set a default Multisport roster (auto-checked for every new session)

### 🔔 Push Notifications
Powered by Firebase Cloud Messaging. Automatic triggers:

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
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + CSS custom properties |
| Routing | React Router v7 |
| Database | Firebase Realtime Database |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Backend triggers | Firebase Cloud Functions (Node 20) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |
| Icons | Lucide React |
| Component explorer | Storybook |
| Tests | Vitest + Testing Library |

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
npm run dev          # dev server at http://localhost:5173
npm run storybook    # component explorer at http://localhost:6006
npm test             # unit tests (Vitest)
npm run test:watch   # tests in watch mode
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
│       ├── app/
│       │   ├── App.tsx                 # Root — router setup
│       │   ├── Layout.tsx              # Shell — header, nav, theme, FCM listener
│       │   ├── routes.tsx              # Route definitions
│       │   └── providers/
│       │       ├── AppDataProvider.tsx # Firebase subscription + data context
│       │       ├── ThemeProvider.tsx   # Dark/light toggle persisted to localStorage
│       │       └── ToastProvider.tsx   # Global toast notifications
│       ├── components/
│       │   ├── admin/
│       │   │   ├── AdminTab.tsx            # Add session form
│       │   │   ├── CyberDateInput.tsx
│       │   │   ├── LiveCostPreview.tsx     # Per-person cost preview
│       │   │   ├── PlayerToggleGrid.tsx
│       │   │   ├── SessionSummaryModal.tsx # Post-save summary + copy to chat
│       │   │   └── SportSelector.tsx       # Ping-pong / Squash toggle
│       │   ├── attendance/
│       │   │   ├── AchievementBadge.tsx
│       │   │   ├── AttendanceTab.tsx       # Ranking, podium, history chart, player modal
│       │   │   ├── Leaderboard.tsx
│       │   │   ├── MonthlyReport.tsx
│       │   │   ├── PlayerSessionModal.tsx  # Per-player drill-down modal (portal-rendered)
│       │   │   ├── Podium.tsx
│       │   │   ├── PodiumCard.tsx
│       │   │   ├── RankingHistoryChart.tsx # Position-over-time chart
│       │   │   ├── SeasonSelector.tsx      # Year filter
│       │   │   ├── StreakBadge.tsx
│       │   │   └── WrappedModal.tsx        # Yearly Wrapped stats
│       │   ├── common/
│       │   │   ├── ErrorBoundary.tsx
│       │   │   ├── LoadingSkeleton.tsx
│       │   │   ├── PWAInstallBanner.tsx
│       │   │   ├── PushPermissionBanner.tsx  # FCM opt-in UI
│       │   │   ├── SharedUI.tsx
│       │   │   ├── Toast.tsx
│       │   │   └── UndoBar.tsx
│       │   ├── dashboard/
│       │   │   ├── Barcode.tsx
│       │   │   ├── BreakdownPanel.tsx      # Session/payment detail accordion
│       │   │   ├── ConfettiOverlay.tsx
│       │   │   ├── CornerBrackets.tsx
│       │   │   ├── DashboardTab.tsx        # Player cards + settle flow
│       │   │   ├── PaymentModal.tsx        # Partial payment entry
│       │   │   ├── PlayerAvatar.tsx
│       │   │   ├── PlayerCard.tsx          # Single player card
│       │   │   ├── RankBadge.tsx
│       │   │   ├── SettleConfirmModal.tsx
│       │   │   └── useAnimatedValue.js     # Animated number counter
│       │   ├── history/
│       │   │   ├── AttendanceTrendChart.tsx
│       │   │   ├── DeleteConfirmation.tsx
│       │   │   ├── EditDateInput.tsx
│       │   │   ├── EditSessionForm.tsx
│       │   │   ├── HistoryTab.tsx          # Session list with edit/delete
│       │   │   ├── LogEntry.tsx
│       │   │   └── PlayerFilterSheet.tsx   # Multi-player filter drawer
│       │   ├── layout/
│       │   │   ├── ArenaCanvas.tsx         # Animated ping-pong table canvas
│       │   │   ├── Header.tsx
│       │   │   ├── Navigation.tsx
│       │   │   └── ZenLeaves.tsx
│       │   └── players/
│       │       ├── PlayerProfileCard.tsx
│       │       └── PlayersTab.tsx          # Roster management
│       ├── constants/
│       │   ├── colors.ts                   # Per-player accent colours
│       │   ├── index.ts                    # Ranks, tabs, sounds, sport config
│       │   ├── ranks.ts                    # Rank definitions + podium config
│       │   └── styles.ts                   # Shared FONT / CLIP / PANEL helpers
│       ├── context/
│       │   └── ThemeContext.jsx
│       ├── features/                       # Page-level route components
│       │   ├── admin/AdminPage.tsx
│       │   ├── attendance/AttendancePage.tsx
│       │   ├── dashboard/DashboardPage.tsx
│       │   ├── history/HistoryPage.tsx
│       │   └── players/PlayersPage.tsx
│       ├── hooks/
│       │   ├── useAudio.ts                 # Web Audio API sound engine
│       │   ├── useDebounce.ts
│       │   ├── useFocusTrap.ts             # Keyboard focus management for modals
│       │   ├── useIsMobile.ts
│       │   ├── usePaymentUndo.ts           # Per-card payment undo countdown
│       │   ├── usePushNotifications.ts     # FCM token registration
│       │   ├── useScrolled.ts
│       │   ├── useTheme.ts
│       │   └── useUndoTimer.ts             # Generic undo countdown timer
│       ├── lib/
│       │   └── firebase/
│       │       ├── config.ts               # Firebase initialisation
│       │       ├── index.ts                # Public re-export barrel
│       │       ├── mutations/
│       │       │   ├── payments.ts         # Settle, undo, add/remove payments
│       │       │   ├── players.ts          # Add, soft-delete, restore, permanent-delete
│       │       │   └── sessions.ts         # Add, update, delete sessions
│       │       ├── state.ts                # Current data snapshot reference
│       │       ├── subscribe.ts            # onValue listener + UI data builder
│       │       ├── transaction.ts          # withTransaction helper
│       │       └── transforms.ts           # Raw RTDB → UI data shape
│       ├── stories/                        # Storybook stories
│       ├── types/
│       │   ├── domain.ts                   # Firebase/data domain types
│       │   └── ui.ts                       # UI-layer types (ranks, stats, etc.)
│       └── utils/
│           ├── achievements.ts             # Achievement + badge logic
│           ├── calculations.js             # Debt, rankings, breakdowns (legacy JS)
│           ├── debt.ts                     # Debt calculation helpers
│           ├── format.ts                   # Date and currency formatting
│           ├── id.ts                       # Collision-resistant ID generator
│           ├── message.ts                  # Group chat message formatter
│           ├── rankings.ts                 # Player stat aggregation + ranking
│           ├── sessionCost.ts              # Per-player cost (ping-pong + squash logic)
│           ├── sessions.ts                 # Session grouping + season helpers
│           └── wrapped.ts                  # Yearly Wrapped stats computation
├── functions/
│   └── index.js                            # Cloud Functions: onSessionAdded · onPlayerAdded · weeklyReminder
├── .github/
│   └── workflows/
│       ├── firebase-hosting-merge.yml      # Deploy on push to main
│       ├── firebase-hosting-pull-request.yml
│       ├── firebase_backup.yml             # Weekly DB backup (Sunday 00:00 UTC)
│       └── tests.yml                       # Run Vitest on every PR
├── firebase.json
└── README.md
```

---

## 🧮 How the debt calculation works

### Ping-Pong
Cost is split equally among players who **don't** have Multisport. Players with Multisport attend for free.

### Squash
Everyone pays. Players with Multisport receive a **−15 PLN discount** off the session's base cost; the remaining amount is split equally among all players (Multisport holders pay their share minus the discount).

In both sports, the debt for a player is:

```
debt = sum(costPerSession for each session since last settlement)
     - sum(all recorded payments)
```

A positive value means money is owed; a negative value is a credit (overpayment) carried forward to future sessions.

Settlement records the current net debt as a payment and advances the player's `paidUntilWeek` cursor to the latest session.

---

## 🔔 How push notifications work

When a session is added, `addSession()` writes `lastAddedSession: { id, ts }` inside the same Firebase transaction as the session data. The Cloud Function `onSessionAdded` watches `/appData` and fires when `lastAddedSession.id` changes — this is reliable even when sessions are deleted and re-added rapidly, because the ID is always fresh.

The `weeklyReminder` function runs on a Cloud Scheduler cron (`0 19 * * 2`, Europe/Warsaw) and requires the `functions.admin` IAM role to deploy — use the local Firebase CLI for the first deploy, GitHub Actions handles subsequent updates.

---

## 🧪 Tests

Unit tests live in `src/__tests__/` and cover:

| File | What it tests |
|------|--------------|
| `calculations.test.js` | Debt calculation, breakdown logic, edge cases (Multisport-only sessions, zero-cost weeks) |
| `squash.test.js` | Squash-specific cost splitting and Multisport discount logic |
| `format.test.js` | Date and currency formatting |
| `robustness.test.js` | null/undefined/empty data guards |
| `components.test.jsx` | Basic component rendering |
| `hooks.test.js` | Custom hook behaviour |
| `smoke.test.js` | App-level smoke tests |

```bash
npm test             # run all tests once
npm run test:watch   # watch mode
```

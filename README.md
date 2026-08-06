# 🕹️ Cyber-Ponk

> A real-time debt tracker and attendance leaderboard for a private ping-pong & squash group. Who showed up, what they owe, who's on a streak — all in one place.

---

## ✨ Features

### 💰 Dashboard
- Live player cards showing each person's current balance
- **Green** balance display for overpayments (credits), **pink** for outstanding debt
- Per-card payment entry — full balance or a custom amount — with an **8-second undo** window
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
| Frontend | React 19 + TypeScript (strict) + Vite |
| Styling | Tailwind CSS + CSS custom properties |
| Routing | React Router v7 |
| Database | Firebase Realtime Database |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Backend triggers | Firebase Cloud Functions (Node 22) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |
| Icons | Lucide React |
| Tests | Vitest + Testing Library |

---

## 🚀 Local setup

### Prerequisites
- Node.js 22+
- A Firebase project with Realtime Database and Cloud Messaging enabled

### Install

```bash
git clone https://github.com/your-username/tenis-rozliczenia.git
cd tenis-rozliczenia/frontend
npm ci
```

### Configure

Copy `frontend/.env.example` to `frontend/.env.local` and fill in the values from
your Firebase project (Console → Project settings → Your apps → SDK setup).

> ⚠️ `.env.local` is in `.gitignore` and never committed. Note that every `VITE_`
> variable is embedded in the published bundle and is readable by anyone who opens
> the app — none of them are secrets. See [Security](#-security).

### Run

```bash
npm run dev          # dev server at http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:watch   # tests in watch mode
npm run typecheck    # TypeScript strict check (no emit)
npm run lint         # ESLint
npm run verify       # typecheck + lint + tests — run this before pushing
```

---

## 📦 Deployment

Every push to `main` triggers an automatic deploy via GitHub Actions:

```
git push origin main
```

Pipeline: install → typecheck → lint → test → build → deploy hosting, database rules + functions.

The typecheck and lint steps are blocking, and `npm run build` runs the typecheck
again, so a type error cannot reach production.

A weekly GitHub Action backs up the Realtime Database every Sunday at midnight UTC.
The dump is stripped of `fcmTokens` and uploaded as a **private GitHub Actions
artifact** (90-day retention) — it is never committed to the repository, because it
contains real names and payment amounts.

---

## 🔒 Security

### Database rules

`database.rules.json` is deployed together with the app. It does two things:

- **Locks the shape of the data.** Every field is validated on write: costs and
  payment amounts must be finite numbers within `0 … 100 000`, dates must match
  `YYYY-MM-DD`, player names are capped at 40 characters, `sport` must be one of the
  three known values, and any unknown key is rejected outright. A malformed or
  malicious write cannot corrupt the ledger.
- **Stops the FCM token list from being enumerated.** Individual `fcmTokens/{key}`
  entries are readable and writable (a device needs to register its own), but the
  parent node is not listable, so nobody can dump every push token and user agent.

### Known gap: there is no authentication

`appData` is still world-readable and world-writable. Anyone who knows the database
URL can read the whole ledger and overwrite it with well-formed data. The validation
rules limit *what* can be written, not *who* can write it.

`VITE_ADMIN_PASSWORD` does **not** close this gap. It is compiled into the JavaScript
bundle, so it is visible to anyone who opens the app; it only stops accidental taps on
destructive buttons in the UI.

Closing the gap properly requires picking an identity model — Firebase Anonymous Auth
plus App Check is the lightest option for a private group — and then narrowing the
`.read` / `.write` rules on `appData` to `auth != null`. That is a deliberate product
decision (it changes how members onboard), so it is left open rather than guessed at.

### Hosting headers

`firebase.json` sets HSTS, `X-Content-Type-Options`, `Referrer-Policy`, a restrictive
`Permissions-Policy`, and a Content-Security-Policy that allows only the origins the
app actually uses (Google Fonts, gstatic for the messaging SDK, and Firebase
endpoints). Hashed assets are cached immutably for a year; `index.html` and the
service worker are never cached, so updates land immediately.

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
│       │       ├── themeContext.ts     # Theme tokens + context (no component)
│       │       └── ThemeProvider.tsx   # Dark/light toggle persisted to localStorage
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
│       │   │   ├── LoadingSkeleton.tsx      # InlineSpinner
│       │   │   ├── PWAInstallBanner.tsx
│       │   │   ├── PushPermissionBanner.tsx  # FCM opt-in UI
│       │   │   ├── SharedUI.tsx
│       │   │   ├── Toast.tsx
│       │   │   └── UndoBar.tsx
│       │   ├── dashboard/
│       │   │   ├── Barcode.tsx
│       │   │   ├── BreakdownPanel.tsx      # Session/payment detail accordion
│       │   │   ├── CornerBrackets.tsx
│       │   │   ├── DashboardTab.tsx        # Player cards + payment flow
│       │   │   ├── PaymentModal.tsx        # Payment amount entry
│       │   │   ├── PlayerAvatar.tsx
│       │   │   ├── PlayerCard.tsx          # Single player card
│       │   │   ├── RankBadge.tsx
│       │   │   └── useAnimatedValue.ts     # Animated number counter
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
│       │   │   └── Navigation.tsx
│       │   └── players/
│       │       ├── PlayerProfileCard.tsx
│       │       └── PlayersTab.tsx          # Roster management
│       ├── constants/
│       │   ├── colors.ts                   # Per-player accent colours
│       │   ├── index.ts                    # Ranks, tabs, sounds, sport config
│       │   ├── ranks.ts                    # Rank definitions + podium config
│       │   └── styles.ts                   # Shared FONT / CLIP / PANEL helpers
│       ├── features/                       # Page-level route components
│       │   ├── admin/AdminPage.tsx
│       │   ├── attendance/AttendancePage.tsx
│       │   ├── dashboard/DashboardPage.tsx
│       │   ├── history/HistoryPage.tsx
│       │   └── players/PlayersPage.tsx
│       ├── hooks/
│       │   ├── useAudio.ts                 # Web Audio API sound engine
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
│       │       │   ├── payments.ts         # Add / remove payments
│       │       │   ├── players.ts          # Add, soft-delete, restore, permanent-delete
│       │       │   └── sessions.ts         # Add, update, delete sessions
│       │       ├── state.ts                # Current data snapshot reference
│       │       ├── subscribe.ts            # onValue listener + UI data builder
│       │       ├── transaction.ts          # withTransaction helper
│       │       └── transforms.ts           # Raw RTDB → UI data shape
│       ├── types/
│       │   ├── domain.ts                   # Firebase/data domain types
│       │   └── ui.ts                       # UI-layer types (ranks, stats, etc.)
│       └── utils/
│           ├── achievements.ts             # Achievement + badge logic
│           ├── debt.ts                     # Balance = session costs − payments
│           ├── format.ts                   # Date and currency formatting
│           ├── id.ts                       # Collision-resistant ID generator
│           ├── message.ts                  # Group chat message formatter
│           ├── money.ts                    # Integer-grosz arithmetic + exact allocation
│           ├── rankings.ts                 # Player stat aggregation + ranking
│           ├── sessionCost.ts              # Single source of truth for cost splitting
│           ├── sessions.ts                 # Session grouping + season helpers
│           ├── validation.ts               # Input guards for everything written to the DB
│           └── wrapped.ts                  # Yearly Wrapped stats computation
├── functions/
│   ├── index.js                            # Cloud Functions: onSessionAdded · onPlayerAdded
│   └── sessionCost.js                      # Cost-splitting port kept in sync by a parity test
├── database.rules.json                     # RTDB schema validation + access rules
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
debt = sum(costPerSession for every session the player attended)
     - sum(every payment recorded for that player)
```

A positive value means money is owed; a negative value is a credit (overpayment) carried forward to future sessions.

The `payments` ledger is the single source of truth. Paying off a balance simply appends a payment for the outstanding amount.

### Every split is exact to the grosz

All money arithmetic runs on **integer grosze**, never on floating-point złoty, and
every division uses the largest-remainder method (`utils/money.ts`). The sum of the
players' shares is therefore always exactly equal to the session cost — the split
never invents or loses a grosz.

Concretely, 100 zł between three players comes out as `33.34 + 33.33 + 33.33 = 100.00`.
Rounding each share independently, as the app used to, would give `33.33 × 3 = 99.99`
and quietly drop a grosz on every indivisible session.

`utils/sessionCost.ts` is the only place this logic lives. `debt.ts`, the history
view, and the Cloud Functions notification text all call into it, so a balance, a card,
and a push notification can never disagree. (The Cloud Functions copy is a separate
CommonJS file for packaging reasons; `functionsParity.test.js` fails the build if the
two ever diverge.)

### Writes are idempotent

`addPayment` accepts a caller-supplied payment id and refuses to append the same id
twice, so a double-tap, a retry after a timeout, or two open tabs cannot record the
same payment twice. When a write exceeds its timeout the result is reported as
*indeterminate* rather than failed — the app tells you to refresh and check instead of
inviting a retry that might double-charge.

Undo removes exactly the payment it created, identified by id. It no longer restores a
client-side snapshot of the payment list, which used to erase any payment added from
another device in the meantime.

Older versions kept a second, parallel record — `paidUntilWeek[player]`, a cursor meaning "settled up to this session" that zeroed out the cost of every earlier session. Two independent records of the same thing cannot be kept in sync: a cursor sitting next to a payment history wipes the session costs while the payments remain, turning the whole history into a phantom overpayment worth hundreds of złoty. Those old settlements now live in the `payments` ledger as ordinary entries, and the app no longer reads `paidUntilWeek` at all, so a stray value there cannot affect anyone's balance.

---

## 🔔 How push notifications work

When a session is added, `addSession()` writes `lastAddedSession: { id, ts }` inside the same Firebase transaction as the session data. The Cloud Function `onSessionAdded` watches `/appData` and fires when `lastAddedSession.id` changes — this is reliable even when sessions are deleted and re-added rapidly, because the ID is always fresh.

Notification amounts are computed by `functions/sessionCost.js`, a port of the app's
cost-splitting logic that `functionsParity.test.js` keeps byte-for-byte in agreement —
a push notification can never quote a different figure than the player's card.

> ⚠️ The Tuesday `weeklyReminder` job is **not in this repository**. It lives only in the
> deployed Firebase project (Cloud Scheduler cron `0 19 * * 2`, Europe/Warsaw), and CI
> deploys only `onSessionAdded` and `onPlayerAdded`. If it ever needs changing, its source
> has to be recovered from the Firebase console first.

---

## 🧪 Tests

Unit tests live in `src/__tests__/` and cover:

| File | What it tests |
|------|--------------|
| `calculations.test.js` | Debt calculation, breakdown logic, edge cases (Multisport-only sessions, zero-cost weeks) |
| `squash.test.js` | Squash-specific cost splitting and Multisport discount logic |
| `format.test.js` | Date and currency formatting |
| `robustness.test.js` | null/undefined/empty data guards, mutation validation, payment idempotency |
| `functionsParity.test.js` | Cloud Functions and the app agree on every cost split, to the grosz |
| `components.test.jsx` | Basic component rendering |
| `hooks.test.js` | Custom hook behaviour |
| `smoke.test.js` | App-level smoke tests |

```bash
npm test             # run all tests once
npm run test:watch   # watch mode
```

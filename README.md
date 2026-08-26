# 🕹️ Cyber-Ponk

> A real-time debt tracker and attendance leaderboard for a private ping-pong, squash, badminton & padel group. Who showed up, what they owe, who's on a streak — all in one place.

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
- Date picker with sport selector: **Ping-Pong**, **Squash**, **Badminton** or **Padel**
- Cost field takes the amount actually paid at the reception desk, after Multisport cards
- Multisport holders get a **−15 PLN discount** off their share, in every sport
- Racket rental (squash, badminton, padel): count × price, split among players without their own racket
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
npm run lint:css     # fails on unused classes / @keyframes in src/index.css
npm run lint:orphans # fails on modules under src/ that nothing imports
npm run verify       # everything above + tests — run this before pushing
```

`lint:css` and `lint:orphans` cover the two blind spots the compiler has: an unused
CSS rule and an unimported module both typecheck perfectly. A selector built at
runtime (like `card-stagger-${n}`) has to be whitelisted in
`frontend/scripts/find-unused-css.mjs`, otherwise it is reported as dead.

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
endpoints).

### Why the app never needs "clear site data"

Every build gives the JS and CSS new content-hashed names, and Hosting only serves
the current release's files. That combination has exactly one catastrophic failure
mode: if the browser ends up with a bad response stored under a hashed URL, or with
an `index.html` naming chunks that no longer exist, the app stops loading and stays
broken across reloads *and* across browsers. Five independent layers make that
unrecoverable state impossible. Order matters — each one catches what the previous
one missed.

**1. Nothing is reusable without revalidation by default; only hashed assets and
icons opt back in.** The `**` rule sets `no-cache, must-revalidate`, and just two
later rules grant caching: images get a day, `/assets/**` gets a year. This ordering
is deliberate, because overlapping header rules in `firebase.json` follow **last
match wins** (unlike rewrites, which are first match wins). Inverting the default
this way covers every HTML route — present, future, any depth — without a pattern
that has to enumerate routes, and `no-cache` forbids reusing a stored response
without checking it with the server, which removes the "old shell asks for deleted
chunks" scenario at the source. `no-store` would give the same freshness guarantee
but also disqualifies the page from the back/forward cache, making every back
navigation re-run the whole boot sequence, so `no-cache` is the better trade.
Note that the Hosting **emulator does not apply `headers` at all** (verified: it
returns neither `Cache-Control` nor CSP), so this config cannot be checked locally
— which is why it sticks to glob syntax already proven in this project rather than
anything exotic.

**2. Hashed assets are cacheable, but not `immutable`.** Hosting applies header
rules by request path, including to `404` responses, so a request that races a
deploy can store a 404 under a content-hashed name. With `immutable` the browser
refuses to revalidate that entry even on an explicit reload, and because Vite hashes
by content the same filename reappears in later deploys — the poisoned entry then
shadows a file that exists again. This was the actual cause of the "only clearing
site data helps" reports, and it explains why every browser on a device broke
separately: each keeps its own HTTP cache. Dropping `immutable` is what lets a
reload heal it — but only that, so do not mistake it for the whole fix. Chrome
revalidates only the main resource on a normal reload, and an installed iOS PWA has
no reload affordance at all, so on the two platforms where this hurt most the
header change alone is not enough. Layers 4 and 5 are what actually close it, both
by fetching with `cache: 'reload'`, which is the one mode that bypasses a poisoned
entry *and* overwrites it.

**3. A missing chunk returns 404, not HTML.** The SPA rewrite is `!/assets/**`
rather than `**`. With a plain catch-all, a request for a deleted chunk gets
`200 text/html`, and the browser stores that HTML *as* the chunk. Excluding the
asset directory keeps misses honest.

**4. The Service Worker never caches a failure.** `public/firebase-messaging-sw.js`
handles both push and app-shell caching — one worker, because only one can own the
`/` scope and two registrations would evict each other. Its invariants are covered
by `src/__tests__/serviceWorker.test.js`, which runs the deployed file in a stubbed
worker scope: only `200` responses are ever written to a cache, navigations are
network-first so a fresh `index.html` always wins, every network call has a timeout
so a hung request can't block a start that a cached copy could serve, cache names
carry a build id so shell and chunks never mix across releases, and the worker never
intercepts its own script — otherwise it could persist a broken version of itself
and cut off the only route to a fix. Every fetch it makes uses `cache: 'reload'`, so
a poisoned HTTP entry can neither be copied into the worker's cache nor survive the
request. One subtlety worth keeping: a 200 is not enough to trust a response,
because the SPA rewrite answers any missing path outside `/assets/` with
`index.html`. Caching that under a script or icon URL would be the same permanent
wrong-content failure as caching a 404, so content type is checked too.

At install time it stores the whole release, using the asset list injected by the
plugin in `vite.config.ts`. Reading that list from `index.html` is not enough: the
document only names the chunks needed immediately, so offline the first visit to a
lazily-loaded tab would fail. As a result the app now opens offline on every tab.

**5. A boot guard outside the bundle.** `public/boot-guard.js` is loaded
synchronously from `index.html`. It lives outside the bundle on purpose: when the
failing file *is* the entry chunk, nothing inside the bundle can run, and the
previous recovery code — which shipped inside that chunk — could never fire. It is
also a separate file rather than an inline script because the CSP has no
`'unsafe-inline'` in `script-src`. It watches for a `ready()` signal from `App.tsx`
and, if the app doesn't start or a chunk fails to load, walks an escalating ladder:
refetch every file of the release with `cache: 'reload'` (the only thing that
actually overwrites a poisoned HTTP cache entry) → unregister the worker and drop
all caches → wipe `localStorage`, `sessionStorage` and IndexedDB. If all of that
fails it draws a rescue screen from bare DOM with a one-click full reset, so a user
is never left on a blank page. Two details are load-bearing and both have regression
tests in `src/__tests__/bootGuard.test.js`: the attempt counter lives in
`localStorage` (`sessionStorage` is wiped on every PWA launch) and survives both a
successful start and the storage wipe of its own final rung — otherwise the ladder
resets to the first rung every cycle and the browser reloads a blank page forever
instead of ever reaching the rescue screen.

Two rules keep layer 5 from becoming its own problem, because "failed to fetch
dynamically imported module" is the *same* message a momentary network drop
produces, and `navigator.onLine` still reports "online" inside a tunnel. First, the
rescue screen only ever appears when the app has *not* started; if it is already on
screen the ladder declines and `LazyPage` reports the failure in place, so an
overlay never buries a working UI over one file. Second, a running app may only
reach rung 1 — refetch and reload, once. Unregistering the worker and wiping
storage are reserved for a start that failed outright, and an attempt that could not
run at all (offline, or ladder exhausted) does not consume a rung, so a few
trips through a dead zone can't spend the budget before a real failure needs it.

Two smaller guards sit alongside these. `AppDataProvider` releases the render gate
after 15 s and shows the UI plus an offline banner, because Firebase `onValue` never
reports an error when the socket simply can't be established — the loading screen
would otherwise hang forever behind a Retry button that re-armed the same hang. And
`LazyPage` wraps each route in its own error boundary, so one failed chunk breaks a
single tab instead of the whole app, and it reports the failure in place whenever
automatic recovery declined to run.

### Why losing the network never strands the app

Loading the code is only half the problem; the app also has to survive losing the
database. A reported failure made that concrete: with the phone offline a user
settled a player, turned the network back on, and the app then sat on "CONNECTING TO
FIREBASE" before falling through to an empty screen. Two fixes and one hard-won
prohibition came out of it, all covered by
`src/__tests__/connectionResilience.test.js` and
`src/__tests__/appDataProvider.test.jsx`.

**A write started offline poisons reads.** `runTransaction` called with no
connection never settles — it parks in the SDK as an outstanding transaction, and
while one is outstanding Firebase withholds server updates for that node. The write
"failing" in the UI did not undo it, so after reconnecting the listener received
nothing and the app stayed empty. Worse, such a transaction can commit much later,
long after the user was told it failed. `withTransaction` now refuses up front when
`navigator.onLine` is false, which leaves no pending state behind. (`onLine` is
unreliable for proving you *are* online, but a `false` is trustworthy, which is
exactly the direction this guard needs.)

**Do not fight the SDK for the connection.** This one is a warning, not a feature.
The SDK ignores the browser's network events and retries with a growing delay, so
the tempting fix is to force a reconnect with a `goOffline`/`goOnline` pair. That
was tried and it was much worse than the problem: at startup there is no connection
yet, so the supervisor fired immediately and cut the SDK off mid-handshake, and
because it repeated faster than a phone can complete one, the app stopped connecting
at all — on every device, including a freshly cleared profile and private mode. The
supervisor is gone; `src/__tests__/connectionResilience.test.js` fails if any source
file calls `goOffline` again. Left alone, the SDK reconnects within tens of seconds,
and until it does the app shows the remembered data with a banner and a retry
button. Slower, but it cannot leave the app unable to start.

**A cold start had nothing to show.** Every launch began from zero and waited for
the database, so with no signal the user got empty lists and reasonably concluded
the app was broken. The last snapshot that parsed cleanly is now kept in
`localStorage` (`snapshotCache.ts`) and restored at startup, so the app opens with
real content and the banner explains it may be stale. It is a cache, never a source
of truth: any snapshot from the database overwrites it, it is only written after
`buildUIData` succeeded so malformed data can never enter it, and it is validated
and version-checked on read — a corrupt entry is ignored rather than becoming a new
way to break startup.

---

## 🏗️ Project structure

```
tenis-rozliczenia/
├── frontend/
│   ├── public/
│   │   ├── boot-guard.js               # Self-repair outside the bundle (see resilience section)
│   │   ├── firebase-messaging-sw.js    # Service Worker — app-shell cache + push
│   │   ├── manifest.json               # PWA config
│   │   ├── icon-192v2.png
│   │   └── icon-512v2.png
│   └── src/
│       ├── app/
│       │   ├── App.tsx                 # Root — router setup
│       │   ├── Layout.tsx              # Shell — header, nav, theme, FCM listener
│       │   ├── routes.tsx              # Route definitions
│       │   └── providers/
│       │       ├── AppDataProvider.tsx # Firebase subscription + remembered-data startup
│       │       ├── themeContext.ts     # Theme tokens + context (no component)
│       │       └── ThemeProvider.tsx   # Dark/light toggle persisted to localStorage
│       ├── components/
│       │   ├── admin/
│       │   │   ├── AdminTab.tsx            # Add session form
│       │   │   ├── CyberDateInput.tsx
│       │   │   ├── LiveCostPreview.tsx     # Per-person cost preview
│       │   │   ├── PlayerToggleGrid.tsx
│       │   │   ├── SessionSummaryModal.tsx # Post-save summary + copy to chat
│       │   │   └── SportSelector.tsx       # Ping-pong / Squash / Badminton / Padel toggle
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
│           ├── bootRecovery.ts             # Bridge to public/boot-guard.js
│           ├── debt.ts                     # Balance = session costs − payments
│           ├── format.ts                   # Date and currency formatting
│           ├── id.ts                       # Collision-resistant ID generator
│           ├── message.ts                  # Group chat message formatter
│           ├── money.ts                    # Integer-grosz arithmetic + exact allocation
│           ├── rankings.ts                 # Player stat aggregation + ranking
│           ├── serviceWorker.ts            # Worker registration + update checks
│           ├── sessionCost.ts              # Single source of truth for cost splitting
│           ├── sessions.ts                 # Session grouping + season helpers
│           ├── validation.ts               # Input guards for everything written to the DB
│           └── wrapped.ts                  # Yearly Wrapped stats computation
├── functions/
│   ├── index.js                            # Cloud Functions: onSessionAdded · onPlayerAdded
│   └── sessionCost.js                      # Cost-splitting port kept in sync by a parity test
├── database.rules.json                     # RTDB schema validation + access rules
├── .github/
│   ├── scripts/
│   │   └── backup-rtdb.mjs                 # Dependency-free RTDB dump via REST API
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

### One rule for every sport

The amount you enter is **what you actually paid at the reception desk** — the court
price minus 15 PLN for every Multisport card handed over. To give that rebate back to
whoever brought the card, the split reconstructs the undiscounted price and subtracts a
flat −15 PLN from each card holder:

```
base       = (amountPaid + cardsPresent × 15) / playersPresent
share(p)   = base − (p has Multisport ? 15 : 0)     // never below 0
```

Everyone present pays a share, and the shares always add up to the amount paid.
A card is worth exactly 15 PLN to its holder, whatever the venue charges — so an
odd court price (41 PLN with two cards → 11 PLN to settle) is split fairly instead
of landing on whoever happened not to have a card.

When the share is smaller than the discount, the card holder simply pays 0 and the
unused part of the rebate is spread over everyone else, so the total still matches
what was paid. The split reports this as `discountCapped`, and the add-session form
warns about it — it usually means the amount entered is too low for that many cards.

Racket rental (squash, badminton, padel) is carved out of the total first and split
equally among the players who did **not** bring their own racket, outside the discount.

The debt for a player is:

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
view, the live preview, the group-chat message, and the Cloud Functions notification
text all call into it — via `getSessionShares` for balances and `getShareGroups` for
the per-group rates on screen — so a balance, a card, and a push notification can
never disagree. Nothing outside that module re-derives a rate from the formula above:
doing so used to make the preview quote a price nobody would actually pay. (The Cloud
Functions copy is a separate CommonJS file for packaging reasons;
`functionsParity.test.js` fails the build if the two ever diverge.)

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
| `sessionCost.test.js` | Cost splitting and the Multisport discount, across all four sports |
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

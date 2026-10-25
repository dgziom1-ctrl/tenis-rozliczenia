# Cyber-Ponk

[English](README.md) · [Polski](README.pl.md)

A web app for tracking attendance and court costs for a sports group. It supports table tennis, squash, badminton and padel, and calculates each player’s balance from recorded sessions and payments. The interface is currently in Polish.

## What it does

- Records sessions, attendees, court count and duration, MultiSport cards and (where supported) racket hire. Shows a cost preview and can prepare a summary to copy to the group chat.
- Tracks each player’s balance with a breakdown by session and payment. Payments are entered in the app; bank or BLIK transfers happen separately.
- Keeps a searchable session history with player, sport and year filters, editing, deletion and CSV export.
- Shows attendance rankings, monthly summaries, ranking history, streaks and achievements. Stats can be viewed by year.
- Manages the player roster, including a reserve list and default MultiSport selections.
- Supports optional web push notifications for new sessions, streak milestones and new players. The site can also be installed as a PWA.

## Cost calculation

Enter the amount actually paid for the court, after any MultiSport reductions. The split uses a nominal PLN 15 discount per eligible MultiSport card. For sessions with court and duration details, the number of cards that count depends on sport, court count and session duration; if that allowance is exceeded, the available discount is scaled across card holders. For squash, badminton and padel, racket hire is added separately and shared among attendees without their own racket. Calculations use whole grosze.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Routing | React Router |
| Data | Firebase Realtime Database |
| Push and backend | Firebase Cloud Messaging, Cloud Functions (Node.js 22) |
| Hosting | Firebase Hosting |
| Tests | Vitest, Testing Library |

## Run locally

Requirements: Node.js 22 or newer.

```bash
git clone https://github.com/dgziom1-ctrl/tenis-rozliczenia.git
cd tenis-rozliczenia/frontend
npm ci
npm run dev
```

By default, `npm run dev` uses the sample data configured in `frontend/.env.development`. The header marks this as demo mode, and changes are not saved.

To connect the development app to your own Firebase project, run `cp .env.example .env.development.local` from `frontend/`, fill in the Firebase web config, enable Realtime Database and set `VITE_DEMO_DATA=0`. To test push notifications, configure Firebase Cloud Messaging and add the web-push VAPID key. The `.env.development.local` file is ignored by Git.

All `VITE_` variables are included in the browser build. Do not put service-account keys or other private credentials in them. See [Security and data](#security-and-data) before connecting a real database.

This repository contains settings for one group. Before reusing it elsewhere, review `ORGANIZER_NAME`, the MultiSport discount and limits, and the default racket price in `frontend/src/constants/index.ts`. The BLIK number is configured with `VITE_BLIK_NUMBER`.

## Checks

Run these commands from `frontend/`:

```bash
npm test          # run the test suite
npm run test:watch
npm run verify    # typecheck, lint, audits and tests
npm run build
```

## Project layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React application and its tests |
| `functions/` | Cloud Functions for session and player notifications, plus the server-side cost-splitting implementation |
| `database.rules.json` | Realtime Database access rules and data validation |
| `firebase.json` | Firebase Hosting, database and Functions configuration |
| `.github/workflows/` | Checks, Hosting previews, deployment and database backup |

## Deployment and backups

GitHub Actions is configured to run checks on pull requests and deploy on pushes to `main`. The deployment publishes the frontend to Firebase Hosting, the Realtime Database rules and the two functions in `functions/index.js` (`onSessionAdded` and `onPlayerAdded`). It requires the Firebase secrets configured in the repository.

A scheduled workflow runs on Sundays at 00:00 UTC and uploads a Realtime Database backup as a GitHub Actions artifact with 90-day retention. It removes `fcmTokens`; player names, sessions and payment records remain in the backup, so treat the artifact as sensitive.

## Security and data

**The rules checked into this repository do not provide access control.** The app does not use Firebase Authentication. `database.rules.json` grants unauthenticated reads of `appData` and accepts writes that pass its data-shape validation. Those checks constrain the data, not who can access it; the database URL is part of the frontend configuration. If these rules are deployed, the ledger is publicly accessible. Treat player and payment data as public unless the deployed rules have been changed and verified.

`VITE_ADMIN_PASSWORD`, if configured, is shipped in the frontend bundle. It only gates some actions in the interface; it is not a security boundary. Do not treat the database as private or rely on that password to protect real player or payment data. Proper protection requires authentication and stricter database rules.

## Offline behavior

After the app has loaded online, it can use cached application files and the last database snapshot saved on that device. Changes are not queued for later: adding a session or recording a payment requires a network connection.

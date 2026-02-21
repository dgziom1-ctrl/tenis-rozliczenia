# 🏓 Ping-Pong Settlement System

> A real-time, cyberpunk-styled application for tracking payments and attendance for a ping-pong crew. Built for speed, designed for clarity.

---

## ✨ Features

- 💸 **Payment Tracking** – Track who owes what for table rentals
- ✅ **One-Click Updates** – Mark players as paid instantly
- 📊 **Dynamic Rankings** – Legend / Master / Regular / Guest / Ghost
- 📅 **Session History** – Full history of all games organized by month
- 🔄 **Real-time Sync** – Updates visible instantly for all users
- 🏓 **Retro Vibes** – Animated pong header & retro sound effects (Web Audio API)

---

## 🛠️ Tech Stack

| Layer        | Technology                 |
|-------------|----------------------------|
| Frontend    | React 19 + Vite            |
| Styling     | Tailwind CSS               |
| Database    | Firebase Realtime Database |
| Hosting     | Firebase Hosting           |
| CI/CD       | GitHub Actions             |

---

## 🚀 Local Setup

```bash
# Clone the repository
git clone https://github.com/dgziom1/tenis-rozliczenia.git
cd tenis-rozliczenia/frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

---

## 📁 Repository Structure

```
tenis-rozliczenia/
├── frontend/              # React app (Vite + Tailwind)
│   ├── src/
│   │   ├── firebase.js    # Entire "backend" logic via Firebase SDK
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── dashboard/
│   │       ├── admin/
│   │       ├── attendance/
│   │       ├── history/
│   │       ├── players/
│   │       └── layout/
│   └── dist/              # Build output (auto-generated)
├── public/                # Legacy HTML version
├── firebase.json          # Firebase Hosting configuration
└── .github/
    └── workflows/         # GitHub Actions – auto-deploy on push
```

---

## 🔄 Deployment

Any push to the `main` branch automatically triggers GitHub Actions:

1. Install dependencies (`npm install`)
2. Build the app (`npm run build`)
3. Deploy to Firebase Hosting

---

## 🤝 Shoutout

This project is a family collaboration ❤️  

Huge respect to **@k-michalek** for creating the original React frontend and the cyberpunk aesthetic as part of his **cyber-pong-club** project.

This version reuses his frontend components and styling while replacing the Python backend with **Firebase Realtime Database**.

Thanks for the solid foundation! 🙏🏓

# 🏓 Cyber Pong UI (Frontend)

This is the user interface for the Ping Pong Club settlement system. The application is built with a modern "Cyberpunk / Retro-Neon" aesthetic, is fully responsive (Mobile First), and features built-in 8-bit sound effects.

## 🛠️ Tech Stack
* **Framework:** React 18 + Vite
* **Styling:** Tailwind CSS v3
* **Icons:** Lucide React
* **Audio:** Web Audio API (sounds generated on the fly)

---

## 🚀 Local Setup & Development

A working [Node.js](https://nodejs.org/) environment is required.

### 1. Install dependencies
```bash
npm install
```

### 2. Run the development server
```bash
npm run dev
```
*The application will start by default at: `http://localhost:5173`. Make sure the FastAPI backend is running in a separate terminal on port 8000.*

---

## 🎨 UI Structure & Tailwind CSS

This project relies heavily on custom Tailwind utility classes to achieve its signature neon look.

Key configuration files:
* `tailwind.config.js` - Main Tailwind configuration.
* `src/index.css` - Contains dedicated custom component classes, such as:
  * `.cyber-box` (neon container styling)
  * `.mini-paddle` & `.header-paddle` (pure CSS animated ping pong paddles)
  * `.ping-pong-loader` (the animated bouncing ball under the title)

*Important: This application uses Tailwind CSS version 3. Ensure you do not upgrade to v4 without first verifying and migrating the CSS configuration structure.*
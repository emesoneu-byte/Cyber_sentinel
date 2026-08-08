# CyberSentinel

Social Engineering Awareness & Simulation Platform — final year project.

Train users to recognise phishing, vishing, smishing, pretexting, baiting, physical social engineering, and AI/deepfake attacks through interactive simulations, learning modules, a knowledge quiz, phishing campaigns, and an AI coach.

## Requirements

- Node.js 18+
- npm

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env if needed (JWT secrets, optional ANTHROPIC_API_KEY for AI coach)
npm install
npm run dev
```

API: http://localhost:5000/api/v1  
Health: http://localhost:5000/api/v1/health

Default admin (created on first start; password is **re-synced from `.env` every time the backend starts**):

- Email: `admin@cybersentinel.local`
- Password: `Admin@CyberSentinel2026!`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:3000

## Modules

| Module | Description |
|--------|-------------|
| **Learning hub** | Theory modules by attack type |
| **Simulations** | Interactive scenarios organised in **sections** (phishing, vishing, …) |
| **Knowledge Quiz** | Theory MCQ (separate from simulations) |
| **AI Coach** | Chat help — works offline by default; set `ANTHROPIC_API_KEY` for live Claude |
| **My report** | Personal pass rates and recommendations |
| **Leaderboard** | XP ranking |
| **Admin panel** | Users, org stats, email templates, phishing campaigns, audit log (admin role only) |
| **My profile** | Department and password change |
| **About / Help** | Aims, objectives, XP rules |

## XP rules

- Simulations: XP only on **correct** answers the **first time** you pass a scenario
- Failed answers: **0 XP**
- Quiz: XP only on the **first** full attempt; retakes award 0 XP

## Tech stack

- Frontend: React 18, TypeScript, Vite
- Backend: Express, TypeScript, sql.js (SQLite)
- Auth: JWT access + refresh tokens, bcrypt passwords

## Project structure

```
backend/     API server
frontend/    React SPA
```

## Notes for demonstration

1. Register a normal user or log in as admin.
2. Complete a simulation section (e.g. Phishing) — fail once to show 0 XP, then pass.
3. Take the Knowledge Quiz once for XP.
4. As admin: open **Admin panel** → Campaigns → create from a template → Launch.
5. Campaign emails need a working SMTP (or MailHog on port 1025); without SMTP, launches may show failed sends but the flow still demonstrates the UI.

## Licence

Academic / final year project use.

## Troubleshooting

### `[nodemon] app crashed`

Scroll **up** in the terminal — the real error is a few lines above that message.

**Port already in use**
```bash
# macOS / Linux
lsof -ti:5000 | xargs kill -9
# or use another port
echo "PORT=5001" >> backend/.env
```

**Missing modules**
```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

**See the full error without nodemon**
```bash
cd backend
npm run dev:plain
```

**Windows (PowerShell) — free port 5000**
```powershell
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```



## Open on a phone (easy — one link)

Keep backend + frontend running on your PC, then:

```bash
cd frontend
npm run share
```

Open the `https://….loca.lt` URL on the phone. No IP address steps.
See `SHARE_ON_PHONE.md` for details.


## Mobile

The UI is responsive under 768px (hamburger navigation, single-column section cards, scrollable tables). Use a modern mobile browser. Best experience after hosting on HTTPS.


## Real campaign email delivery

1. Edit `backend/.env` with SMTP settings (see `.env.example` for Gmail / Brevo).
2. Set `EMAIL_FROM` to the same address as `SMTP_USER` (required for Gmail).
3. Set `TRACKING_BASE_URL` to your public API URL when hosted, e.g. `https://api.example.com/api/v1/track`.
4. Restart backend → Admin → Campaigns → **Test SMTP**.
5. Create template → create campaign → **Launch**.

**Note:** Public providers (Gmail, etc.) send from *your* mailbox. The template’s display name is used; fully spoofed domains usually will not deliver. That is enough for a controlled final-year demo to registered users’ real inboxes.

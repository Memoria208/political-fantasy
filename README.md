> *"Who's actually voting in Congress?"*
> *"Can I beat my friends with my politician picks?"*

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=FF6B6B&width=500&lines=Fantasy+League+For+Congress;Draft+Real+Politicians;Real+Voting+Data;React+%7C+Python+%7C+GovTrack+API)](https://git.io/typing-svg)

# Political Fantasy

A competitive fantasy league game where you draft **real US politicians** and score points based on their voting records, sponsored bills, and legislative wins. Built for everyone who's ever wondered: "Who are these people actually working for?"

Because Congress shouldn't feel like a chore. Make it a game.

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.9+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![GovTrack](https://img.shields.io/badge/GovTrack_API-4A90E2?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjMiIGZpbGw9IiNmZmYiLz48L3BhdHRlcm4+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+)

---

## What is this?

Most people tune out Congress because it's complicated and boring. But what if you could **draft** your favorite politicians like a fantasy sport, compete with friends, and actually track whether your picks are making moves?

Political Fantasy turns the chaos of Capitol Hill into a competitive game. You draft real senators and representatives, score points based on their legislative wins (sponsored bills, votes on key legislation, etc.), and climb leaderboards. It's fantasy football for civics.

The live demo shows everything without requiring sign-up.

---

## Features

✅ **Create & manage multiple leagues** — Public or private, you control the rules  
✅ **Draft real politicians** — Senators and Representatives from real Congress  
✅ **Real-time scoring** — Points based on actual voting records from GovTrack  
✅ **Leaderboards & stats** — See who's ahead, track your team performance  
✅ **Responsive design** — Works on desktop, tablet, mobile  
✅ **User authentication** — Secure accounts, persistent league data  

---

## Tech stack

**Front end** — React 19 · Vite · React Router · Axios · Responsive CSS

**Back end** — Python 3.9+ · FastAPI · SQLAlchemy ORM · SQL database

**Data** — GovTrack API (real congressional voting records & legislative data)

**Deployment** — Vercel (frontend) · Railway (backend)

---

## Try it now

**Live demo:** [political-fantasy.vercel.app](https://political-fantasy.vercel.app)

No sign-up needed to explore the demo page.

---

## Run it locally

### Prerequisites
- Python 3.9+
- Node.js 18+ & npm
- MySQL/PostgreSQL (or SQLite for local dev)

### 1. Clone & set up the repo
```bash
git clone <repo-url>
cd political-fantasy
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the backend
```bash
uvicorn main:app --reload
```
Runs on `http://localhost:8000`

### 4. Frontend setup
```bash
cd ../frontend-app
npm install
npm run dev
```
Runs on `http://localhost:5173`

---

## API endpoints

### Leagues
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leagues` | Get all leagues |
| POST | `/api/leagues` | Create a new league |
| GET | `/api/leagues/{id}` | Get league by ID |
| PUT | `/api/leagues/{id}` | Update league settings |
| DELETE | `/api/leagues/{id}` | Delete a league |

### Draft & Rosters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leagues/{id}/roster` | Get your roster |
| POST | `/api/leagues/{id}/draft` | Draft a politician |
| PUT | `/api/leagues/{id}/roster/{id}` | Update roster |
| DELETE | `/api/leagues/{id}/roster/{id}` | Drop a politician |

### Leaderboards & Scoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leagues/{id}/leaderboard` | Get league leaderboard |
| GET | `/api/politicians` | Get available politicians |
| GET | `/api/politicians/{id}/stats` | Get politician stats (votes, bills) |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |

---

## How scoring works

**Voting on major bills** → +5 points  
**Sponsoring a bill** → +10 points  
**Co-sponsoring** → +3 points  
**Committee leadership** → +15 points  
**Bill passed** (you sponsored) → +20 points  

Real-time updates mean your scores change as Congress acts. Watch your picks make an impact.

---

## Screenshots

_Add screenshots of:_
- League creation
- Draft interface
- Politician cards with stats
- Leaderboard view
- Mobile view

---

## Known issues & roadmap

🔄 **In progress:**
- Filtering politicians by party, state, committee
- Historical stats and season archives
- Mobile app (React Native)
- Multiplayer chat in leagues

🐛 **Known:**
- GovTrack API occasionally lags by a few hours
- Occasional rate limiting on API calls (working on it)

---

## Why this exists

Congress affects your life. But most people don't follow it because the information is scattered, dense, and boring. Political Fantasy makes it **competitive and fun** — you learn who your representatives actually are while playing a game with friends.

It's civic engagement that doesn't feel like homework.

---

## Contributing

Interested in adding features or fixing bugs? PRs welcome. Areas we're looking for help:

- UI/UX improvements
- Additional data sources beyond GovTrack
- Scoring algorithm refinements
- Documentation

---

## License

MIT

---

## Author

**Tammy** — Full-stack development · Back-End Development Certificate (Idaho State University / Promineotech) · Computer Science (College of Western Idaho)

---

Made with ❤️ for people who want Congress to be interesting.

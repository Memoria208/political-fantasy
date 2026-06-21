# Political Fantasy — Project Foundation

Fantasy football mechanics applied to U.S. Congress.
Draft real legislators, score points on their real legislative activity.

---

## Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Frontend  | React + Tailwind              |
| Backend   | Python / FastAPI              |
| Database  | PostgreSQL                    |
| Scoring   | Congress.gov API v3 (free)    |
| Auth      | Supabase (free tier)          |
| Hosting   | Railway or Render             |

---

## Data Model

```
User ──< LeagueMember >── League
                │
                └──< RosterSlot >── Politician
                                        │
                                    ScoreEvent[]
```

### Key Tables

**politicians** — seeded from Congress.gov API, ~535 members of Congress
**leagues** — one commissioner, up to 8 teams, snake draft
**league_members** — join table, holds team name + total_score
**roster_slots** — picks (politician → team), with optional cabinet flavor role
**draft_picks** — immutable draft history
**score_events** — one row per scoring action, unique-constrained to prevent doubles
**weekly_snapshots** — end-of-week score totals for leaderboard history

---

## Scoring System

| Action                  | Points |
|-------------------------|--------|
| Bill introduced         | +5     |
| Bill passed committee   | +10    |
| Bill signed into law    | +25    |
| Voted with party        | +2     |
| Voted against party     | +8     |
| Missed vote             | −3     |
| Floor speech            | +1     |
| Committee hearing       | +3     |

Source: Congress.gov API v3 — maintained by the Library of Congress.
Free key at: https://api.congress.gov/sign-up/

---

## Setup

### 1. Install PostgreSQL

Download and install from: https://www.postgresql.org/download/windows/

Use the default installer (includes pgAdmin). During install:
- Set a password for the `postgres` user — write it down
- Leave the port as 5432

After install, open pgAdmin or psql and create the database:

```sql
CREATE DATABASE political_fantasy;
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
```

Create your `.env` file inside the `backend/` folder:

```
CONGRESS_API_KEY=your_key_here
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/political_fantasy
SECRET_KEY=generate_this_later
```

Then create tables and seed politicians:

```bash
# Create all database tables
python -c "from models.database import create_tables; create_tables()"

# Seed all ~535 members of Congress
python scripts/seed_politicians.py

# Run a scoring pass manually (run this weekly or via cron)
python services/scoring_engine.py
```

### 3. Get a Congress.gov API Key

Free at: https://api.congress.gov/sign-up/
Key arrives by email within a minute.
Rate limit: 5,000 requests/hour — plenty for weekly scoring.

---

## Build Phases

- [x] **Phase 1 — Data Model** (complete)
- [ ] **Phase 2 — FastAPI routers** (auth, leagues, draft, leaderboard)
- [ ] **Phase 3 — React frontend** (draft room, roster view, leaderboard)
- [ ] **Phase 4 — Weekly scoring cron + email digest**
- [ ] **Phase 5 — Real-time draft room** (WebSockets)

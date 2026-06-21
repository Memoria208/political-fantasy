"""
Political Fantasy — FastAPI App Entry Point

Run with:
    uvicorn main:app --reload

Interactive API docs available at:
    http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from models.database import create_tables
from routers import auth, leagues, draft, leaderboard, politicians

app = FastAPI(
    title="Political Fantasy API",
    description="Fantasy football mechanics for U.S. Congress",
    version="0.1.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Allows the React frontend (running on port 5173) to call this API locally.
# Update origins before deploying to production.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── STARTUP ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    create_tables()


# ─── ROUTERS ──────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(leagues.router)
app.include_router(draft.router)
app.include_router(leaderboard.router)
app.include_router(politicians.router)


# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "Political Fantasy API is running"}

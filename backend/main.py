"""
Political Fantasy — FastAPI App Entry Point

Run with:
    uvicorn main:app --reload

Interactive API docs available at:
    http://localhost:8000/docs
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from collections import defaultdict
import time
import os
load_dotenv()
from models.database import create_tables
from routers import auth, leagues, draft, leaderboard, politicians, payments

app = FastAPI(
    title="Political Fantasy API",
    description="Fantasy football mechanics for U.S. Congress",
    version="0.1.0",
)

# ─── CORS ──────────────────────────────────────────────────────────────────────
# Add CORS middleware ONCE with the correct origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # local dev
        "http://localhost:3000",  # local dev alt
        "https://political-fantasy.vercel.app",  # production
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # catch all Vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── RATE LIMITING ────────────────────────────────────────────────────────────
# Simple in-memory rate limiter: 60 requests per minute per IP

REQUEST_COUNTS: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 60       # requests
RATE_WINDOW = 60      # seconds

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    ip = request.client.host
    now = time.time()

    # Remove timestamps outside the window
    REQUEST_COUNTS[ip] = [t for t in REQUEST_COUNTS[ip] if now - t < RATE_WINDOW]

    if len(REQUEST_COUNTS[ip]) >= RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."}
        )

    REQUEST_COUNTS[ip].append(now)
    return await call_next(request)

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
app.include_router(payments.router)

# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "Political Fantasy API is running"}

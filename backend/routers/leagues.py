"""
Leagues Router
POST /leagues/              — create a league
POST /leagues/join          — join via invite code
GET  /leagues/              — list leagues you're in
GET  /leagues/{league_id}   — league detail + members
POST /leagues/{league_id}/start-draft  — lock roster, set draft order
"""

import secrets
import json
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db
from models.models import League, LeagueMember, User, DraftStatus
from services.auth import get_current_user

router = APIRouter(prefix="/leagues", tags=["leagues"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class CreateLeagueRequest(BaseModel):
    name: str
    max_teams: int = 8
    roster_size: int = 10
    season_year: int = 2026


class JoinLeagueRequest(BaseModel):
    invite_code: str
    team_name: str


class LeagueMemberResponse(BaseModel):
    id: int
    username: str
    team_name: str | None
    draft_position: int | None
    total_score: float

    class Config:
        from_attributes = True


class LeagueResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    max_teams: int
    roster_size: int
    draft_status: str
    season_year: int
    member_count: int


class LeagueDetailResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    max_teams: int
    roster_size: int
    draft_status: str
    season_year: int
    members: list[LeagueMemberResponse]


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=LeagueResponse, status_code=201)
def create_league(
    body: CreateLeagueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new league. Creator becomes commissioner and first member."""
    invite_code = secrets.token_urlsafe(8)[:12].upper()

    league = League(
        name=body.name,
        invite_code=invite_code,
        commissioner_id=current_user.id,
        max_teams=body.max_teams,
        roster_size=body.roster_size,
        season_year=body.season_year,
        draft_status=DraftStatus.pending,
    )
    db.add(league)
    db.flush()  # get league.id before adding member

    member = LeagueMember(
        user_id=current_user.id,
        league_id=league.id,
        team_name=f"{current_user.display_name}'s Team",
    )
    db.add(member)
    db.commit()
    db.refresh(league)

    return {**league.__dict__, "member_count": 1}


@router.post("/join", status_code=200)
def join_league(
    body: JoinLeagueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a league using its invite code."""
    league = db.query(League).filter_by(invite_code=body.invite_code.upper()).first()
    if not league:
        raise HTTPException(status_code=404, detail="Invite code not found")
    if league.draft_status != DraftStatus.pending:
        raise HTTPException(status_code=400, detail="League draft has already started")

    member_count = db.query(LeagueMember).filter_by(league_id=league.id).count()
    if member_count >= league.max_teams:
        raise HTTPException(status_code=400, detail="League is full")

    existing = db.query(LeagueMember).filter_by(
        user_id=current_user.id, league_id=league.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already in this league")

    member = LeagueMember(
        user_id=current_user.id,
        league_id=league.id,
        team_name=body.team_name,
    )
    db.add(member)
    db.commit()
    return {"message": f"Joined {league.name} successfully"}


@router.get("/", response_model=list[LeagueResponse])
def my_leagues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all leagues the current user is a member of."""
    memberships = db.query(LeagueMember).filter_by(user_id=current_user.id).all()
    result = []
    for m in memberships:
        league = db.query(League).filter_by(id=m.league_id).first()
        count = db.query(LeagueMember).filter_by(league_id=league.id).count()
        result.append({**league.__dict__, "member_count": count})
    return result


@router.get("/{league_id}", response_model=LeagueDetailResponse)
def league_detail(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return league details and all members. Must be a member to view."""
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    membership = db.query(LeagueMember).filter_by(
        user_id=current_user.id, league_id=league_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not in this league")

    members = db.query(LeagueMember).filter_by(league_id=league_id).all()
    member_list = []
    for m in members:
        user = db.query(User).filter_by(id=m.user_id).first()
        member_list.append({
            "id": m.id,
            "username": user.username,
            "team_name": m.team_name,
            "draft_position": m.draft_position,
            "total_score": m.total_score,
        })

    return {**league.__dict__, "members": member_list}


@router.post("/{league_id}/start-draft", status_code=200)
def start_draft(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Commissioner starts the draft.
    Randomly assigns draft positions and sets status to active.
    """
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.commissioner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can start the draft")
    if league.draft_status != DraftStatus.pending:
        raise HTTPException(status_code=400, detail="Draft already started")

    members = db.query(LeagueMember).filter_by(league_id=league_id).all()
    if len(members) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 teams to start draft")

    # Randomly assign draft positions
    positions = list(range(1, len(members) + 1))
    random.shuffle(positions)
    for member, pos in zip(members, positions):
        member.draft_position = pos

    # Store draft order as JSON list of member IDs sorted by position
    ordered = sorted(zip(positions, members), key=lambda x: x[0])
    draft_order = [m.id for _, m in ordered]
    league.draft_order = json.dumps(draft_order)
    league.draft_status = DraftStatus.active

    db.commit()
    return {
        "message": "Draft started",
        "draft_order": [
            {"position": pos, "team": m.team_name}
            for pos, m in ordered
        ]
    }

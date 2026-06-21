"""
Draft Router
GET  /draft/{league_id}/board        — full draft board (all picks so far)
GET  /draft/{league_id}/available    — undrafted politicians
GET  /draft/{league_id}/current-pick — whose turn it is
POST /draft/{league_id}/pick         — make a pick
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db
from models.models import (
    League, LeagueMember, Politician, DraftPick,
    RosterSlot, DraftStatus, User, Chamber, Party
)
from services.auth import get_current_user

router = APIRouter(prefix="/draft", tags=["draft"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class PickRequest(BaseModel):
    politician_id: int
    cabinet_role: str | None = None   # flavor only — e.g. "Secretary of State"


class PoliticianSummary(BaseModel):
    id: int
    bioguide_id: str
    full_name: str
    party: str
    chamber: str
    state: str
    title: str
    district: str | None
    votes_with_party_pct: float | None
    missed_votes_pct: float | None
    seniority: int | None
    committees: str | None

    class Config:
        from_attributes = True


class DraftPickResponse(BaseModel):
    pick_number: int
    round_number: int
    team_name: str
    politician: PoliticianSummary


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def get_current_pick_member(league: League, db: Session) -> LeagueMember | None:
    """
    Returns the LeagueMember whose turn it is based on snake draft logic.
    Snake draft: round 1 goes 1→N, round 2 goes N→1, round 3 goes 1→N, etc.
    """
    draft_order: list[int] = json.loads(league.draft_order or "[]")
    if not draft_order:
        return None

    total_picks = db.query(DraftPick).filter_by(league_id=league.id).count()
    n = len(draft_order)
    round_number = (total_picks // n) + 1
    pick_in_round = total_picks % n

    # Even rounds go forward, odd rounds go backward (1-indexed rounds)
    if round_number % 2 == 1:
        member_id = draft_order[pick_in_round]
    else:
        member_id = draft_order[n - 1 - pick_in_round]

    return db.query(LeagueMember).filter_by(id=member_id).first()


def check_draft_complete(league: League, db: Session) -> bool:
    """Returns True if all teams have filled their rosters."""
    members = db.query(LeagueMember).filter_by(league_id=league.id).all()
    total_picks = db.query(DraftPick).filter_by(league_id=league.id).count()
    return total_picks >= len(members) * league.roster_size


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.get("/{league_id}/board", response_model=list[DraftPickResponse])
def draft_board(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All picks made so far, in order."""
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    picks = (
        db.query(DraftPick)
        .filter_by(league_id=league_id)
        .order_by(DraftPick.pick_number)
        .all()
    )

    result = []
    for pick in picks:
        member = db.query(LeagueMember).filter_by(id=pick.member_id).first()
        politician = db.query(Politician).filter_by(id=pick.politician_id).first()
        result.append({
            "pick_number": pick.pick_number,
            "round_number": pick.round_number,
            "team_name": member.team_name,
            "politician": politician,
        })
    return result


@router.get("/{league_id}/available", response_model=list[PoliticianSummary])
def available_politicians(
    league_id: int,
    chamber: str | None = None,
    party: str | None = None,
    state: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    All politicians not yet drafted in this league.
    Optional filters: chamber, party, state, search (name).
    """
    drafted_ids = [
        row.politician_id
        for row in db.query(DraftPick).filter_by(league_id=league_id).all()
    ]

    query = db.query(Politician).filter(
        Politician.is_active == True,
        ~Politician.id.in_(drafted_ids) if drafted_ids else True,
    )

    if chamber:
        query = query.filter(Politician.chamber == chamber)
    if party:
        query = query.filter(Politician.party == party)
    if state:
        query = query.filter(Politician.state.ilike(f"%{state}%"))
    if search:
        query = query.filter(Politician.full_name.ilike(f"%{search}%"))

    return query.order_by(Politician.last_name).all()


@router.get("/{league_id}/current-pick")
def current_pick(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns whose turn it is and what pick number we're on."""
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.draft_status == DraftStatus.pending:
        raise HTTPException(status_code=400, detail="Draft has not started yet")
    if league.draft_status == DraftStatus.complete:
        return {"message": "Draft is complete"}

    member = get_current_pick_member(league, db)
    if not member:
        return {"message": "Draft is complete"}

    user = db.query(User).filter_by(id=member.user_id).first()
    total_picks = db.query(DraftPick).filter_by(league_id=league_id).count()
    n = len(json.loads(league.draft_order or "[]"))

    return {
        "pick_number": total_picks + 1,
        "round_number": (total_picks // n) + 1,
        "team_name": member.team_name,
        "username": user.username,
        "is_your_turn": member.user_id == current_user.id,
    }


@router.post("/{league_id}/pick", status_code=201)
def make_pick(
    league_id: int,
    body: PickRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Make a draft pick. Must be your turn."""
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.draft_status != DraftStatus.active:
        raise HTTPException(status_code=400, detail="Draft is not active")

    current_member = get_current_pick_member(league, db)
    if not current_member or current_member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="It is not your turn")

    # Verify politician exists and is not already drafted
    politician = db.query(Politician).filter_by(id=body.politician_id, is_active=True).first()
    if not politician:
        raise HTTPException(status_code=404, detail="Politician not found")

    already_drafted = db.query(DraftPick).filter_by(
        league_id=league_id, politician_id=body.politician_id
    ).first()
    if already_drafted:
        raise HTTPException(status_code=400, detail="Politician already drafted")

    total_picks = db.query(DraftPick).filter_by(league_id=league_id).count()
    n = len(json.loads(league.draft_order or "[]"))
    round_number = (total_picks // n) + 1

    # Record the pick
    pick = DraftPick(
        league_id=league_id,
        member_id=current_member.id,
        politician_id=body.politician_id,
        pick_number=total_picks + 1,
        round_number=round_number,
    )
    db.add(pick)

    # Add to roster
    slot = RosterSlot(
        member_id=current_member.id,
        politician_id=body.politician_id,
        cabinet_role=body.cabinet_role,
    )
    db.add(slot)

    db.commit()

    # Check if draft is now complete
    if check_draft_complete(league, db):
        league.draft_status = DraftStatus.complete
        db.commit()
        return {
            "message": "Pick recorded — draft is now complete!",
            "pick_number": total_picks + 1,
            "politician": politician.full_name,
        }

    # Who's up next
    next_member = get_current_pick_member(league, db)
    next_user = db.query(User).filter_by(id=next_member.user_id).first() if next_member else None

    return {
        "message": "Pick recorded",
        "pick_number": total_picks + 1,
        "politician": politician.full_name,
        "next_team": next_member.team_name if next_member else None,
        "next_username": next_user.username if next_user else None,
    }

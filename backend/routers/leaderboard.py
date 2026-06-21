"""
Leaderboard Router
GET /leaderboard/{league_id}              — standings sorted by score
GET /leaderboard/{league_id}/roster/{member_id} — one team's roster + score breakdown
GET /leaderboard/{league_id}/score-log/{member_id} — recent scoring events for a team
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db
from models.models import (
    League, LeagueMember, Politician, RosterSlot,
    ScoreEvent, User
)
from services.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.get("/{league_id}")
def standings(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """League standings sorted by total score descending."""
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    membership = db.query(LeagueMember).filter_by(
        user_id=current_user.id, league_id=league_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not in this league")

    members = (
        db.query(LeagueMember)
        .filter_by(league_id=league_id)
        .order_by(LeagueMember.total_score.desc())
        .all()
    )

    result = []
    for rank, member in enumerate(members, start=1):
        user = db.query(User).filter_by(id=member.user_id).first()
        roster_count = db.query(RosterSlot).filter_by(member_id=member.id).count()
        result.append({
            "rank": rank,
            "team_name": member.team_name,
            "username": user.username,
            "total_score": member.total_score,
            "roster_size": roster_count,
            "is_you": member.user_id == current_user.id,
        })

    return {
        "league_name": league.name,
        "draft_status": league.draft_status,
        "last_scored_at": league.last_scored_at,
        "standings": result,
    }


@router.get("/{league_id}/roster/{member_id}")
def team_roster(
    league_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """One team's full roster with each politician's total points contribution."""
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    # Must be in the league to view rosters
    membership = db.query(LeagueMember).filter_by(
        user_id=current_user.id, league_id=league_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not in this league")

    member = db.query(LeagueMember).filter_by(id=member_id, league_id=league_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team not found")

    slots = db.query(RosterSlot).filter_by(member_id=member_id).all()
    roster = []

    for slot in slots:
        politician = db.query(Politician).filter_by(id=slot.politician_id).first()

        # Sum score events for this politician
        points = (
            db.query(func.sum(ScoreEvent.points))
            .filter_by(politician_id=slot.politician_id)
            .scalar()
        ) or 0.0

        event_count = db.query(ScoreEvent).filter_by(
            politician_id=slot.politician_id
        ).count()

        roster.append({
            "politician_id": politician.id,
            "bioguide_id": politician.bioguide_id,
            "full_name": politician.full_name,
            "title": politician.title,
            "party": politician.party,
            "chamber": politician.chamber,
            "state": politician.state,
            "cabinet_role": slot.cabinet_role,
            "points": round(float(points), 1),
            "event_count": event_count,
        })

    # Sort by points descending
    roster.sort(key=lambda x: x["points"], reverse=True)

    user = db.query(User).filter_by(id=member.user_id).first()
    return {
        "team_name": member.team_name,
        "username": user.username,
        "total_score": member.total_score,
        "roster": roster,
    }


@router.get("/{league_id}/score-log/{member_id}")
def score_log(
    league_id: int,
    member_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recent scoring events for a team's politicians."""
    membership = db.query(LeagueMember).filter_by(
        user_id=current_user.id, league_id=league_id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not in this league")

    member = db.query(LeagueMember).filter_by(id=member_id, league_id=league_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team not found")

    politician_ids = [
        slot.politician_id
        for slot in db.query(RosterSlot).filter_by(member_id=member_id).all()
    ]

    events = (
        db.query(ScoreEvent)
        .filter(ScoreEvent.politician_id.in_(politician_ids))
        .order_by(ScoreEvent.event_date.desc())
        .limit(limit)
        .all()
    )

    result = []
    for e in events:
        politician = db.query(Politician).filter_by(id=e.politician_id).first()
        result.append({
            "date": e.event_date,
            "politician": politician.full_name,
            "event_type": e.event_type,
            "points": e.points,
            "description": e.description,
            "source_url": e.source_url,
        })

    return {"team_name": member.team_name, "events": result}

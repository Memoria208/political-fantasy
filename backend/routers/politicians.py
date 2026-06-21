"""
Politicians Router
GET /politicians/          — browse all politicians (filterable)
GET /politicians/{id}      — single politician detail + score history
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db
from models.models import Politician, ScoreEvent
from services.auth import get_current_user
from models.models import User

router = APIRouter(prefix="/politicians", tags=["politicians"])


@router.get("/")
def list_politicians(
    chamber: str | None = None,
    party: str | None = None,
    state: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse all politicians. Supports filtering and pagination."""
    query = db.query(Politician).filter_by(is_active=True)

    if chamber:
        query = query.filter(Politician.chamber == chamber)
    if party:
        query = query.filter(Politician.party == party)
    if state:
        query = query.filter(Politician.state.ilike(f"%{state}%"))
    if search:
        query = query.filter(Politician.full_name.ilike(f"%{search}%"))

    total = query.count()
    politicians = query.order_by(Politician.last_name).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "politicians": politicians,
    }


@router.get("/{politician_id}")
def politician_detail(
    politician_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full detail for one politician including scoring history and
    GovTrack ideology/leadership scores where available.
    """
    politician = db.query(Politician).filter_by(id=politician_id).first()
    if not politician:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Politician not found")

    total_points = (
        db.query(func.sum(ScoreEvent.points))
        .filter_by(politician_id=politician_id)
        .scalar()
    ) or 0.0

    recent_events = (
        db.query(ScoreEvent)
        .filter_by(politician_id=politician_id)
        .order_by(ScoreEvent.event_date.desc())
        .limit(20)
        .all()
    )

    # Build Ballotpedia-friendly name — strip middle initials like "S." from "Alma S. Adams"
    # Special cases where the standard stripping produces wrong results
    import re as _re
    BALLOTPEDIA_OVERRIDES = {
        "J. D. Vance": "JD_Vance",
        "A. Donald McEachin": "Donald_McEachin",
        "C. Scott Franklin": "Scott_Franklin",
        "F. James Sensenbrenner": "Jim_Sensenbrenner",
        "G. K. Butterfield": "G.K._Butterfield",
        "J. French Hill": "French_Hill",
        "J. Luis Correa": "Lou_Correa",
        "M. Michael Burgess": "Michael_Burgess",
        "W. Gregory Steube": "Greg_Steube",
        "W. Todd Akin": "Todd_Akin",
    }
    if politician.full_name in BALLOTPEDIA_OVERRIDES:
        bp_name = BALLOTPEDIA_OVERRIDES[politician.full_name]
    else:
        bp_name = _re.sub(r'\b[A-Z]\. ?', '', politician.full_name).strip()
        bp_name = _re.sub(r'\s+', '_', bp_name)

    # Build ideology label from score
    ideology_label = None
    if politician.ideology_score is not None:
        s = politician.ideology_score
        if s < 0.3:
            ideology_label = "Progressive"
        elif s < 0.45:
            ideology_label = "Center-Left"
        elif s < 0.55:
            ideology_label = "Moderate"
        elif s < 0.7:
            ideology_label = "Center-Right"
        else:
            ideology_label = "Conservative"

    # Build leadership label
    leadership_label = None
    if politician.leadership_score is not None:
        l = politician.leadership_score
        if l > 0.7:
            leadership_label = "High"
        elif l > 0.4:
            leadership_label = "Moderate"
        else:
            leadership_label = "Low"

    return {
        "id": politician.id,
        "full_name": politician.full_name,
        "title": politician.title,
        "party": politician.party,
        "chamber": politician.chamber,
        "state": politician.state,
        "district": politician.district,
        "votes_with_party_pct": politician.votes_with_party_pct,
        "missed_votes_pct": politician.missed_votes_pct,
        "seniority": politician.seniority,
        "total_points": round(float(total_points), 1),

        # GovTrack scores — may be None if member introduced fewer than 10 bills
        "ideology_score": politician.ideology_score,
        "ideology_label": ideology_label,
        "leadership_score": politician.leadership_score,
        "leadership_label": leadership_label,

        # External profile links
        "links": {
            "bioguide": f"https://bioguide.congress.gov/search/bio/{politician.bioguide_id}",
            "congress_gov": "https://www.congress.gov/search?q=" + '{"source":"members","search":"' + politician.full_name + '"}',
            "ballotpedia": f"https://ballotpedia.org/{bp_name}",
        },

        "recent_events": [
            {
                "date": e.event_date,
                "event_type": e.event_type,
                "points": e.points,
                "description": e.description,
                "source_url": e.source_url,
            }
            for e in recent_events
        ],
    }

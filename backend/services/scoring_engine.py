"""
Scoring Engine — Congress.gov API v3
Pulls recent bills and votes, writes ScoreEvents,
and updates LeagueMember.total_score.

Run weekly via cron or call score_all_leagues() from FastAPI.
"""

import requests
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal
from models.models import (
    Politician, ScoreEvent, ScoreEventType, SCORE_VALUES,
    LeagueMember, RosterSlot, League, DraftStatus,
)

CONGRESS_API_KEY = os.getenv("CONGRESS_API_KEY", "")
BASE_URL = "https://api.congress.gov/v3"
CONGRESS_NUMBER = 119


# ─── API HELPERS ──────────────────────────────────────────────────────────────

def get(path: str, params: dict = {}) -> dict:
    params["api_key"] = CONGRESS_API_KEY
    params["format"] = "json"
    resp = requests.get(f"{BASE_URL}{path}", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_recent_bills(bioguide_id: str, since_days: int = 7) -> list[dict]:
    """
    Bills sponsored by a member, introduced in the last N days.
    Endpoint: /v3/member/{bioguideId}/sponsored-legislation
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=since_days)).date().isoformat()
    try:
        data = get(f"/member/{bioguide_id}/sponsored-legislation", {
            "limit": 50,
        })
        bills = data.get("sponsoredLegislation", [])
        # Filter to recent ones by introducedDate
        return [
            b for b in bills
            if b.get("introducedDate", "0000-00-00") >= cutoff
        ]
    except Exception as e:
        print(f"    bills fetch failed ({bioguide_id}): {e}")
        return []


def fetch_recent_house_votes(congress: int, session: int = 1) -> list[dict]:
    """
    House roll call votes (beta endpoint, 2023+).
    Endpoint: /v3/house-vote/{congress}/{session}
    Returns list of vote objects.
    """
    try:
        data = get(f"/house-vote/{congress}/{session}", {"limit": 50})
        return data.get("houseRollCallVotes", [])
    except Exception as e:
        print(f"    house votes fetch failed: {e}")
        return []


def fetch_house_vote_members(congress: int, session: int, roll_call: str) -> list[dict]:
    """
    How each member voted on a specific House roll call.
    Endpoint: /v3/house-vote/{congress}/{session}/{rollCallNumber}/members
    """
    try:
        data = get(f"/house-vote/{congress}/{session}/{roll_call}/members", {"limit": 250})
        return data.get("memberVotes", [])
    except Exception as e:
        print(f"    member votes fetch failed ({roll_call}): {e}")
        return []


# ─── DUPLICATE GUARD ──────────────────────────────────────────────────────────

def event_exists(db, politician_id: int, event_type: ScoreEventType,
                 bill_id: Optional[str], vote_id: Optional[str]) -> bool:
    return db.query(ScoreEvent).filter_by(
        politician_id=politician_id,
        event_type=event_type,
        bill_id=bill_id,
        vote_id=vote_id,
    ).first() is not None


def record_event(db, politician_id: int, event_type: ScoreEventType,
                 description: str, event_date: datetime,
                 bill_id: str = None, vote_id: str = None,
                 source_url: str = None) -> Optional[ScoreEvent]:
    if event_exists(db, politician_id, event_type, bill_id, vote_id):
        return None

    event = ScoreEvent(
        politician_id=politician_id,
        event_type=event_type,
        points=SCORE_VALUES[event_type],
        description=description[:499],
        source_url=source_url,
        event_date=event_date,
        bill_id=bill_id,
        vote_id=vote_id,
    )
    db.add(event)
    return event


# ─── SCORING PASSES ───────────────────────────────────────────────────────────

def score_bills(db, politician: Politician, since_days: int = 7) -> int:
    """Score bill introductions. Returns number of new events."""
    count = 0
    bills = fetch_recent_bills(politician.bioguide_id, since_days)

    for bill in bills:
        date_raw = bill.get("introducedDate")
        if not date_raw:
            continue

        event_date = datetime.fromisoformat(date_raw).replace(tzinfo=timezone.utc)
        bill_id    = f"{bill.get('type','').lower()}{bill.get('number','')}-{CONGRESS_NUMBER}"
        title      = bill.get("title", "Unknown bill")[:200]
        url        = bill.get("url", "")

        # Bill introduced
        ev = record_event(
            db, politician.id,
            ScoreEventType.bill_introduced,
            f"Introduced: {title}",
            event_date,
            bill_id=bill_id,
            source_url=url,
        )
        if ev:
            count += 1

        # Check latest action for committee passage or signed into law
        latest_action = bill.get("latestAction", {})
        action_text   = (latest_action.get("text") or "").lower()
        action_date   = latest_action.get("actionDate", date_raw)
        action_dt     = datetime.fromisoformat(action_date).replace(tzinfo=timezone.utc)

        if "passed committee" in action_text or "ordered to be reported" in action_text:
            ev = record_event(
                db, politician.id,
                ScoreEventType.bill_passed_committee,
                f"Passed committee: {title}",
                action_dt,
                bill_id=f"{bill_id}-committee",
                source_url=url,
            )
            if ev:
                count += 1

        if "became public law" in action_text or "signed by president" in action_text:
            ev = record_event(
                db, politician.id,
                ScoreEventType.bill_signed_into_law,
                f"Signed into law: {title}",
                action_dt,
                bill_id=f"{bill_id}-law",
                source_url=url,
            )
            if ev:
                count += 1

    return count


def score_house_votes(db, rostered_bioguide_ids: set[str],
                      bioguide_to_id: dict[str, int],
                      since_days: int = 7) -> int:
    """
    Score House votes for all rostered House members in one pass.
    More efficient than per-member fetches.
    Returns total new event count.
    """
    count = 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    votes  = fetch_recent_house_votes(CONGRESS_NUMBER, session=1)

    for vote in votes:
        date_raw = vote.get("date") or vote.get("actionDate")
        if not date_raw:
            continue
        vote_date = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
        if vote_date < cutoff:
            continue

        roll_call = str(vote.get("rollCallVoteNumber", ""))
        question  = vote.get("question", "")[:200]
        vote_id   = f"house-{CONGRESS_NUMBER}-1-{roll_call}"

        member_votes = fetch_house_vote_members(CONGRESS_NUMBER, 1, roll_call)

        # Figure out majority position
        party_counts: dict[str, dict[str, int]] = {}
        for mv in member_votes:
            party = mv.get("party", "")
            pos   = mv.get("votePosition", "")
            if party not in party_counts:
                party_counts[party] = {}
            party_counts[party][pos] = party_counts[party].get(pos, 0) + 1

        # Majority position per party = whichever position got the most votes
        party_majority: dict[str, str] = {}
        for party, positions in party_counts.items():
            party_majority[party] = max(positions, key=positions.get)

        for mv in member_votes:
            bioguide = mv.get("bioguideId")
            if not bioguide or bioguide not in rostered_bioguide_ids:
                continue

            politician_id = bioguide_to_id.get(bioguide)
            if not politician_id:
                continue

            position = mv.get("votePosition", "")
            party    = mv.get("party", "")
            majority = party_majority.get(party, "")

            if position.lower() == "not voting":
                ev = record_event(
                    db, politician_id,
                    ScoreEventType.missed_vote,
                    f"Missed vote: {question}",
                    vote_date,
                    vote_id=vote_id,
                )
            elif position == majority:
                ev = record_event(
                    db, politician_id,
                    ScoreEventType.voted_with_party,
                    f"Voted with party: {question}",
                    vote_date,
                    vote_id=vote_id,
                )
            else:
                ev = record_event(
                    db, politician_id,
                    ScoreEventType.voted_against_party,
                    f"Maverick vote: {question}",
                    vote_date,
                    vote_id=vote_id,
                )

            if ev:
                count += 1

    return count


# ─── LEAGUE SCORE AGGREGATION ─────────────────────────────────────────────────

def recalculate_league_scores(db, league: League) -> None:
    """Sum all ScoreEvents for each team's roster and update total_score."""
    import sqlalchemy
    members = db.query(LeagueMember).filter_by(league_id=league.id).all()

    for member in members:
        ids = [
            slot.politician_id
            for slot in db.query(RosterSlot).filter_by(member_id=member.id).all()
        ]
        if not ids:
            continue

        total = (
            db.query(ScoreEvent)
            .filter(ScoreEvent.politician_id.in_(ids))
            .with_entities(sqlalchemy.func.sum(ScoreEvent.points))
            .scalar()
        ) or 0.0

        member.total_score = float(total)

    db.commit()


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def score_all_leagues(since_days: int = 7) -> None:
    """
    Full weekly scoring pass:
    1. Find all politicians on active rosters
    2. Score their bills
    3. Score House votes in one bulk pass
    4. Recalculate all league totals
    """
    if not CONGRESS_API_KEY:
        print("ERROR: Set CONGRESS_API_KEY in your .env file.")
        sys.exit(1)

    db = SessionLocal()
    print(f"[{datetime.now()}] Scoring pass started (last {since_days} days)...")

    try:
        # Get all active rostered politicians
        rows = (
            db.query(RosterSlot.politician_id)
            .join(LeagueMember, RosterSlot.member_id == LeagueMember.id)
            .join(League, LeagueMember.league_id == League.id)
            .filter(League.draft_status == DraftStatus.complete)
            .distinct().all()
        )
        politician_ids = [r[0] for r in rows]
        politicians    = db.query(Politician).filter(Politician.id.in_(politician_ids)).all()
        print(f"  {len(politicians)} active rostered politicians found.")

        # Build lookup for vote scoring
        bioguide_to_id   = {p.bioguide_id: p.id for p in politicians}
        rostered_bioguides = set(bioguide_to_id.keys())

        # Score bills per politician
        total_events = 0
        for p in politicians:
            n = score_bills(db, p, since_days)
            if n:
                print(f"    {p.full_name}: +{n} bill events")
            total_events += n

        db.commit()

        # Score House votes in one bulk pass
        print("  Scoring House votes...")
        vote_events   = score_house_votes(db, rostered_bioguides, bioguide_to_id, since_days)
        total_events += vote_events
        db.commit()
        print(f"  {vote_events} vote events recorded.")

        print(f"  {total_events} total new events.")

        # Recalculate all league totals
        leagues = db.query(League).filter_by(draft_status=DraftStatus.complete).all()
        for league in leagues:
            recalculate_league_scores(db, league)
            print(f"  Scores updated: {league.name}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

    print(f"[{datetime.now()}] Scoring pass complete.")


if __name__ == "__main__":
    score_all_leagues()

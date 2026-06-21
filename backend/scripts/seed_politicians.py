"""
Congress.gov API v3 — Politician Seeder
Fetches all current members of Congress and upserts them
into the politicians table.

Usage:
    python scripts/seed_politicians.py

API docs: https://api.congress.gov
Free key: https://api.congress.gov/sign-up/
"""

import requests
import sys
import os
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal
from models.models import Politician, Chamber, Party

CONGRESS_API_KEY = os.getenv("CONGRESS_API_KEY", "")
BASE_URL = "https://api.congress.gov/v3"
CONGRESS_NUMBER = 119


def get(path: str, params: dict = {}) -> dict:
    """GET wrapper — injects API key and handles errors."""
    params["api_key"] = CONGRESS_API_KEY
    params["format"] = "json"
    resp = requests.get(f"{BASE_URL}{path}", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_all_members() -> list[dict]:
    """
    Fetches all current members of Congress using pagination.
    Endpoint: /v3/member/congress/{congress}
    Returns up to 250 per page; loops until exhausted.
    """
    members = []
    offset = 0
    limit = 250

    while True:
        data = get(f"/member/congress/{CONGRESS_NUMBER}", {
            "currentMember": "true",
            "limit": limit,
            "offset": offset,
        })

        batch = data.get("members", [])
        if not batch:
            break

        members.extend(batch)
        print(f"  Fetched {len(members)} members so far...")

        # Stop if fewer results than limit — we've reached the end
        if len(batch) < limit:
            break

        offset += limit

    return members


def normalize_party(raw: str) -> Party:
    raw = (raw or "").lower()
    if "democrat" in raw:
        return Party.democrat
    if "republican" in raw:
        return Party.republican
    return Party.independent


def normalize_chamber(raw: str) -> Chamber:
    raw = (raw or "").lower()
    if "senate" in raw:
        return Chamber.senate
    return Chamber.house


def upsert_politician(db, member: dict) -> None:
    bioguide_id = member.get("bioguideId")
    if not bioguide_id:
        return

    terms = member.get("terms", {}).get("item", [])
    latest_term = terms[-1] if terms else {}

    chamber_raw = latest_term.get("chamber", member.get("chamber", "House"))
    party_raw   = member.get("partyName", "Independent")
    chamber     = normalize_chamber(chamber_raw)
    party       = normalize_party(party_raw)

    title = "Sen." if chamber == Chamber.senate else "Rep."
    state = member.get("state", "")
    name  = member.get("name", "")

    # API returns "Last, First" format
    if "," in name:
        last, first = [p.strip() for p in name.split(",", 1)]
    else:
        first, last = "", name

    full_name = f"{first} {last}".strip()

    district_val = member.get("district")
    district = str(district_val) if district_val is not None else None

    data = {
        "full_name":   full_name,
        "first_name":  first,
        "last_name":   last,
        "party":       party,
        "chamber":     chamber,
        "state":       state,
        "district":    district,
        "title":       title,
        "is_active":   True,
        "last_synced": datetime.now(timezone.utc),
    }

    existing = db.query(Politician).filter_by(bioguide_id=bioguide_id).first()
    if existing:
        for key, val in data.items():
            setattr(existing, key, val)
    else:
        db.add(Politician(bioguide_id=bioguide_id, **data))


def seed():
    if not CONGRESS_API_KEY:
        print("ERROR: Set CONGRESS_API_KEY in your .env file.")
        print("Get a free key at: https://api.congress.gov/sign-up/")
        sys.exit(1)

    db = SessionLocal()
    try:
        print(f"Fetching 119th Congress members from Congress.gov API...")
        members = fetch_all_members()
        print(f"Total members found: {len(members)}")

        # Deduplicate by bioguide_id before inserting
        seen = {}
        for member in members:
            bid = member.get("bioguideId")
            if bid:
                seen[bid] = member  # last occurrence wins

        unique_members = list(seen.values())
        print(f"Unique members after dedup: {len(unique_members)}")

        for member in unique_members:
            upsert_politician(db, member)

        db.commit()
        print(f"Done. {len(unique_members)} politicians seeded.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

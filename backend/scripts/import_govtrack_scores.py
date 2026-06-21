"""
GovTrack Ideology & Leadership Score Importer
Downloads sponsorship analysis CSV files from GovTrack and stores
ideology and leadership scores in the politicians table.

Usage:
    python scripts/import_govtrack_scores.py

Source: https://www.govtrack.us/about/analysis
Data: https://www.govtrack.us/data/analysis/by-congress/119/

What these scores mean:
  ideology_score  — 0.0 (most progressive) to 1.0 (most conservative)
                    Based on cosponsorship patterns, NOT issue positions.
                    Not available for members who introduced fewer than 10 bills.
  leadership_score — 0.0 (follower) to 1.0 (leader)
                    How often other members cosponsor this member's bills.
                    Higher = more legislative influence.

IMPORTANT: These scores describe legislative BEHAVIOR, not policy positions.
They should be displayed with clear context in the UI.
"""

import requests
import csv
import io
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal
from models.models import Politician

CONGRESS = 119
BASE_URL = f"https://www.govtrack.us/data/analysis/by-congress/{CONGRESS}"

HOUSE_URL  = f"{BASE_URL}/sponsorshipanalysis_h.txt"
SENATE_URL = f"{BASE_URL}/sponsorshipanalysis_s.txt"


def fetch_csv(url: str) -> list[dict]:
    """Download and parse a GovTrack sponsorship analysis CSV."""
    print(f"  Fetching: {url}")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    # GovTrack CSV columns: ID, ideology, leadership, name, party, description, ...
    reader = csv.DictReader(io.StringIO(resp.text))
    return list(reader)


def import_scores():
    db = SessionLocal()
    updated = 0
    skipped = 0

    try:
        for label, url in [("House", HOUSE_URL), ("Senate", SENATE_URL)]:
            print(f"\nImporting {label} scores...")
            rows = fetch_csv(url)
            print(f"  {len(rows)} rows found")

            for row in rows:
                govtrack_id = row.get("ID", "").strip()
                ideology    = row.get("ideology", "").strip()
                leadership  = row.get("leadership", "").strip()

                if not govtrack_id:
                    continue

                # GovTrack uses their own numeric ID.
                # Match to our politicians table via govtrack_id stored in
                # the bioguide_id field cross-referenced through the
                # unitedstates/congress-legislators dataset.
                # For now, match by name as a fallback (less reliable).
                # Best practice: run sync_govtrack_ids.py first (see below).

                name = row.get("name", "").strip()

                # Try to find politician by full name
                # GovTrack name format varies — try both orderings
                politician = None
                if name:
                    # Try "First Last" match
                    politician = db.query(Politician).filter(
                        Politician.full_name.ilike(f"%{name}%")
                    ).first()

                if politician:
                    try:
                        politician.ideology_score  = float(ideology)  if ideology  else None
                        politician.leadership_score = float(leadership) if leadership else None
                        updated += 1
                    except ValueError:
                        skipped += 1
                else:
                    skipped += 1

        db.commit()
        print(f"\nDone. {updated} politicians updated, {skipped} skipped (no match or no score).")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import_scores()

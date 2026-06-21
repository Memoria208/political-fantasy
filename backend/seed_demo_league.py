"""
Demo League Seeder
Creates a realistic demo league with fake users so new visitors can see
the app working without having to recruit friends first.

Run this once from the backend folder:
    python seed_demo_league.py

Safe to run multiple times — I check first and skip if the demo league
already exists so I don't end up with duplicates.
"""

import sys
import os
import json
import random
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from models.database import SessionLocal
from models.models import (
    User, League, LeagueMember, DraftPick, RosterSlot,
    Politician, ScoreEvent, ScoreEventType, DraftStatus, WeeklySnapshot, SCORE_VALUES
)
from services.auth import hash_password

# ── CONFIG ────────────────────────────────────────────────────────────────────

DEMO_LEAGUE_NAME = "The Capitol Hill Classic"
DEMO_INVITE_CODE = "DEMO2026"   # this is what new users type to join the demo
SEASON_YEAR = 2026

# fake users for the demo league — I want them to look like real people
DEMO_USERS = [
    {"username": "demo_commissioner", "display_name": "Alex Rivera",     "email": "demo1@politicalfantasy.app"},
    {"username": "demo_player2",      "display_name": "Jordan Mitchell",  "email": "demo2@politicalfantasy.app"},
    {"username": "demo_player3",      "display_name": "Sam Okafor",       "email": "demo3@politicalfantasy.app"},
    {"username": "demo_player4",      "display_name": "Casey Huang",      "email": "demo4@politicalfantasy.app"},
]

# team names that feel lived-in and fun
TEAM_NAMES = [
    "The Filibuster Kings",
    "Bipartisan Ballers",
    "The Swing Voters",
    "Quorum Crushers",
]

# all demo accounts share this password — they're display-only so security doesn't matter
DEMO_PASSWORD = "demo_password_123"

# how many scoring events to generate per politician so the leaderboard
# has realistic-looking numbers instead of all zeros
SCORE_EVENTS_PER_POLITICIAN = 4


def run():
    db = SessionLocal()

    try:
        # don't create a second demo league if I run this twice
        existing = db.query(League).filter_by(invite_code=DEMO_INVITE_CODE).first()
        if existing:
            print(f"Demo league already exists (id={existing.id}). Skipping.")
            return

        print("Creating demo users...")
        users = []
        for u in DEMO_USERS:
            # reuse the user if they already exist from a previous partial run
            existing_user = db.query(User).filter_by(username=u["username"]).first()
            if existing_user:
                users.append(existing_user)
                print(f"  {u['username']} already exists, reusing")
            else:
                user = User(
                    username=u["username"],
                    email=u["email"],
                    display_name=u["display_name"],
                    hashed_password=hash_password(DEMO_PASSWORD),
                    is_active=True,
                )
                db.add(user)
                db.flush()
                users.append(user)
                print(f"  Created {u['username']}")

        commissioner = users[0]

        print("Creating demo league...")
        league = League(
            name=DEMO_LEAGUE_NAME,
            invite_code=DEMO_INVITE_CODE,
            commissioner_id=commissioner.id,
            max_teams=4,
            roster_size=8,
            season_year=SEASON_YEAR,
            # set to complete so visitors see a live season, not a pre-draft lobby
            draft_status=DraftStatus.complete,
            is_premium=False,
        )
        db.add(league)
        db.flush()
        print(f"  League id={league.id}")

        print("Adding members...")
        members = []
        for i, (user, team_name) in enumerate(zip(users, TEAM_NAMES)):
            member = LeagueMember(
                user_id=user.id,
                league_id=league.id,
                team_name=team_name,
                draft_position=i + 1,
                total_score=0.0,
            )
            db.add(member)
            db.flush()
            members.append(member)
            print(f"  {team_name} (draft pick #{i+1})")

        # store draft order as a JSON list of member IDs
        league.draft_order = json.dumps([m.id for m in members])

        # grab real politicians from the db — need enough for all 4 rosters
        politicians = db.query(Politician).filter_by(is_active=True).limit(
            len(members) * league.roster_size
        ).all()

        if len(politicians) < len(members) * league.roster_size:
            print(f"  Warning: only {len(politicians)} politicians in DB, need {len(members) * league.roster_size}.")
            print(f"  Run seed_politicians.py first to populate the politicians table.")

        print("Running snake draft to fill rosters...")
        # snake draft: odd rounds go 1→4, even rounds go 4→1
        pick_number = 1
        politician_pool = list(politicians)
        random.shuffle(politician_pool)
        pol_index = 0

        for round_num in range(1, league.roster_size + 1):
            order = members if round_num % 2 == 1 else list(reversed(members))
            for member in order:
                if pol_index >= len(politician_pool):
                    break
                pol = politician_pool[pol_index]
                pol_index += 1

                # immutable record of who picked who and when
                pick = DraftPick(
                    league_id=league.id,
                    member_id=member.id,
                    politician_id=pol.id,
                    pick_number=pick_number,
                    round_number=round_num,
                )
                db.add(pick)

                # the actual roster entry
                slot = RosterSlot(
                    member_id=member.id,
                    politician_id=pol.id,
                    is_starter=True,
                )
                db.add(slot)
                pick_number += 1

        db.flush()

        print("Seeding score events so the leaderboard looks real...")
        # get all roster slots for this league
        roster_slots = (
            db.query(RosterSlot)
            .join(LeagueMember)
            .filter(LeagueMember.league_id == league.id)
            .all()
        )

        # weighted list of event types — common ones fire more often to feel realistic
        # (tuples are event_type, description, weight)
        event_types_weighted = (
            [ScoreEventType.voted_with_party]     * 40 +
            [ScoreEventType.floor_speech]         * 20 +
            [ScoreEventType.bill_introduced]      * 15 +
            [ScoreEventType.committee_hearing]    * 12 +
            [ScoreEventType.missed_vote]          *  8 +
            [ScoreEventType.voted_against_party]  *  4 +
            [ScoreEventType.bill_passed_committee]*  1
        )

        # track scores per member so I can update total_score after
        total_scores = {m.id: 0.0 for m in members}

        for slot in roster_slots:
            for _ in range(SCORE_EVENTS_PER_POLITICIAN):
                event_type = random.choice(event_types_weighted)
                points = SCORE_VALUES[event_type]
                event = ScoreEvent(
                    politician_id=slot.politician_id,
                    event_type=event_type,
                    points=points,
                    description="Demo scoring event",
                    event_date=datetime.now(timezone.utc),
                )
                db.add(event)
                total_scores[slot.member_id] = total_scores.get(slot.member_id, 0) + points

        # write the final scores back to the league members
        for member in members:
            member.total_score = round(total_scores.get(member.id, 0), 1)
            print(f"  {member.team_name}: {member.total_score} pts")

        db.commit()
        print(f"\nAll done! Demo league '{DEMO_LEAGUE_NAME}' is ready.")
        print(f"  Invite code: {DEMO_INVITE_CODE}")
        print(f"  Demo password (all accounts): {DEMO_PASSWORD}")
        print(f"  Demo usernames: {', '.join(u['username'] for u in DEMO_USERS)}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()

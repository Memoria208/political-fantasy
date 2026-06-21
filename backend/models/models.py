"""
Political Fantasy - Core Data Models
SQLAlchemy ORM definitions for all database tables.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, Enum, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


# ─── ENUMS ────────────────────────────────────────────────────────────────────

class Chamber(str, enum.Enum):
    senate = "senate"
    house = "house"

class Party(str, enum.Enum):
    democrat = "democrat"
    republican = "republican"
    independent = "independent"

class DraftStatus(str, enum.Enum):
    pending = "pending"       # League created, draft not started
    active = "active"         # Draft in progress
    complete = "complete"     # Draft done, season active
    archived = "archived"     # Season over

class ScoreEventType(str, enum.Enum):
    bill_introduced      = "bill_introduced"
    bill_passed_committee = "bill_passed_committee"
    bill_signed_into_law = "bill_signed_into_law"
    voted_with_party     = "voted_with_party"
    voted_against_party  = "voted_against_party"
    missed_vote          = "missed_vote"
    floor_speech         = "floor_speech"
    committee_hearing    = "committee_hearing"


# ─── SCORE POINT VALUES ───────────────────────────────────────────────────────
# Centralized so scoring engine imports from one place

SCORE_VALUES = {
    ScoreEventType.bill_introduced:       5,
    ScoreEventType.bill_passed_committee: 10,
    ScoreEventType.bill_signed_into_law:  25,
    ScoreEventType.voted_with_party:       2,
    ScoreEventType.voted_against_party:    8,   # maverick bonus
    ScoreEventType.missed_vote:           -3,
    ScoreEventType.floor_speech:           1,
    ScoreEventType.committee_hearing:      3,
}


# ─── USER ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    email         = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    display_name  = Column(String(100))
    avatar_url    = Column(String(500))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    league_memberships = relationship("LeagueMember", back_populates="user")
    owned_leagues      = relationship("League", back_populates="commissioner")


# ─── POLITICIAN ───────────────────────────────────────────────────────────────

class Politician(Base):
    """
    Represents a draftable politician. Seeded from ProPublica Congress API.
    bioguide_id is the stable cross-API identifier.
    """
    __tablename__ = "politicians"

    id           = Column(Integer, primary_key=True, index=True)
    bioguide_id  = Column(String(20), unique=True, nullable=False, index=True)
    full_name    = Column(String(150), nullable=False)
    first_name   = Column(String(75))
    last_name    = Column(String(75))
    party        = Column(Enum(Party), nullable=False)
    chamber      = Column(Enum(Chamber), nullable=False)
    state        = Column(String(50), nullable=False)      # e.g. "NY" or "New York"
    district     = Column(String(10))                      # House only, e.g. "14"
    title        = Column(String(50))                      # "Sen." or "Rep."
    photo_url    = Column(String(500))
    twitter_id   = Column(String(100))
    votes_with_party_pct = Column(Float)                   # cached from API
    missed_votes_pct     = Column(Float)                   # cached from API
    seniority    = Column(Integer)                         # years in chamber
    committees      = Column(Text)                         # JSON list of committee names
    ideology_score  = Column(Float)                        # GovTrack: 0=progressive, 1=conservative
    leadership_score = Column(Float)                       # GovTrack: 0=follower, 1=leader
    last_synced  = Column(DateTime(timezone=True))
    is_active    = Column(Boolean, default=True)           # still in office
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    roster_slots  = relationship("RosterSlot", back_populates="politician")
    score_events  = relationship("ScoreEvent", back_populates="politician")


# ─── LEAGUE ───────────────────────────────────────────────────────────────────

class League(Base):
    """
    A fantasy league. One commissioner creates it; others join via invite code.
    """
    __tablename__ = "leagues"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    invite_code     = Column(String(12), unique=True, nullable=False, index=True)
    commissioner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    max_teams       = Column(Integer, default=8)
    roster_size     = Column(Integer, default=10)     # picks per team
    draft_status    = Column(Enum(DraftStatus), default=DraftStatus.pending)
    draft_order     = Column(Text)                    # JSON list of user IDs (snake draft)
    season_year     = Column(Integer, nullable=False)
    scoring_period  = Column(String(20), default="weekly")  # "weekly" | "monthly"
    last_scored_at  = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # Premium upgrade (set true by the Stripe webhook after payment)
    is_premium           = Column(Boolean, default=False)
    premium_purchased_at = Column(DateTime(timezone=True))

    # Relationships
    commissioner = relationship("User", back_populates="owned_leagues")
    members      = relationship("LeagueMember", back_populates="league")
    draft_picks  = relationship("DraftPick", back_populates="league")


# ─── LEAGUE MEMBER ────────────────────────────────────────────────────────────

class LeagueMember(Base):
    """
    Join table: User <-> League. Holds team name and total score.
    """
    __tablename__ = "league_members"
    __table_args__ = (UniqueConstraint("user_id", "league_id"),)

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    league_id    = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    team_name    = Column(String(100))
    draft_position = Column(Integer)              # 1-based pick order
    total_score  = Column(Float, default=0.0)
    joined_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user    = relationship("User", back_populates="league_memberships")
    league  = relationship("League", back_populates="members")
    roster  = relationship("RosterSlot", back_populates="member")


# ─── ROSTER SLOT ──────────────────────────────────────────────────────────────

class RosterSlot(Base):
    """
    A politician on a team's roster. One row per pick.
    Cabinet position is cosmetic/flavor (like fantasy football positions).
    """
    __tablename__ = "roster_slots"

    id            = Column(Integer, primary_key=True, index=True)
    member_id     = Column(Integer, ForeignKey("league_members.id"), nullable=False)
    politician_id = Column(Integer, ForeignKey("politicians.id"), nullable=False)
    cabinet_role  = Column(String(100))   # e.g. "Secretary of State" — flavor only
    is_starter    = Column(Boolean, default=True)
    acquired_at   = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("member_id", "politician_id"),)

    # Relationships
    member      = relationship("LeagueMember", back_populates="roster")
    politician  = relationship("Politician", back_populates="roster_slots")


# ─── DRAFT PICK ───────────────────────────────────────────────────────────────

class DraftPick(Base):
    """
    Immutable record of each pick during a draft.
    """
    __tablename__ = "draft_picks"

    id            = Column(Integer, primary_key=True, index=True)
    league_id     = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    member_id     = Column(Integer, ForeignKey("league_members.id"), nullable=False)
    politician_id = Column(Integer, ForeignKey("politicians.id"), nullable=False)
    pick_number   = Column(Integer, nullable=False)   # overall pick # (1, 2, 3...)
    round_number  = Column(Integer, nullable=False)
    picked_at     = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    league    = relationship("League", back_populates="draft_picks")


# ─── SCORE EVENT ──────────────────────────────────────────────────────────────

class ScoreEvent(Base):
    """
    One scoring action for one politician. Immutable audit log.
    Scoring engine aggregates these to update LeagueMember.total_score.
    """
    __tablename__ = "score_events"

    id             = Column(Integer, primary_key=True, index=True)
    politician_id  = Column(Integer, ForeignKey("politicians.id"), nullable=False)
    event_type     = Column(Enum(ScoreEventType), nullable=False)
    points         = Column(Float, nullable=False)
    description    = Column(String(500))          # human-readable detail
    source_url     = Column(String(500))          # link to ProPublica / Congress.gov
    event_date     = Column(DateTime(timezone=True), nullable=False)
    scored_at      = Column(DateTime(timezone=True), server_default=func.now())
    bill_id        = Column(String(50))           # e.g. "hr1234-119" if applicable
    vote_id        = Column(String(50))           # ProPublica vote ID if applicable

    # Prevent double-scoring same event
    __table_args__ = (
        UniqueConstraint("politician_id", "event_type", "bill_id", "vote_id",
                         name="uq_score_event"),
    )

    # Relationships
    politician = relationship("Politician", back_populates="score_events")


# ─── WEEKLY SCORE SNAPSHOT ────────────────────────────────────────────────────

class WeeklySnapshot(Base):
    """
    Stores each team's score at the end of a scoring period.
    Powers leaderboard history and weekly matchup results.
    """
    __tablename__ = "weekly_snapshots"

    id          = Column(Integer, primary_key=True, index=True)
    member_id   = Column(Integer, ForeignKey("league_members.id"), nullable=False)
    league_id   = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    season_year = Column(Integer, nullable=False)
    score       = Column(Float, nullable=False, default=0.0)
    snapshot_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("member_id", "week_number", "season_year"),
    )


# ─── LEAGUE PAYMENT ───────────────────────────────────────────────────────────

class LeaguePayment(Base):
    """
    Audit log of Stripe checkout sessions for premium league upgrades.
    One row per checkout attempt. The unique stripe_session_id makes the
    webhook safe to receive more than once (idempotent fulfillment).
    """
    __tablename__ = "league_payments"

    id                    = Column(Integer, primary_key=True, index=True)
    league_id             = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    user_id               = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_session_id     = Column(String(255), unique=True, nullable=False, index=True)
    stripe_payment_intent = Column(String(255))
    amount_cents          = Column(Integer, nullable=False)
    currency              = Column(String(10), default="usd")
    status                = Column(String(30), default="pending")  # pending | paid
    season_year           = Column(Integer)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())
    paid_at               = Column(DateTime(timezone=True))

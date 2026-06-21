# this whole file handles the stripe payment flow for upgrading a league to premium
# there are two endpoints:
#   1. /checkout — commissioner hits this to start a stripe checkout session
#   2. /webhook  — stripe calls this after payment is confirmed (this is the source of truth)
#
# important: I never trust the success redirect URL to grant premium access.
# only the webhook can flip a league to premium, because the redirect can be faked.

import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import League, LeaguePayment, User
from services.auth import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

# these come from my .env file — never hardcode them here
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# $30 per league per season — change it here and it updates everywhere
PREMIUM_PRICE_CENTS = 3000


# --- STEP 1: commissioner clicks "upgrade" and this creates a stripe checkout session ---

@router.post("/leagues/{league_id}/checkout")
def create_checkout(
    league_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # make sure the league exists, the current user is the commissioner,
    # and they haven't already paid
    league = db.query(League).filter_by(id=league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if league.commissioner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the commissioner can upgrade this league")
    if league.is_premium:
        raise HTTPException(status_code=400, detail="This league is already premium")

    # tell stripe to create a hosted checkout page for this league
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {
                    # this is what shows up on the stripe checkout page
                    "name": f"Premium League — {league.name} ({league.season_year})",
                },
                "unit_amount": PREMIUM_PRICE_CENTS,
            },
            "quantity": 1,
        }],
        # where stripe sends the user after paying (or cancelling)
        success_url=f"{FRONTEND_URL}/leagues/{league_id}?upgrade=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/leagues/{league_id}?upgrade=cancelled",
        client_reference_id=str(league.id),
        # I stash extra info in metadata so the webhook knows what to upgrade
        metadata={
            "league_id": str(league.id),
            "user_id": str(current_user.id),
            "season_year": str(league.season_year),
        },
    )

    # save a pending payment record so I can track it and match it to the webhook later.
    # the unique stripe_session_id means even if stripe sends the webhook twice, I only
    # process it once (idempotent)
    payment = LeaguePayment(
        league_id=league.id,
        user_id=current_user.id,
        stripe_session_id=session.id,
        amount_cents=PREMIUM_PRICE_CENTS,
        currency="usd",
        status="pending",
        season_year=league.season_year,
    )
    db.add(payment)
    db.commit()

    # return the checkout URL to the frontend so it can redirect the user there
    return {"checkout_url": session.url}


# --- STEP 2: stripe calls this endpoint after payment is confirmed ---
# stripe sends this server-to-server so I verify the signature to make sure
# it's really from stripe and not someone faking it

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        # if the signature doesn't match, reject it — could be a fake request
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # the only event I care about right now is a completed checkout
    if event["type"] == "checkout.session.completed":
        _fulfill_premium(db, event["data"]["object"])

    return {"received": True}


# --- helper: actually flip the league to premium after a confirmed payment ---
def _fulfill_premium(db: Session, session):
    # stripe passes a StripeObject, not a plain dict — convert it so I can
    # use normal dict access without hitting AttributeError on .get()
    if hasattr(session, 'to_dict'):
        session = session.to_dict()

    # find the pending payment I created earlier using the stripe session id
    payment = (
        db.query(LeaguePayment)
        .filter_by(stripe_session_id=session["id"])
        .first()
    )

    # if I can't find it or it's already been processed, just bail out safely
    if not payment or payment.status == "paid":
        return

    # mark the payment as paid and record when it happened
    payment.status = "paid"
    payment.stripe_payment_intent = session.get("payment_intent")
    payment.paid_at = datetime.now(timezone.utc)

    # this is the actual upgrade — flip is_premium to true on the league
    league = db.query(League).filter_by(id=payment.league_id).first()
    if league:
        league.is_premium = True
        league.premium_purchased_at = datetime.now(timezone.utc)

    db.commit()

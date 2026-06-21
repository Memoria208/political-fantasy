"""
Auth Router
POST /auth/register  — create a new account
POST /auth/login     — returns a JWT access token
GET  /auth/me        — returns current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from models.database import get_db
from models.models import User
from services.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    display_name: str | None

    class Config:
        from_attributes = True


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account and return a token immediately."""
    if db.query(User).filter_by(username=body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name or body.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)
    return {"access_token": token}


@router.post("/login", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login with username + password.
    Uses OAuth2PasswordRequestForm so it works with standard API clients.
    """
    user = db.query(User).filter_by(username=form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(user.id, user.username)
    return {"access_token": token}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Returns the currently logged-in user's info."""
    return current_user

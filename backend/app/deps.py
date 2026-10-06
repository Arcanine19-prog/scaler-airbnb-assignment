"""Request dependencies.

Authentication is mocked (allowed by the assignment): the frontend sends the id of the
user picked in the "switch account" menu as an `X-User-Id` header. Swapping this for
real auth (JWT/session) only means changing `current_user` — routers stay untouched.
"""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

DB = Annotated[Session, Depends(get_db)]


def current_user(db: DB, x_user_id: Annotated[int | None, Header()] = None) -> User:
    if x_user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Log in to continue")
    user = db.get(User, x_user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
    return user


def optional_user(db: DB, x_user_id: Annotated[int | None, Header()] = None) -> User | None:
    return db.get(User, x_user_id) if x_user_id is not None else None


CurrentUser = Annotated[User, Depends(current_user)]
OptionalUser = Annotated[User | None, Depends(optional_user)]

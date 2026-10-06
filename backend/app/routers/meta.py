"""Users (for the mocked account switcher), lookup tables, and photo uploads."""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, status
from sqlalchemy import select

from ..database import DATA_DIR
from ..deps import DB, CurrentUser
from ..models import Amenity, Category, User
from ..schemas import AmenityOut, CategoryOut, UserOut

router = APIRouter(tags=["meta"])

UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@router.get("/users", response_model=list[UserOut])
def list_users(db: DB):
    return db.scalars(select(User).order_by(User.is_host.desc(), User.id)).all()


@router.get("/users/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DB):
    return db.scalars(select(Category).order_by(Category.id)).all()


@router.get("/amenities", response_model=list[AmenityOut])
def list_amenities(db: DB):
    return db.scalars(select(Amenity).order_by(Amenity.group, Amenity.name)).all()


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_photo(_user: CurrentUser, file: UploadFile) -> dict[str, str]:
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPG, PNG or WEBP image.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Images must be 5MB or smaller.")
    # Random file name: never trust (or collide on) the client-supplied one.
    name = f"{uuid.uuid4().hex}{extension}"
    Path(UPLOAD_DIR / name).write_bytes(content)
    return {"url": f"/uploads/{name}"}

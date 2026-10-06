"""Wishlist (the heart button). PUT/DELETE are idempotent so double-clicks are harmless."""

from fastapi import APIRouter, Response, status
from sqlalchemy import delete, select

from .. import serializers
from ..deps import DB, CurrentUser
from ..models import Listing, WishlistItem
from ..schemas import ListingCard, WishlistIds
from .listings import get_active_listing

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[ListingCard])
def get_wishlist(db: DB, user: CurrentUser):
    listings = db.scalars(
        select(Listing)
        .join(WishlistItem, WishlistItem.listing_id == Listing.id)
        .where(WishlistItem.user_id == user.id, Listing.deleted_at.is_(None))
        .options(*serializers.CARD_LOAD_OPTIONS)
        .order_by(WishlistItem.created_at.desc())
    ).unique()
    return serializers.listing_cards(db, list(listings))


@router.get("/ids", response_model=WishlistIds)
def get_wishlist_ids(db: DB, user: CurrentUser):
    ids = db.scalars(select(WishlistItem.listing_id).where(WishlistItem.user_id == user.id)).all()
    return WishlistIds(listing_ids=list(ids))


@router.put("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_to_wishlist(db: DB, user: CurrentUser, listing_id: int):
    get_active_listing(db, listing_id)
    exists = db.scalar(
        select(WishlistItem.id).where(WishlistItem.user_id == user.id, WishlistItem.listing_id == listing_id)
    )
    if not exists:
        db.add(WishlistItem(user_id=user.id, listing_id=listing_id))
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(db: DB, user: CurrentUser, listing_id: int):
    db.execute(delete(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.listing_id == listing_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

"""Reading a listing's reviews and leaving one after a completed stay."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from .. import serializers
from ..deps import DB, CurrentUser
from ..models import Booking, Review
from ..schemas import ReviewCreate, ReviewOut, ReviewPage
from .listings import get_active_listing

router = APIRouter(tags=["reviews"])


@router.get("/listings/{listing_id}/reviews", response_model=ReviewPage)
def list_reviews(
    db: DB,
    listing_id: int,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 6,
):
    get_active_listing(db, listing_id)
    total = db.scalar(select(func.count(Review.id)).where(Review.listing_id == listing_id)) or 0
    items = db.scalars(
        select(Review)
        .where(Review.listing_id == listing_id)
        .options(joinedload(Review.author))
        .order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ReviewPage(items=items, total=total, page=page, page_size=page_size, has_more=page * page_size < total)


@router.post("/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(db: DB, user: CurrentUser, body: ReviewCreate):
    booking = db.get(Booking, body.booking_id)
    if booking is None or booking.guest_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if serializers.trip_status(booking) != "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can review a stay once it's completed.")
    if booking.review is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "You've already reviewed this stay.")

    review = Review(listing_id=booking.listing_id, author_id=user.id, **body.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

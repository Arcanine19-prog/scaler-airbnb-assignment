"""Host dashboard: the current user's listings and the reservations made on them."""

from fastapi import APIRouter
from sqlalchemy import case, func, select

from .. import serializers
from ..deps import DB, CurrentUser
from ..models import Booking, Listing
from ..schemas import BookingOut, HostListing
from ..services.clock import today
from .bookings import load_bookings

router = APIRouter(prefix="/host", tags=["host"])


@router.get("/listings", response_model=list[HostListing])
def my_listings(db: DB, user: CurrentUser):
    listings = list(
        db.scalars(
            select(Listing)
            .where(Listing.host_id == user.id, Listing.deleted_at.is_(None))
            .options(*serializers.CARD_LOAD_OPTIONS)
            .order_by(Listing.created_at.desc(), Listing.id.desc())
        ).unique()
    )
    confirmed = Booking.status == "confirmed"
    stats = {
        row.listing_id: row
        for row in db.execute(
            select(
                Booking.listing_id,
                func.sum(case((confirmed & (Booking.check_out > today()), 1), else_=0)).label("upcoming"),
                func.sum(case((confirmed, 1), else_=0)).label("total"),
                func.sum(case((confirmed, Booking.total_price), else_=0)).label("earnings"),
            )
            .where(Booking.listing_id.in_([l.id for l in listings]))
            .group_by(Booking.listing_id)
        )
    }
    return [
        HostListing(
            listing=card,
            upcoming_bookings=stats[card.id].upcoming if card.id in stats else 0,
            total_bookings=stats[card.id].total if card.id in stats else 0,
            earnings=stats[card.id].earnings if card.id in stats else 0,
        )
        for card in serializers.listing_cards(db, listings)
    ]


@router.get("/reservations", response_model=list[BookingOut])
def my_reservations(db: DB, user: CurrentUser):
    owned = select(Listing.id).where(Listing.host_id == user.id)
    return serializers.bookings_out(db, load_bookings(db, Booking.listing_id.in_(owned)))

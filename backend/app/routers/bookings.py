"""Guest booking flow: reserve, list trips, view, cancel."""

import threading

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from .. import serializers
from ..deps import DB, CurrentUser
from ..models import Booking
from ..schemas import BookingCreate, BookingOut
from ..services import availability, pricing
from ..services.clock import today
from .listings import get_active_listing

router = APIRouter(prefix="/bookings", tags=["bookings"])

# The availability check and the insert must happen atomically, otherwise two requests
# for the same dates could both pass the check. The app runs as a single process on
# SQLite, so a process-wide lock is enough. (With Postgres + multiple workers this would
# become a row lock / exclusion constraint instead.)
_booking_lock = threading.Lock()

BOOKING_LOAD_OPTIONS = (
    joinedload(Booking.guest),
    joinedload(Booking.review),
    joinedload(Booking.listing).options(*serializers.CARD_LOAD_OPTIONS),
)


def load_bookings(db: DB, *conditions) -> list[Booking]:
    return list(
        db.scalars(
            select(Booking).where(*conditions).options(*BOOKING_LOAD_OPTIONS).order_by(Booking.check_in.desc())
        ).unique()
    )


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(db: DB, user: CurrentUser, body: BookingCreate):
    listing = get_active_listing(db, body.listing_id)
    if listing.host_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't book your own listing.")
    error = availability.validate_stay_dates(body.check_in, body.check_out, today())
    if error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, error)
    if body.guests > listing.max_guests:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"This place allows up to {listing.max_guests} guests."
        )

    q = pricing.quote_stay(listing.price_per_night, listing.cleaning_fee, body.check_in, body.check_out)
    with _booking_lock:
        if not availability.is_available(db, listing.id, body.check_in, body.check_out):
            raise HTTPException(status.HTTP_409_CONFLICT, "Those dates are no longer available.")
        booking = Booking(
            listing_id=listing.id,
            guest_id=user.id,
            check_in=body.check_in,
            check_out=body.check_out,
            guests=body.guests,
            status="confirmed",
            nightly_price=q.nightly_price,
            nights=q.nights,
            cleaning_fee=q.cleaning_fee,
            service_fee=q.service_fee,
            taxes=q.taxes,
            total_price=q.total,
        )
        db.add(booking)
        db.commit()

    return serializers.bookings_out(db, load_bookings(db, Booking.id == booking.id))[0]


@router.get("/me", response_model=list[BookingOut])
def my_trips(db: DB, user: CurrentUser):
    return serializers.bookings_out(db, load_bookings(db, Booking.guest_id == user.id))


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(db: DB, user: CurrentUser, booking_id: int):
    bookings = load_bookings(db, Booking.id == booking_id)
    if not bookings:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    booking = bookings[0]
    # Visible to the guest who booked and the host of the listing.
    if user.id not in (booking.guest_id, booking.listing.host_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    return serializers.bookings_out(db, bookings)[0]


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(db: DB, user: CurrentUser, booking_id: int):
    booking = db.get(Booking, booking_id)
    if booking is None or booking.guest_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if serializers.trip_status(booking) != "upcoming":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only upcoming trips can be cancelled.")
    booking.status = "cancelled"  # frees the dates: availability only counts confirmed bookings
    db.commit()
    return serializers.bookings_out(db, load_bookings(db, Booking.id == booking_id))[0]


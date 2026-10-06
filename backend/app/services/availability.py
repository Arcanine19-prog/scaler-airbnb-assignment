"""Date-range availability rules.

Bookings are half-open ranges [check_in, check_out): a guest checking out on the 10th
frees the night of the 10th, so back-to-back stays (out 10th / in 10th) are allowed.
Two ranges overlap iff  existing.check_in < new.check_out  AND  existing.check_out > new.check_in.
"""

from datetime import date

from sqlalchemy import and_, exists, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from ..models import Booking

MAX_NIGHTS = 90


def overlaps(check_in: date, check_out: date) -> ColumnElement[bool]:
    """SQL condition: a confirmed booking overlaps the requested window."""
    return and_(
        Booking.status == "confirmed",
        Booking.check_in < check_out,
        Booking.check_out > check_in,
    )


def is_available(
    db: Session, listing_id: int, check_in: date, check_out: date, exclude_booking_id: int | None = None
) -> bool:
    condition = and_(Booking.listing_id == listing_id, overlaps(check_in, check_out))
    if exclude_booking_id is not None:
        condition = and_(condition, Booking.id != exclude_booking_id)
    return not db.scalar(select(exists().where(condition)))


def unavailable_listing_ids(check_in: date, check_out: date):
    """Subquery of listing ids that are booked at some point in the window (for search)."""
    return select(Booking.listing_id).where(overlaps(check_in, check_out))


def booked_ranges(db: Session, listing_id: int, from_date: date) -> list[tuple[date, date]]:
    rows = db.execute(
        select(Booking.check_in, Booking.check_out)
        .where(Booking.listing_id == listing_id, Booking.status == "confirmed", Booking.check_out > from_date)
        .order_by(Booking.check_in)
    ).all()
    return [(r.check_in, r.check_out) for r in rows]


def validate_stay_dates(check_in: date, check_out: date, today: date) -> str | None:
    """Return a human-readable error, or None if the window itself is valid."""
    if check_in < today:
        return "Check-in date can't be in the past."
    if check_out <= check_in:
        return "Check-out must be after check-in."
    if (check_out - check_in).days > MAX_NIGHTS:
        return f"Stays are limited to {MAX_NIGHTS} nights."
    return None

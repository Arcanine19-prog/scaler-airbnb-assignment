"""Rating aggregation, Guest favourite and Superhost rules.

Ratings are aggregated on read with SQL AVG/COUNT instead of being stored on the listing,
so they can never drift out of sync with the reviews table.
"""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Listing, Review

SUPERHOST_MIN_RATING = 4.8
SUPERHOST_MIN_REVIEWS = 5
GUEST_FAVOURITE_MIN_RATING = 4.85
GUEST_FAVOURITE_MIN_REVIEWS = 3

SUB_RATINGS = ("cleanliness", "accuracy", "check_in", "communication", "location", "value")


@dataclass(frozen=True)
class RatingSummary:
    average: float | None
    count: int

    @property
    def is_guest_favourite(self) -> bool:
        return (
            self.average is not None
            and self.count >= GUEST_FAVOURITE_MIN_REVIEWS
            and self.average >= GUEST_FAVOURITE_MIN_RATING
        )


def listing_ratings(db: Session, listing_ids: list[int]) -> dict[int, RatingSummary]:
    """One grouped query for a whole page of listings (avoids N+1 queries)."""
    if not listing_ids:
        return {}
    rows = db.execute(
        select(Review.listing_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.listing_id.in_(listing_ids))
        .group_by(Review.listing_id)
    ).all()
    found = {lid: RatingSummary(round(avg, 2), count) for lid, avg, count in rows}
    return {lid: found.get(lid, RatingSummary(None, 0)) for lid in listing_ids}


def category_breakdown(db: Session, listing_id: int) -> dict[str, float]:
    columns = [func.avg(getattr(Review, name)) for name in SUB_RATINGS]
    row = db.execute(select(*columns).where(Review.listing_id == listing_id)).one()
    return {name: round(value, 1) for name, value in zip(SUB_RATINGS, row) if value is not None}


def rating_distribution(db: Session, listing_id: int) -> dict[int, int]:
    rows = db.execute(
        select(Review.rating, func.count(Review.id)).where(Review.listing_id == listing_id).group_by(Review.rating)
    ).all()
    counts = dict(rows)
    return {stars: counts.get(stars, 0) for stars in range(5, 0, -1)}


def host_stats(db: Session, host_ids: list[int]) -> dict[int, RatingSummary]:
    """Average rating + review count across all of each host's listings."""
    if not host_ids:
        return {}
    rows = db.execute(
        select(Listing.host_id, func.avg(Review.rating), func.count(Review.id))
        .join(Review, Review.listing_id == Listing.id)
        .where(Listing.host_id.in_(host_ids))
        .group_by(Listing.host_id)
    ).all()
    found = {hid: RatingSummary(round(avg, 2), count) for hid, avg, count in rows}
    return {hid: found.get(hid, RatingSummary(None, 0)) for hid in host_ids}


def is_superhost(summary: RatingSummary) -> bool:
    return (
        summary.average is not None
        and summary.count >= SUPERHOST_MIN_REVIEWS
        and summary.average >= SUPERHOST_MIN_RATING
    )

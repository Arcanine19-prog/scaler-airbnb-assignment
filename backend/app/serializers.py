"""ORM → response-schema conversion, kept out of the routers so every endpoint
returns listings/bookings in exactly the same shape."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from .models import Booking, Listing, User
from .schemas import BookingOut, HostOut, ListingCard, ListingDetail, UserOut
from .services import ratings
from .services.clock import today

CARD_PHOTO_COUNT = 5

# Eager-load everything a card needs in a fixed number of queries instead of one per listing.
CARD_LOAD_OPTIONS = (
    selectinload(Listing.photos),
    joinedload(Listing.host),
    joinedload(Listing.category),
)


def listing_cards(db: Session, listings: list[Listing]) -> list[ListingCard]:
    summaries = ratings.listing_ratings(db, [l.id for l in listings])
    return [_card(l, summaries[l.id]) for l in listings]


def _card(listing: Listing, summary: ratings.RatingSummary) -> ListingCard:
    return ListingCard(
        id=listing.id,
        title=listing.title,
        city=listing.city,
        state=listing.state,
        property_type=listing.property_type,
        category_slug=listing.category.slug if listing.category else None,
        price_per_night=listing.price_per_night,
        photos=[p.url for p in listing.photos[:CARD_PHOTO_COUNT]],
        rating=summary.average,
        review_count=summary.count,
        is_guest_favourite=summary.is_guest_favourite,
        latitude=listing.latitude,
        longitude=listing.longitude,
        max_guests=listing.max_guests,
        bedrooms=listing.bedrooms,
        beds=listing.beds,
        host_name=listing.host.name,
    )


def host_out(db: Session, host: User) -> HostOut:
    summary = ratings.host_stats(db, [host.id])[host.id]
    listing_count = db.scalar(
        select(func.count(Listing.id)).where(Listing.host_id == host.id, Listing.deleted_at.is_(None))
    )
    return HostOut(
        **UserOut.model_validate(host).model_dump(),
        is_superhost=ratings.is_superhost(summary),
        rating=summary.average,
        review_count=summary.count,
        listing_count=listing_count or 0,
    )


def listing_detail(db: Session, listing: Listing) -> ListingDetail:
    summary = ratings.listing_ratings(db, [listing.id])[listing.id]
    return ListingDetail(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        property_type=listing.property_type,
        category=listing.category,
        city=listing.city,
        state=listing.state,
        country=listing.country,
        latitude=listing.latitude,
        longitude=listing.longitude,
        price_per_night=listing.price_per_night,
        cleaning_fee=listing.cleaning_fee,
        max_guests=listing.max_guests,
        bedrooms=listing.bedrooms,
        beds=listing.beds,
        bathrooms=listing.bathrooms,
        photos=listing.photos,
        amenities=sorted(listing.amenities, key=lambda a: (a.group, a.name)),
        host=host_out(db, listing.host),
        rating=summary.average,
        review_count=summary.count,
        is_guest_favourite=summary.is_guest_favourite,
        rating_breakdown=ratings.category_breakdown(db, listing.id),
        rating_distribution=ratings.rating_distribution(db, listing.id),
        created_at=listing.created_at,
    )


def trip_status(booking: Booking) -> str:
    if booking.status == "cancelled":
        return "cancelled"
    now = today()
    if booking.check_out <= now:
        return "completed"
    if booking.check_in <= now:
        return "current"
    return "upcoming"


def bookings_out(db: Session, bookings: list[Booking]) -> list[BookingOut]:
    cards = {c.id: c for c in listing_cards(db, list({b.listing_id: b.listing for b in bookings}.values()))}
    result = []
    for b in bookings:
        status = trip_status(b)
        result.append(
            BookingOut(
                id=b.id,
                listing=cards[b.listing_id],
                guest=UserOut.model_validate(b.guest),
                check_in=b.check_in,
                check_out=b.check_out,
                guests=b.guests,
                status=b.status,
                trip_status=status,
                nightly_price=b.nightly_price,
                nights=b.nights,
                cleaning_fee=b.cleaning_fee,
                service_fee=b.service_fee,
                taxes=b.taxes,
                total_price=b.total_price,
                created_at=b.created_at,
                can_cancel=status == "upcoming",
                can_review=status == "completed" and b.review is None,
                has_review=b.review is not None,
            )
        )
    return result

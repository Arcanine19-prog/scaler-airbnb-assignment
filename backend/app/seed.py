"""Populate the database with sample data so the app is usable immediately.

Run manually with `python -m app.seed --reset`; the API also seeds itself on startup
when the database is empty (useful on hosts with ephemeral disks).

Booking dates are generated relative to today, so there are always past stays
(with reviews), current/upcoming stays that block dates, and demo trips for the
default guest account, no matter when the seed runs.
"""

import argparse
import random
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import seed_data as data
from .database import Base, SessionLocal, engine
from .models import Amenity, Booking, Category, Listing, ListingPhoto, Review, User
from .services.clock import today
from .services.pricing import quote_stay

PHOTO_URL = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=1200&q=80"
DEMO_GUEST_EMAIL = "aarav@example.com"


class _PhotoPicker:
    """Hands out photos from each group round-robin so neighbouring listings don't look identical."""

    def __init__(self) -> None:
        self._cursor = {group: 0 for group in data.PHOTOS}

    def take(self, group: str, count: int = 1) -> list[str]:
        ids = data.PHOTOS[group]
        picked = []
        for _ in range(count):
            picked.append(PHOTO_URL.format(id=ids[self._cursor[group] % len(ids)]))
            self._cursor[group] += 1
        return picked


def _timeline(rng: random.Random, start: date, end: date, max_count: int) -> list[tuple[date, date]]:
    """Non-overlapping (check_in, check_out) windows between start and end."""
    slots, cursor = [], start
    while len(slots) < max_count:
        check_in = cursor + timedelta(days=rng.randint(2, 30))
        check_out = check_in + timedelta(days=rng.randint(2, 5))
        if check_out > end:
            break
        slots.append((check_in, check_out))
        cursor = check_out
    return slots


def _make_booking(listing: Listing, guest: User, check_in: date, check_out: date, rng: random.Random,
                  status: str = "confirmed") -> Booking:
    q = quote_stay(listing.price_per_night, listing.cleaning_fee, check_in, check_out)
    booked_on = min(check_in - timedelta(days=rng.randint(7, 60)), today())
    return Booking(
        listing=listing, guest=guest, check_in=check_in, check_out=check_out,
        guests=rng.randint(1, listing.max_guests), status=status,
        nightly_price=q.nightly_price, nights=q.nights, cleaning_fee=q.cleaning_fee,
        service_fee=q.service_fee, taxes=q.taxes, total_price=q.total,
        created_at=datetime.combine(booked_on, time(rng.randint(8, 22), rng.randint(0, 59))),
    )


def _make_review(booking: Booking, quality: float, rng: random.Random) -> Review:
    # Airbnb ratings are heavily skewed towards 5: `quality` 4.8 means ~80% five-star scores.
    p_five = max(0.05, quality - 4)

    def stars() -> int:
        if rng.random() < p_five:
            return 5
        return 4 if rng.random() < 0.8 else 3

    comment = rng.choice(data.REVIEW_COMMENTS).format(
        host=booking.listing.host.name.split()[0], city=booking.listing.city
    )
    written_on = booking.check_out + timedelta(days=rng.randint(1, 6))
    return Review(
        listing=booking.listing, author=booking.guest, booking=booking,
        rating=stars(), cleanliness=stars(), accuracy=stars(), check_in=stars(),
        communication=stars(), location=stars(), value=stars(), comment=comment,
        created_at=datetime.combine(min(written_on, today()), time(rng.randint(8, 22), 0)),
    )


def seed(db: Session) -> None:
    rng = random.Random(42)  # deterministic: the same data every time
    now = today()

    categories = {slug: Category(slug=slug, name=name, icon=icon) for slug, name, icon in data.CATEGORIES}
    amenities = {name: Amenity(name=name, icon=icon, group=group) for name, icon, group in data.AMENITIES}
    db.add_all([*categories.values(), *amenities.values()])

    hosts = [
        User(name=n, email=e, avatar_url=a, location=loc, bio=bio, is_host=True,
             created_at=datetime(2016 + i, 1 + i, 10))
        for i, (n, e, a, loc, bio) in enumerate(data.HOSTS)
    ]
    guests = [
        User(name=n, email=e, avatar_url=a, location=loc, bio=bio, is_host=False,
             created_at=datetime(2020 + i % 5, 1 + i, 5))
        for i, (n, e, a, loc, bio) in enumerate(data.GUESTS)
    ]
    db.add_all([*hosts, *guests])
    demo_guest = next(g for g in guests if g.email == DEMO_GUEST_EMAIL)

    photos = _PhotoPicker()
    listings: list[Listing] = []
    for (host_i, title, city, state, lat, lng, ptype, category, price, cleaning, max_guests,
         bedrooms, beds, baths, group, extra, highlight) in data.LISTINGS:
        amenity_names = set(data.BASE_AMENITIES) | set(extra)
        amenity_names |= set(rng.sample(data.OPTIONAL_AMENITIES, k=rng.randint(1, 3)))
        photo_urls = (
            photos.take(group, 2) + photos.take("living", 2) + photos.take("bedroom", 2) + photos.take("kitchen_bath")
        )
        listing = Listing(
            host=hosts[host_i], category=categories[category], title=title,
            description=f"{highlight}\n\n{data.PROPERTY_BLURBS[ptype]}\n\nGuests have access to the whole "
                        f"space unless mentioned otherwise. We're always a message away if you need "
                        f"recommendations around {city}.",
            property_type=ptype, city=city, state=state, latitude=lat, longitude=lng,
            price_per_night=price, cleaning_fee=cleaning, max_guests=max_guests,
            bedrooms=bedrooms, beds=beds, bathrooms=baths,
            amenities=[amenities[n] for n in sorted(amenity_names)],
            photos=[ListingPhoto(url=u, position=i) for i, u in enumerate(photo_urls)],
        )
        listings.append(listing)
    db.add_all(listings)

    other_guests = [g for g in guests if g is not demo_guest]
    # Some hosts consistently earn top scores (-> Superhost), others are good but more mixed.
    host_quality = {0: (4.85, 5.0), 2: (4.85, 5.0), 4: (4.8, 5.0), 1: (4.3, 4.9), 3: (4.4, 4.9), 5: (4.2, 4.9)}
    for i, listing in enumerate(listings):
        quality = rng.uniform(*host_quality[hosts.index(listing.host)])
        past = _timeline(rng, now - timedelta(days=420), now - timedelta(days=1), max_count=rng.randint(4, 14))
        future = _timeline(rng, now, now + timedelta(days=75), max_count=rng.randint(0, 3))

        for check_in, check_out in past:
            booking = _make_booking(listing, rng.choice(other_guests), check_in, check_out, rng)
            db.add(booking)
            if rng.random() < 0.9:
                db.add(_make_review(booking, quality, rng))
        for check_in, check_out in future:
            db.add(_make_booking(listing, rng.choice(other_guests), check_in, check_out, rng))

    # Demo trips for the default guest, placed in windows no seeded booking uses.
    def demo_trip(listing: Listing, offset: int, nights: int, status: str = "confirmed") -> Booking:
        check_in = now + timedelta(days=offset)
        check_out = check_in + timedelta(days=nights)
        _clear_window(db, listing, check_in, check_out)
        booking = _make_booking(listing, demo_guest, check_in, check_out, rng, status)
        db.add(booking)
        return booking

    demo_trip(listings[0], 18, 4)  # upcoming
    demo_trip(listings[8], 40, 3)  # upcoming
    reviewed = demo_trip(listings[16], -60, 3)  # completed and reviewed
    db.add(_make_review(reviewed, 4.8, rng))
    demo_trip(listings[24], -25, 2)  # completed, not yet reviewed -> "Leave a review" demo
    demo_trip(listings[31], 30, 2, status="cancelled")

    db.commit()


def _clear_window(db: Session, listing: Listing, check_in: date, check_out: date) -> None:
    """Drop seeded bookings that would collide with a demo trip (keeps the data consistent)."""
    db.flush()
    for booking in db.scalars(
        select(Booking).where(
            Booking.listing_id == listing.id, Booking.check_in < check_out, Booking.check_out > check_in
        )
    ):
        if booking.review is not None:
            db.delete(booking.review)
        db.delete(booking)
    db.flush()


def seed_if_empty() -> bool:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(User.id).limit(1)) is not None:
            return False
        seed(db)
        return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Airbnb clone database")
    parser.add_argument("--reset", action="store_true", help="drop all tables before seeding")
    args = parser.parse_args()
    if args.reset:
        Base.metadata.drop_all(engine)
    print("Seeded." if seed_if_empty() else "Database already has data; use --reset to re-seed.")


if __name__ == "__main__":
    main()

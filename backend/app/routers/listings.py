"""Public listing endpoints (search, detail, availability, quote) and host CRUD."""

from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select

from .. import serializers
from ..deps import DB, CurrentUser
from ..models import Amenity, Booking, Category, Listing, ListingPhoto, listing_amenities
from ..schemas import ListingDetail, ListingPage, ListingWrite, PropertyType, Quote, UnavailableRange
from ..services import availability, pricing
from ..services.clock import today

router = APIRouter(prefix="/listings", tags=["listings"])


def get_active_listing(db: DB, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None or listing.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return listing


@router.get("", response_model=ListingPage)
def search_listings(
    db: DB,
    location: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: Annotated[int | None, Query(ge=1)] = None,
    category: str | None = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
    property_type: Annotated[list[PropertyType] | None, Query()] = None,
    amenity: Annotated[list[int] | None, Query(description="Listing must have ALL of these amenity ids")] = None,
    min_bedrooms: Annotated[int | None, Query(ge=0)] = None,
    min_beds: Annotated[int | None, Query(ge=0)] = None,
    min_bathrooms: Annotated[int | None, Query(ge=0)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
):
    query = select(Listing).where(Listing.deleted_at.is_(None))

    if location:
        term = f"%{location.strip()}%"
        query = query.where(or_(Listing.city.ilike(term), Listing.state.ilike(term), Listing.title.ilike(term)))
    if check_in and check_out:
        if check_out <= check_in:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Check-out must be after check-in")
        query = query.where(Listing.id.not_in(availability.unavailable_listing_ids(check_in, check_out)))
    if guests:
        query = query.where(Listing.max_guests >= guests)
    if category:
        query = query.join(Category).where(Category.slug == category)
    if min_price is not None:
        query = query.where(Listing.price_per_night >= min_price)
    if max_price is not None:
        query = query.where(Listing.price_per_night <= max_price)
    if property_type:
        query = query.where(Listing.property_type.in_(property_type))
    if amenity:
        # Relational division: keep listings that have every requested amenity.
        having_all = (
            select(listing_amenities.c.listing_id)
            .where(listing_amenities.c.amenity_id.in_(amenity))
            .group_by(listing_amenities.c.listing_id)
            .having(func.count(func.distinct(listing_amenities.c.amenity_id)) == len(set(amenity)))
        )
        query = query.where(Listing.id.in_(having_all))
    if min_bedrooms:
        query = query.where(Listing.bedrooms >= min_bedrooms)
    if min_beds:
        query = query.where(Listing.beds >= min_beds)
    if min_bathrooms:
        query = query.where(Listing.bathrooms >= min_bathrooms)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(
        query.options(*serializers.CARD_LOAD_OPTIONS)
        .order_by(Listing.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).unique().all()

    return ListingPage(
        items=serializers.listing_cards(db, list(rows)),
        total=total,
        page=page,
        page_size=page_size,
        has_more=page * page_size < total,
    )


@router.get("/{listing_id}", response_model=ListingDetail)
def get_listing(db: DB, listing_id: int):
    return serializers.listing_detail(db, get_active_listing(db, listing_id))


@router.get("/{listing_id}/unavailable", response_model=list[UnavailableRange])
def get_unavailable_dates(db: DB, listing_id: int):
    get_active_listing(db, listing_id)
    return [
        UnavailableRange(check_in=start, check_out=end)
        for start, end in availability.booked_ranges(db, listing_id, from_date=today())
    ]


@router.get("/{listing_id}/quote", response_model=Quote)
def get_quote(db: DB, listing_id: int, check_in: date, check_out: date, guests: Annotated[int, Query(ge=1)] = 1):
    listing = get_active_listing(db, listing_id)
    error = availability.validate_stay_dates(check_in, check_out, today())
    if error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, error)
    if guests > listing.max_guests:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"This place allows up to {listing.max_guests} guests")
    q = pricing.quote_stay(listing.price_per_night, listing.cleaning_fee, check_in, check_out)
    return Quote(available=availability.is_available(db, listing_id, check_in, check_out), **q.__dict__)


# ---------- Host CRUD ----------

def _apply_listing_fields(db: DB, listing: Listing, body: ListingWrite) -> None:
    if body.category_id is not None and db.get(Category, body.category_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown category")
    amenities = db.scalars(select(Amenity).where(Amenity.id.in_(body.amenity_ids))).all() if body.amenity_ids else []
    if len(amenities) != len(set(body.amenity_ids)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown amenity")

    for field in (
        "title", "description", "property_type", "category_id", "city", "state", "country",
        "latitude", "longitude", "price_per_night", "cleaning_fee", "max_guests", "bedrooms", "beds", "bathrooms",
    ):
        setattr(listing, field, getattr(body, field))
    listing.amenities = list(amenities)
    # Replacing the collection deletes the old rows via delete-orphan.
    listing.photos = [ListingPhoto(url=url, position=i) for i, url in enumerate(body.photo_urls)]


def _get_owned_listing(db: DB, listing_id: int, user: CurrentUser) -> Listing:
    listing = get_active_listing(db, listing_id)
    if listing.host_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only manage your own listings")
    return listing


@router.post("", response_model=ListingDetail, status_code=status.HTTP_201_CREATED)
def create_listing(db: DB, user: CurrentUser, body: ListingWrite):
    listing = Listing(host_id=user.id)
    _apply_listing_fields(db, listing, body)
    user.is_host = True
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return serializers.listing_detail(db, listing)


@router.put("/{listing_id}", response_model=ListingDetail)
def update_listing(db: DB, user: CurrentUser, listing_id: int, body: ListingWrite):
    listing = _get_owned_listing(db, listing_id, user)
    _apply_listing_fields(db, listing, body)
    db.commit()
    db.refresh(listing)
    return serializers.listing_detail(db, listing)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(db: DB, user: CurrentUser, listing_id: int):
    listing = _get_owned_listing(db, listing_id, user)
    has_upcoming = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.listing_id == listing.id, Booking.status == "confirmed", Booking.check_out > today()
        )
    )
    if has_upcoming:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You can't delete a listing that has upcoming reservations.",
        )
    listing.deleted_at = datetime.now()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

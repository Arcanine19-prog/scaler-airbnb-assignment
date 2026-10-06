"""Pydantic request/response models — the public API contract."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PropertyType = Literal["house", "apartment", "villa", "cabin", "cottage", "guesthouse"]
TripStatus = Literal["upcoming", "current", "completed", "cancelled"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Users ----------

class UserOut(ORMModel):
    id: int
    name: str
    avatar_url: str | None
    location: str | None
    bio: str | None
    is_host: bool
    created_at: datetime


class HostOut(UserOut):
    is_superhost: bool
    rating: float | None
    review_count: int
    listing_count: int


# ---------- Lookups ----------

class CategoryOut(ORMModel):
    id: int
    slug: str
    name: str
    icon: str


class AmenityOut(ORMModel):
    id: int
    name: str
    icon: str
    group: str


# ---------- Listings ----------

class ListingCard(BaseModel):
    """Compact shape used by the explore grid, map pins, wishlists and dashboards."""

    id: int
    title: str
    city: str
    state: str
    property_type: str
    category_slug: str | None
    price_per_night: int
    photos: list[str]  # first few photo URLs, for the card carousel
    rating: float | None
    review_count: int
    is_guest_favourite: bool
    latitude: float
    longitude: float
    max_guests: int
    bedrooms: int
    beds: int
    host_name: str


class ListingPage(BaseModel):
    items: list[ListingCard]
    total: int
    page: int
    page_size: int
    has_more: bool


class PhotoOut(ORMModel):
    id: int
    url: str
    position: int


class ListingDetail(BaseModel):
    id: int
    title: str
    description: str
    property_type: str
    category: CategoryOut | None
    city: str
    state: str
    country: str
    latitude: float
    longitude: float
    price_per_night: int
    cleaning_fee: int
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    photos: list[PhotoOut]
    amenities: list[AmenityOut]
    host: HostOut
    rating: float | None
    review_count: int
    is_guest_favourite: bool
    rating_breakdown: dict[str, float]
    rating_distribution: dict[int, int]
    created_at: datetime


class ListingWrite(BaseModel):
    """Body for creating (POST) or fully replacing (PUT) a listing."""

    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=20, max_length=5000)
    property_type: PropertyType
    category_id: int | None = None
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    country: str = Field(default="India", max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    price_per_night: int = Field(gt=0, le=1_000_000)
    cleaning_fee: int = Field(default=0, ge=0, le=100_000)
    max_guests: int = Field(ge=1, le=16)
    bedrooms: int = Field(ge=0, le=50)
    beds: int = Field(ge=1, le=50)
    bathrooms: int = Field(ge=1, le=50)
    amenity_ids: list[int] = Field(default_factory=list)
    photo_urls: list[str] = Field(min_length=1, max_length=20)

    @field_validator("photo_urls")
    @classmethod
    def _valid_photo_urls(cls, urls: list[str]) -> list[str]:
        cleaned = [u.strip() for u in urls if u.strip()]
        for url in cleaned:
            if not (url.startswith("http://") or url.startswith("https://") or url.startswith("/uploads/")):
                raise ValueError(f"Invalid photo URL: {url}")
        if not cleaned:
            raise ValueError("At least one photo is required")
        return cleaned


class UnavailableRange(BaseModel):
    check_in: date
    check_out: date  # exclusive


class Quote(BaseModel):
    available: bool
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


# ---------- Bookings ----------

class BookingCreate(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: int = Field(ge=1, le=16)

    @model_validator(mode="after")
    def _dates_in_order(self) -> "BookingCreate":
        if self.check_out <= self.check_in:
            raise ValueError("Check-out must be after check-in")
        return self


class BookingOut(BaseModel):
    id: int
    listing: ListingCard
    guest: UserOut
    check_in: date
    check_out: date
    guests: int
    status: str
    trip_status: TripStatus
    nightly_price: int
    nights: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total_price: int
    created_at: datetime
    can_cancel: bool
    can_review: bool
    has_review: bool


# ---------- Reviews ----------

Stars = Field(ge=1, le=5)


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Stars
    cleanliness: int = Stars
    accuracy: int = Stars
    check_in: int = Stars
    communication: int = Stars
    location: int = Stars
    value: int = Stars
    comment: str = Field(min_length=10, max_length=2000)


class ReviewOut(ORMModel):
    id: int
    author: UserOut
    rating: int
    comment: str
    created_at: datetime


class ReviewPage(BaseModel):
    items: list[ReviewOut]
    total: int
    page: int
    page_size: int
    has_more: bool


# ---------- Host dashboard ----------

class HostListing(BaseModel):
    listing: ListingCard
    upcoming_bookings: int
    total_bookings: int
    earnings: int  # sum of confirmed booking totals


class WishlistIds(BaseModel):
    listing_ids: list[int]

// Mirrors the backend's Pydantic schemas (backend/app/schemas.py).

export type PropertyType = "house" | "apartment" | "villa" | "cabin" | "cottage" | "guesthouse";
export type TripStatus = "upcoming" | "current" | "completed" | "cancelled";

export interface User {
  id: number;
  name: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  is_host: boolean;
  created_at: string;
}

export interface Host extends User {
  is_superhost: boolean;
  rating: number | null;
  review_count: number;
  listing_count: number;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
  group: string;
}

export interface ListingCard {
  id: number;
  title: string;
  city: string;
  state: string;
  property_type: PropertyType;
  category_slug: string | null;
  price_per_night: number;
  photos: string[];
  rating: number | null;
  review_count: number;
  is_guest_favourite: boolean;
  latitude: number;
  longitude: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  host_name: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface Photo {
  id: number;
  url: string;
  position: number;
}

export interface ListingDetail {
  id: number;
  title: string;
  description: string;
  property_type: PropertyType;
  category: Category | null;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  cleaning_fee: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  photos: Photo[];
  amenities: Amenity[];
  host: Host;
  rating: number | null;
  review_count: number;
  is_guest_favourite: boolean;
  rating_breakdown: Record<string, number>;
  rating_distribution: Record<string, number>;
  created_at: string;
}

export interface ListingWrite {
  title: string;
  description: string;
  property_type: PropertyType;
  category_id: number | null;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  cleaning_fee: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenity_ids: number[];
  photo_urls: string[];
}

export interface DateRange {
  check_in: string; // yyyy-MM-dd
  check_out: string; // exclusive
}

export interface Quote {
  available: boolean;
  nightly_price: number;
  nights: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total: number;
}

export interface Booking {
  id: number;
  listing: ListingCard;
  guest: User;
  check_in: string;
  check_out: string;
  guests: number;
  status: "confirmed" | "cancelled";
  trip_status: TripStatus;
  nightly_price: number;
  nights: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total_price: number;
  created_at: string;
  can_cancel: boolean;
  can_review: boolean;
  has_review: boolean;
}

export interface Review {
  id: number;
  author: User;
  rating: number;
  comment: string;
  created_at: string;
}

export interface HostListing {
  listing: ListingCard;
  upcoming_bookings: number;
  total_bookings: number;
  earnings: number;
}

export interface ReviewCreate {
  booking_id: number;
  rating: number;
  cleanliness: number;
  accuracy: number;
  check_in: number;
  communication: number;
  location: number;
  value: number;
  comment: string;
}

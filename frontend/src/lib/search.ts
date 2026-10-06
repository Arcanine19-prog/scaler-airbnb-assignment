import type { SearchParams } from "./api";

/**
 * Search state lives in the URL (/?location=Goa&check_in=...&adults=2&category=...),
 * so results are shareable, survive refreshes, and back/forward work as on Airbnb.
 */
export interface SearchState {
  location: string;
  checkIn: string | null;
  checkOut: string | null;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  propertyTypes: string[];
  amenities: number[];
  minBedrooms: number;
  minBeds: number;
  minBathrooms: number;
}

const int = (v: string | null, fallback = 0) => {
  const n = v === null ? NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function parseSearch(params: URLSearchParams): SearchState {
  return {
    location: params.get("location") ?? "",
    checkIn: params.get("check_in"),
    checkOut: params.get("check_out"),
    adults: int(params.get("adults")),
    children: int(params.get("children")),
    infants: int(params.get("infants")),
    pets: int(params.get("pets")),
    category: params.get("category"),
    minPrice: params.get("min_price") ? int(params.get("min_price")) : null,
    maxPrice: params.get("max_price") ? int(params.get("max_price")) : null,
    propertyTypes: params.getAll("property_type"),
    amenities: params.getAll("amenity").map(Number).filter(Number.isFinite),
    minBedrooms: int(params.get("min_bedrooms")),
    minBeds: int(params.get("min_beds")),
    minBathrooms: int(params.get("min_bathrooms")),
  };
}

export function buildSearchUrl(state: Partial<SearchState>, path = "/"): string {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && v !== "" && v !== 0) p.set(k, String(v));
  };
  set("location", state.location?.trim());
  set("check_in", state.checkIn);
  set("check_out", state.checkOut);
  set("adults", state.adults);
  set("children", state.children);
  set("infants", state.infants);
  set("pets", state.pets);
  set("category", state.category);
  set("min_price", state.minPrice);
  set("max_price", state.maxPrice);
  state.propertyTypes?.forEach((t) => p.append("property_type", t));
  state.amenities?.forEach((a) => p.append("amenity", String(a)));
  set("min_bedrooms", state.minBedrooms);
  set("min_beds", state.minBeds);
  set("min_bathrooms", state.minBathrooms);
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

export function toApiParams(s: SearchState): SearchParams {
  const guests = s.adults + s.children;
  return {
    location: s.location || undefined,
    check_in: s.checkIn && s.checkOut ? s.checkIn : undefined,
    check_out: s.checkIn && s.checkOut ? s.checkOut : undefined,
    guests: guests || undefined,
    category: s.category ?? undefined,
    min_price: s.minPrice ?? undefined,
    max_price: s.maxPrice ?? undefined,
    property_type: s.propertyTypes.length ? s.propertyTypes : undefined,
    amenity: s.amenities.length ? s.amenities : undefined,
    min_bedrooms: s.minBedrooms || undefined,
    min_beds: s.minBeds || undefined,
    min_bathrooms: s.minBathrooms || undefined,
  };
}

/** Number of filters active in the Filters modal (shown as a badge on the button). */
export function activeFilterCount(s: SearchState): number {
  return (
    (s.minPrice !== null || s.maxPrice !== null ? 1 : 0) +
    s.propertyTypes.length +
    s.amenities.length +
    (s.minBedrooms ? 1 : 0) +
    (s.minBeds ? 1 : 0) +
    (s.minBathrooms ? 1 : 0)
  );
}

export const POPULAR_DESTINATIONS = [
  { name: "Goa", hint: "For sights like Baga Beach", icon: "Umbrella" },
  { name: "Manali", hint: "For nature lovers", icon: "Mountain" },
  { name: "Jaipur", hint: "For its stunning architecture", icon: "Landmark" },
  { name: "Mumbai", hint: "For sights like Gateway of India", icon: "Building2" },
  { name: "Kerala", hint: "Popular beach destination", icon: "TreePalm" },
  { name: "Udaipur", hint: "Great for a weekend getaway", icon: "Sailboat" },
  { name: "Rishikesh", hint: "For its riverside retreats", icon: "Waves" },
  { name: "Coorg", hint: "For coffee estates and hills", icon: "TreePine" },
];

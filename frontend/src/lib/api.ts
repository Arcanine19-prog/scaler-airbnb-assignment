import type {
  Amenity,
  Booking,
  Category,
  DateRange,
  HostListing,
  ListingCard,
  ListingDetail,
  ListingWrite,
  Page,
  Quote,
  Review,
  ReviewCreate,
  User,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Mocked auth: the id of the account picked in the user menu (see SessionProvider). */
let currentUserId: number | null = null;
export function setApiUser(id: number | null) {
  currentUserId = id;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | (string | number)[] | null | undefined>;

function toQueryString(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { query, headers, ...rest } = init;
  const res = await fetch(`${API_URL}/api${path}${toQueryString(query)}`, {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(currentUserId ? { "X-User-Id": String(currentUserId) } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      // FastAPI returns {detail: string} for HTTPExceptions and {detail: [{msg}]} for validation errors.
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg)
        message = String(body.detail[0].msg).replace(/^Value error, /, "");
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export interface SearchParams {
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  category?: string;
  min_price?: number;
  max_price?: number;
  property_type?: string[];
  amenity?: number[];
  min_bedrooms?: number;
  min_beds?: number;
  min_bathrooms?: number;
  page?: number;
  page_size?: number;
}

export const api = {
  users: () => request<User[]>("/users"),
  categories: () => request<Category[]>("/categories"),
  amenities: () => request<Amenity[]>("/amenities"),

  searchListings: (params: SearchParams) => request<Page<ListingCard>>("/listings", { query: { ...params } }),
  listing: (id: number) => request<ListingDetail>(`/listings/${id}`),
  unavailable: (id: number) => request<DateRange[]>(`/listings/${id}/unavailable`),
  quote: (id: number, checkIn: string, checkOut: string, guests: number) =>
    request<Quote>(`/listings/${id}/quote`, { query: { check_in: checkIn, check_out: checkOut, guests } }),
  reviews: (id: number, page = 1, pageSize = 6) =>
    request<Page<Review>>(`/listings/${id}/reviews`, { query: { page, page_size: pageSize } }),

  createListing: (body: ListingWrite) => request<ListingDetail>("/listings", { method: "POST", body: json(body) }),
  updateListing: (id: number, body: ListingWrite) =>
    request<ListingDetail>(`/listings/${id}`, { method: "PUT", body: json(body) }),
  deleteListing: (id: number) => request<void>(`/listings/${id}`, { method: "DELETE" }),
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("/uploads", { method: "POST", body: form });
  },

  createBooking: (body: { listing_id: number; check_in: string; check_out: string; guests: number }) =>
    request<Booking>("/bookings", { method: "POST", body: json(body) }),
  myTrips: () => request<Booking[]>("/bookings/me"),
  booking: (id: number) => request<Booking>(`/bookings/${id}`),
  cancelBooking: (id: number) => request<Booking>(`/bookings/${id}/cancel`, { method: "POST" }),
  createReview: (body: ReviewCreate) => request<Review>("/reviews", { method: "POST", body: json(body) }),

  hostListings: () => request<HostListing[]>("/host/listings"),
  hostReservations: () => request<Booking[]>("/host/reservations"),

  wishlist: () => request<ListingCard[]>("/wishlist"),
  wishlistIds: () => request<{ listing_ids: number[] }>("/wishlist/ids"),
  addToWishlist: (id: number) => request<void>(`/wishlist/${id}`, { method: "PUT" }),
  removeFromWishlist: (id: number) => request<void>(`/wishlist/${id}`, { method: "DELETE" }),
};

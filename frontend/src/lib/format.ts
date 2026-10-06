import { differenceInCalendarDays, format, isSameMonth, isSameYear, parseISO } from "date-fns";
import { API_URL } from "./api";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatPrice = (amount: number) => inr.format(amount);

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

/** "12–15 Oct", "28 Oct – 2 Nov", "30 Dec 2026 – 2 Jan 2027" — Airbnb's compact range style. */
export function formatRange(checkIn: string | Date, checkOut: string | Date): string {
  const a = typeof checkIn === "string" ? parseISO(checkIn) : checkIn;
  const b = typeof checkOut === "string" ? parseISO(checkOut) : checkOut;
  if (!isSameYear(a, b)) return `${format(a, "d MMM yyyy")} – ${format(b, "d MMM yyyy")}`;
  if (isSameMonth(a, b)) return `${format(a, "d")}–${format(b, "d MMM")}`;
  return `${format(a, "d MMM")} – ${format(b, "d MMM")}`;
}

export const nightsBetween = (checkIn: string, checkOut: string) =>
  differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;

export const formatRating = (rating: number | null) => (rating === null ? "New" : rating.toFixed(2).replace(/0$/, ""));

const PROPERTY_LABELS: Record<string, string> = {
  house: "Home",
  apartment: "Flat",
  villa: "Villa",
  cabin: "Cabin",
  cottage: "Cottage",
  guesthouse: "Room",
};
export const propertyLabel = (type: string) => PROPERTY_LABELS[type] ?? type;

/**
 * Resolve a stored photo URL for display. Uploaded photos are stored as backend-relative
 * paths; Unsplash photos are resized via their URL params so cards don't download 1200px images.
 */
export function photoUrl(url: string, width?: number): string {
  if (url.startsWith("/uploads/")) return `${API_URL}${url}`;
  if (width && url.includes("images.unsplash.com")) {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    return u.toString();
  }
  return url;
}

export const yearsSince = (iso: string) => Math.max(1, new Date().getFullYear() - parseISO(iso).getFullYear());

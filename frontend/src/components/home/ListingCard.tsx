/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HeartButton } from "@/components/common/HeartButton";
import { formatPrice, formatRating, photoUrl, plural, propertyLabel } from "@/lib/format";
import type { ListingCard as Listing } from "@/lib/types";

interface Props {
  listing: Listing;
  /** Query string carried to the detail page (selected dates/guests). */
  linkQuery?: string;
  /** Number of nights when the user searched with dates: show the stay total like Airbnb. */
  nights?: number;
  onHover?: (id: number | null) => void;
}

export function ListingCard({ listing, linkQuery = "", nights, onHover }: Props) {
  const [index, setIndex] = useState(0);
  const photos = listing.photos.length ? listing.photos : [""];
  const step = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + photos.length) % photos.length);
  };

  return (
    <Link
      href={`/rooms/${listing.id}${linkQuery ? `?${linkQuery}` : ""}`}
      className="group block"
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-surface-soft">
        <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {photos.map((src, i) => (
            <img
              key={i}
              src={photoUrl(src, 720)}
              alt={i === 0 ? listing.title : ""}
              loading="lazy"
              className="h-full w-full shrink-0 object-cover"
            />
          ))}
        </div>

        {listing.is_guest_favourite && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-[#222] shadow">Guest favourite</span>
        )}
        <HeartButton listing={listing} className="absolute right-3 top-3" />

        {photos.length > 1 && (
          <>
            {index > 0 && (
              <button type="button" aria-label="Previous photo" onClick={step(-1)} className="absolute left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#222] opacity-0 shadow transition hover:scale-105 hover:bg-white group-hover:opacity-100 md:flex">
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
            {index < photos.length - 1 && (
              <button type="button" aria-label="Next photo" onClick={step(1)} className="absolute right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#222] opacity-0 shadow transition hover:scale-105 hover:bg-white group-hover:opacity-100 md:flex">
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full bg-white transition ${i === index ? "opacity-100" : "opacity-60"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 text-[15px] leading-5">
        <div className="flex justify-between gap-2">
          <h3 className="truncate font-semibold">{propertyLabel(listing.property_type)} in {listing.city}</h3>
          <span className="flex shrink-0 items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            {formatRating(listing.rating)}
            {listing.review_count > 0 && <span className="text-muted">({listing.review_count})</span>}
          </span>
        </div>
        <p className="truncate text-muted">{listing.title}</p>
        <p className="text-muted">
          {plural(listing.beds, "bed")} · {plural(listing.max_guests, "guest")}
        </p>
        <p className="mt-1.5">
          {nights ? (
            <span className="underline">
              <span className="font-semibold">{formatPrice(listing.price_per_night * nights)}</span> for {plural(nights, "night")}
            </span>
          ) : (
            <>
              <span className="font-semibold">{formatPrice(listing.price_per_night)}</span> night
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[20/19] rounded-xl" />
      <div className="skeleton mt-3 h-4 w-3/4 rounded" />
      <div className="skeleton mt-2 h-4 w-1/2 rounded" />
      <div className="skeleton mt-2 h-4 w-1/3 rounded" />
    </div>
  );
}

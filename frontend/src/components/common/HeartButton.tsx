"use client";

import { useWishlist } from "@/components/providers/WishlistProvider";

interface Props {
  listing: { id: number; photos: string[] };
  className?: string;
}

/** The translucent heart on listing photos (filled Rausch when saved). */
export function HeartButton({ listing, className = "" }: Props) {
  const { has, toggle } = useWishlist();
  const saved = has(listing.id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault(); // the heart sits inside a card link
        e.stopPropagation();
        toggle(listing);
      }}
      className={`transition-transform active:scale-90 ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-6 w-6 drop-shadow" aria-hidden>
        <path
          d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z"
          fill={saved ? "#FF385C" : "rgba(0,0,0,0.5)"}
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListingCard, ListingCardSkeleton } from "@/components/home/ListingCard";
import { useSession } from "@/components/providers/SessionProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { api } from "@/lib/api";
import type { ListingCard as Listing } from "@/lib/types";

export default function WishlistsPage() {
  const { user } = useSession();
  const { has } = useWishlist();
  const [listings, setListings] = useState<Listing[] | null>(null);

  useEffect(() => {
    if (user) api.wishlist().then(setListings).catch(() => setListings([]));
  }, [user]);

  // Un-hearting a card here removes it from the page immediately.
  const visible = listings?.filter((l) => has(l.id)) ?? null;

  return (
    <div className="mx-auto max-w-[1760px] px-6 py-10 xl:px-20">
      <h1 className="mb-8 text-[32px] font-semibold">Wishlists</h1>
      {visible === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}</div>
      ) : visible.length === 0 ? (
        <div>
          <h2 className="text-[22px] font-semibold">Create your first wishlist</h2>
          <p className="mb-6 mt-2 max-w-md text-muted">As you search, tap the heart icon to save your favourite places to stay to a wishlist.</p>
          <Link href="/" className="inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-bg">Start exploring</Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-muted">{visible.length} saved {visible.length === 1 ? "stay" : "stays"}</p>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </>
      )}
    </div>
  );
}

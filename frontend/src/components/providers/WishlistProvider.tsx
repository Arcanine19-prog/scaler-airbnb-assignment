"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { photoUrl } from "@/lib/format";
import { useSession } from "./SessionProvider";
import { useToast } from "./ToastProvider";

interface Wishlist {
  has: (listingId: number) => boolean;
  toggle: (listing: { id: number; photos: string[] }) => void;
}

const WishlistContext = createContext<Wishlist>({ has: () => false, toggle: () => {} });

export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const toast = useToast();
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    api
      .wishlistIds()
      .then((r) => setIds(new Set(r.listing_ids)))
      .catch(() => setIds(new Set()));
  }, [user]);

  const has = useCallback((id: number) => ids.has(id), [ids]);

  const toggle = useCallback(
    (listing: { id: number; photos: string[] }) => {
      const saving = !ids.has(listing.id);
      const apply = (add: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (add) next.add(listing.id);
          else next.delete(listing.id);
          return next;
        });

      apply(saving); // optimistic: the heart fills instantly
      (saving ? api.addToWishlist(listing.id) : api.removeFromWishlist(listing.id))
        .then(() =>
          toast(saving ? "Saved to your wishlist" : "Removed from your wishlist", {
            image: listing.photos[0] ? photoUrl(listing.photos[0], 200) : undefined,
          }),
        )
        .catch(() => {
          apply(!saving); // roll back
          toast("Couldn't update your wishlist. Try again.", { kind: "error" });
        });
    },
    [ids, toast],
  );

  return <WishlistContext.Provider value={{ has, toggle }}>{children}</WishlistContext.Provider>;
}

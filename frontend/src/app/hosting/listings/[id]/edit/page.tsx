"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingWizard } from "@/components/hosting/ListingWizard";
import { useSession } from "@/components/providers/SessionProvider";
import { api } from "@/lib/api";
import type { ListingDetail, ListingWrite } from "@/lib/types";

const toWrite = (l: ListingDetail): ListingWrite => ({
  title: l.title,
  description: l.description,
  property_type: l.property_type,
  category_id: l.category?.id ?? null,
  city: l.city,
  state: l.state,
  country: l.country,
  latitude: l.latitude,
  longitude: l.longitude,
  price_per_night: l.price_per_night,
  cleaning_fee: l.cleaning_fee,
  max_guests: l.max_guests,
  bedrooms: l.bedrooms,
  beds: l.beds,
  bathrooms: l.bathrooms,
  amenity_ids: l.amenities.map((a) => a.id),
  photo_urls: l.photos.map((p) => p.url),
});

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listing(Number(id)).then(setListing).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="px-6 py-24 text-center text-muted">{error}</p>;
  if (!listing || !user) return <div className="mx-auto max-w-xl px-6 py-24"><div className="skeleton h-64 rounded-xl" /></div>;
  if (listing.host.id !== user.id) return <p className="px-6 py-24 text-center text-muted">You can only edit your own listings.</p>;
  return <ListingWizard listingId={listing.id} initial={toWrite(listing)} />;
}

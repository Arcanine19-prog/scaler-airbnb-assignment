/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { CancelDialog } from "@/components/trips/CancelDialog";
import { ReviewModal } from "@/components/trips/ReviewModal";
import { api } from "@/lib/api";
import { formatPrice, formatRange, photoUrl, plural, propertyLabel } from "@/lib/format";
import type { Booking } from "@/lib/types";

export default function TripsPage() {
  const { user } = useSession();
  const [trips, setTrips] = useState<Booking[] | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [reviewing, setReviewing] = useState<Booking | null>(null);

  const load = useCallback(() => api.myTrips().then(setTrips).catch(() => setTrips([])), []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const upcoming = (trips ?? []).filter((t) => t.trip_status === "upcoming" || t.trip_status === "current").reverse();
  const past = (trips ?? []).filter((t) => t.trip_status === "completed");
  const cancelled = (trips ?? []).filter((t) => t.trip_status === "cancelled");

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 xl:px-10">
      <h1 className="mb-8 text-[32px] font-semibold">Trips</h1>

      {trips === null ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : (
        <>
          {upcoming.length === 0 ? (
            <section className="mb-12 border-b border-line-soft pb-12">
              <h2 className="text-[22px] font-semibold">No trips booked…yet!</h2>
              <p className="mb-6 mt-2 text-muted">Time to dust off your bags and start planning your next adventure.</p>
              <Link href="/" className="inline-block rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-surface-soft">Start searching</Link>
            </section>
          ) : (
            <section className="mb-12 space-y-6">
              <h2 className="text-[22px] font-semibold">Upcoming reservations</h2>
              {upcoming.map((t) => (
                <div key={t.id} className="grid overflow-hidden rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.15)] ring-1 ring-line-soft md:grid-cols-2">
                  <div className="order-2 flex flex-col p-6 md:order-1">
                    <div className="border-b border-line-soft pb-4">
                      <h3 className="text-[26px] font-semibold">{t.listing.city}</h3>
                      <p className="text-muted">{propertyLabel(t.listing.property_type)} hosted by {t.listing.host_name.split(" ")[0]}</p>
                    </div>
                    <div className="flex flex-1 gap-6 py-4">
                      <div className="border-r border-line-soft pr-6">
                        <div className="font-semibold">{formatRange(t.check_in, t.check_out)}</div>
                        <div className="text-sm text-muted">{plural(t.nights, "night")}</div>
                      </div>
                      <div>
                        <div className="font-semibold">{t.listing.state}</div>
                        <div className="text-sm text-muted">India · {plural(t.guests, "guest")}</div>
                      </div>
                    </div>
                    {t.trip_status === "current" && <p className="mb-3 text-sm font-semibold text-green-700">You&apos;re staying here now</p>}
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/trips/${t.id}`} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg">View reservation</Link>
                      {t.can_cancel && (
                        <button type="button" onClick={() => setCancelling(t)} className="rounded-lg border border-ink px-5 py-2.5 text-sm font-semibold hover:bg-surface-soft">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <Link href={`/rooms/${t.listing.id}`} className="relative order-1 h-56 md:order-2 md:h-auto md:min-h-[260px]">
                    <img src={photoUrl(t.listing.photos[0], 900)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </Link>
                </div>
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-6 text-[22px] font-semibold">Where you&apos;ve been</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((t) => (
                  <div key={t.id} className="flex items-center gap-4">
                    <Link href={`/trips/${t.id}`}>
                      <img src={photoUrl(t.listing.photos[0], 300)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/trips/${t.id}`} className="block truncate font-semibold hover:underline">{t.listing.city}</Link>
                      <div className="truncate text-sm text-muted">Hosted by {t.listing.host_name.split(" ")[0]}</div>
                      <div className="text-sm text-muted">{formatRange(t.check_in, t.check_out)}</div>
                      {t.can_review ? (
                        <button type="button" onClick={() => setReviewing(t)} className="mt-1 text-sm font-semibold underline">Leave a review</button>
                      ) : t.has_review ? (
                        <span className="mt-1 block text-xs text-muted">Reviewed ✓</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {cancelled.length > 0 && (
            <section>
              <h2 className="mb-6 text-[22px] font-semibold">Cancelled</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cancelled.map((t) => (
                  <Link key={t.id} href={`/trips/${t.id}`} className="flex items-center gap-4 opacity-70 hover:opacity-100">
                    <img src={photoUrl(t.listing.photos[0], 300)} alt="" className="h-16 w-16 rounded-lg object-cover grayscale" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{t.listing.city}</div>
                      <div className="text-sm text-muted">{formatRange(t.check_in, t.check_out)} · Refunded {formatPrice(t.total_price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {cancelling && (
        <CancelDialog
          booking={cancelling}
          onClose={() => setCancelling(null)}
          onDone={() => {
            setCancelling(null);
            load();
          }}
        />
      )}
      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

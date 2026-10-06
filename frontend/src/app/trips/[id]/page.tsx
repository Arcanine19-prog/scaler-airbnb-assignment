/* eslint-disable @next/next/no-img-element */
"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import { useSession } from "@/components/providers/SessionProvider";
import { CancelDialog } from "@/components/trips/CancelDialog";
import { ReviewModal } from "@/components/trips/ReviewModal";
import { api } from "@/lib/api";
import { formatPrice, photoUrl, plural, propertyLabel } from "@/lib/format";
import type { Booking } from "@/lib/types";

const STATUS_LABEL: Record<Booking["trip_status"], string> = {
  upcoming: "Upcoming",
  current: "Currently staying",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function TripPage() {
  return (
    <Suspense>
      <TripDetail />
    </Suspense>
  );
}

function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const justBooked = useSearchParams().get("confirmed") === "1";
  const { user } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"cancel" | "review" | null>(null);

  useEffect(() => {
    if (user) api.booking(Number(id)).then(setBooking).catch((e) => setError(e.message));
  }, [id, user]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">{error}</h1>
        <Link href="/trips" className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-bg">Go to Trips</Link>
      </div>
    );
  }
  if (!booking) return <div className="mx-auto max-w-[1120px] px-6 py-10"><div className="skeleton h-96 rounded-xl" /></div>;

  const isGuest = booking.guest.id === user?.id;
  const row = "flex justify-between py-1";

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <Link href={isGuest ? "/trips" : "/hosting"} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
        <ChevronLeft className="h-4 w-4" /> {isGuest ? "All trips" : "Host dashboard"}
      </Link>

      {justBooked && (
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-green-50 p-6 text-green-900 ring-1 ring-green-200 dark:bg-green-950 dark:text-green-100 dark:ring-green-900">
          <CheckCircle2 className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-semibold">Your reservation is confirmed</h1>
            <p>You&apos;re going to {booking.listing.city}! The dates are now blocked for you on the listing.</p>
          </div>
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-[1fr_380px]">
        <div>
          <Link href={`/rooms/${booking.listing.id}`}>
            <img src={photoUrl(booking.listing.photos[0], 1200)} alt="" className="mb-6 h-72 w-full rounded-2xl object-cover" />
          </Link>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.trip_status === "cancelled" ? "bg-surface-soft text-muted" : "bg-ink text-bg"}`}>
              {STATUS_LABEL[booking.trip_status]}
            </span>
            <span className="text-sm text-muted">Confirmation code HM{String(booking.id).padStart(8, "0")}</span>
          </div>
          <h2 className="mt-3 text-[26px] font-semibold">{booking.listing.title}</h2>
          <p className="text-muted">{propertyLabel(booking.listing.property_type)} in {booking.listing.city}, {booking.listing.state} · hosted by {booking.listing.host_name}</p>

          <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-xl border border-line">
            <div className="border-r border-line p-5">
              <div className="text-sm font-semibold">Check-in</div>
              <div className="text-lg">{format(parseISO(booking.check_in), "EEE, d MMM yyyy")}</div>
              <div className="text-sm text-muted">2:00 pm</div>
            </div>
            <div className="p-5">
              <div className="text-sm font-semibold">Checkout</div>
              <div className="text-lg">{format(parseISO(booking.check_out), "EEE, d MMM yyyy")}</div>
              <div className="text-sm text-muted">11:00 am</div>
            </div>
          </div>

          <section className="mt-8 divide-y divide-line-soft">
            <div className="flex items-center gap-4 py-5">
              <Avatar user={booking.guest} size={48} />
              <div>
                <div className="font-semibold">{isGuest ? "Who's coming" : `Guest: ${booking.guest.name}`}</div>
                <div className="text-muted">{plural(booking.guests, "guest")}</div>
              </div>
            </div>
            <div className="py-5 text-sm text-muted">Booked on {format(parseISO(booking.created_at), "d MMM yyyy")}</div>
          </section>

          <div className="mt-4 flex flex-wrap gap-3">
            {isGuest && booking.can_cancel && (
              <button type="button" onClick={() => setDialog("cancel")} className="rounded-lg border border-ink px-5 py-3 font-semibold hover:bg-surface-soft">Cancel reservation</button>
            )}
            {isGuest && booking.can_review && (
              <button type="button" onClick={() => setDialog("review")} className="rounded-lg bg-ink px-5 py-3 font-semibold text-bg">Leave a review</button>
            )}
            <Link href={`/rooms/${booking.listing.id}`} className="rounded-lg px-5 py-3 font-semibold underline hover:bg-surface-soft">View listing</Link>
          </div>
        </div>

        <aside>
          <div className="sticky top-28 rounded-xl border border-line p-6">
            <h3 className="mb-4 text-[22px] font-semibold">{booking.status === "cancelled" ? "Refunded" : "Payment info"}</h3>
            <div className="space-y-1 text-[15px]">
              <div className={row}><span>{formatPrice(booking.nightly_price)} x {plural(booking.nights, "night")}</span><span>{formatPrice(booking.nightly_price * booking.nights)}</span></div>
              {booking.cleaning_fee > 0 && <div className={row}><span>Cleaning fee</span><span>{formatPrice(booking.cleaning_fee)}</span></div>}
              <div className={row}><span>Airbnb service fee</span><span>{formatPrice(booking.service_fee)}</span></div>
              <div className={row}><span>Taxes</span><span>{formatPrice(booking.taxes)}</span></div>
              <div className={`${row} mt-3 border-t border-line-soft pt-4 font-semibold`}><span>Total (INR)</span><span>{formatPrice(booking.total_price)}</span></div>
            </div>
            <p className="mt-4 text-xs text-muted">Payment was simulated (mock checkout) — no real card was charged.</p>
          </div>
        </aside>
      </div>

      {dialog === "cancel" && <CancelDialog booking={booking} onClose={() => setDialog(null)} onDone={(b) => { setBooking(b); setDialog(null); }} />}
      {dialog === "review" && (
        <ReviewModal booking={booking} onClose={() => setDialog(null)} onDone={() => { setDialog(null); api.booking(booking.id).then(setBooking); }} />
      )}
    </div>
  );
}

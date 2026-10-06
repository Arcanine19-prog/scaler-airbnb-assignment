/* eslint-disable @next/next/no-img-element */
"use client";

import { format, parseISO } from "date-fns";
import { ChevronLeft, CreditCard, Lock, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { guestSummary } from "@/components/common/GuestPicker";
import { PriceBreakdown } from "@/components/listing/BookingCard";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import { formatRating, photoUrl, plural, propertyLabel } from "@/lib/format";
import type { ListingDetail, Quote } from "@/lib/types";

export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}

interface Card {
  number: string;
  expiry: string;
  cvv: string;
  postcode: string;
}

/** Client-side checks for the mocked card form. Nothing here is ever sent to the server. */
function validateCard(c: Card): string | null {
  if (c.number.replace(/\s/g, "").length !== 16) return "Enter a 16-digit card number.";
  const m = c.expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return "Enter the expiry date as MM/YY.";
  if (new Date(2000 + Number(m[2]), Number(m[1])) < new Date()) return "This card has expired.";
  if (!/^\d{3,4}$/.test(c.cvv)) return "Enter a valid CVV.";
  if (!/^\d{6}$/.test(c.postcode)) return "Enter a 6-digit PIN code.";
  return null;
}

const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

function Checkout() {
  const { id } = useParams<{ id: string }>();
  const listingId = Number(id);
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useSession();

  const checkIn = params.get("check_in") ?? "";
  const checkOut = params.get("check_out") ?? "";
  const guests = {
    adults: Number(params.get("adults") ?? 1),
    children: Number(params.get("children") ?? 0),
    infants: Number(params.get("infants") ?? 0),
    pets: Number(params.get("pets") ?? 0),
  };
  const guestCount = Math.max(1, guests.adults + guests.children);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<Card>({ number: "", expiry: "", cvv: "", postcode: "" });
  const [cardError, setCardError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listing(listingId).then(setListing).catch((e) => setError(e.message));
    if (checkIn && checkOut)
      api.quote(listingId, checkIn, checkOut, guestCount).then(setQuote).catch((e) => setError(e.message));
  }, [listingId, checkIn, checkOut, guestCount]);

  const backToListing = `/rooms/${listingId}?${params.toString()}`;

  async function confirm() {
    const problem = validateCard(card);
    setCardError(problem);
    if (problem) return;
    setSubmitting(true);
    try {
      const booking = await api.createBooking({ listing_id: listingId, check_in: checkIn, check_out: checkOut, guests: guestCount });
      toast("Your reservation is confirmed!");
      router.push(`/trips/${booking.id}?confirmed=1`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
      toast(message, { kind: "error" });
      setSubmitting(false);
    }
  }

  if (!checkIn || !checkOut) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Pick your dates first</h1>
        <Link href={`/rooms/${listingId}`} className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-bg">Back to listing</Link>
      </div>
    );
  }

  const input = "w-full bg-transparent px-3 pb-2 pt-6 text-[15px] outline-none";
  const field = "relative border-line focus-within:z-10 focus-within:rounded-lg focus-within:ring-2 focus-within:ring-ink";
  const label = "pointer-events-none absolute left-3 top-2 text-xs text-muted";

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8 md:py-16">
      <div className="mb-8 flex items-center gap-4 md:-ml-14">
        <Link href={backToListing} aria-label="Back" className="rounded-full p-3 hover:bg-surface-soft">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[26px] font-semibold md:text-[32px]">Confirm and pay</h1>
      </div>

      <div className="grid gap-16 md:grid-cols-[1fr_420px]">
        <div className="order-2 divide-y divide-line-soft md:order-1">
          <section className="pb-8">
            <h2 className="mb-6 text-[22px] font-semibold">Your trip</h2>
            <div className="mb-6 flex justify-between">
              <div>
                <div className="font-semibold">Dates</div>
                <div>{format(parseISO(checkIn), "d MMM")} – {format(parseISO(checkOut), "d MMM yyyy")}</div>
              </div>
              <Link href={backToListing} className="font-semibold underline">Edit</Link>
            </div>
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">Guests</div>
                <div>{guestSummary(guests) || "1 guest"}</div>
              </div>
              <Link href={backToListing} className="font-semibold underline">Edit</Link>
            </div>
          </section>

          <section className="py-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[22px] font-semibold">Pay with</h2>
              <div className="flex gap-1 text-[10px] font-bold">
                {["VISA", "MC", "RuPay", "UPI"].map((b) => <span key={b} className="rounded border border-line px-1.5 py-0.5">{b}</span>)}
              </div>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-line px-4 py-3">
              <CreditCard className="h-5 w-5" /> <span className="flex-1">Credit or debit card</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-line">
              <label className={`${field} block border-b`}>
                <span className={label}>Card number</span>
                <input inputMode="numeric" autoComplete="off" value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} placeholder="0000 0000 0000 0000" className={input} />
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </label>
              <div className="grid grid-cols-2">
                <label className={`${field} block border-r`}>
                  <span className={label}>Expiration</span>
                  <input inputMode="numeric" autoComplete="off" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} placeholder="MM/YY" className={input} />
                </label>
                <label className={`${field} block`}>
                  <span className={label}>CVV</span>
                  <input inputMode="numeric" autoComplete="off" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="123" className={input} />
                </label>
              </div>
            </div>
            <label className={`${field} mt-4 block rounded-lg border`}>
              <span className={label}>PIN code</span>
              <input inputMode="numeric" autoComplete="off" value={card.postcode} onChange={(e) => setCard({ ...card, postcode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="400001" className={input} />
            </label>
            <div className="mt-4 rounded-lg border border-line px-3 pb-2 pt-2">
              <div className="text-xs text-muted">Country/region</div>
              <div>India</div>
            </div>
            {cardError && <p className="mt-3 text-sm text-brand">{cardError}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface-soft p-4 text-sm">
              <span className="flex-1">Payments are simulated for this demo — no real card is charged and card details never leave your browser.</span>
              <button type="button" onClick={() => setCard({ number: "4242 4242 4242 4242", expiry: "12/30", cvv: "123", postcode: "400001" })} className="rounded-lg border border-ink px-3 py-2 font-semibold hover:bg-surface">
                Use demo card
              </button>
            </div>
          </section>

          <section className="py-8">
            <h2 className="mb-3 text-[22px] font-semibold">Cancellation policy</h2>
            <p className="text-[15px]">
              <span className="font-semibold">Free cancellation before {format(parseISO(checkIn), "d MMM")}.</span> Cancel from your Trips page any time before check-in and you&apos;ll get a full refund.
            </p>
          </section>

          <section className="py-8">
            <h2 className="mb-3 text-[22px] font-semibold">Ground rules</h2>
            <p className="mb-3 text-[15px]">We ask every guest to remember a few simple things about what makes a great guest.</p>
            <ul className="list-disc pl-5 text-[15px]">
              <li>Follow the house rules</li>
              <li>Treat your Host&apos;s home like your own</li>
            </ul>
          </section>

          <section className="pt-8">
            {error && <p className="mb-4 rounded-lg bg-brand/10 p-4 text-sm text-brand">{error} <Link href={backToListing} className="font-semibold underline">Change dates</Link></p>}
            <p className="mb-6 text-xs text-muted">
              By selecting the button below, I agree to the Host&apos;s House Rules, Ground rules for guests and the Rebooking and Refund Policy.
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={submitting || !quote || !quote.available || !user}
              className="btn-brand w-full rounded-lg px-8 py-4 text-base font-semibold disabled:opacity-50 md:w-auto"
            >
              {submitting ? "Confirming…" : quote && !quote.available ? "Dates unavailable" : "Confirm and pay"}
            </button>
          </section>
        </div>

        <aside className="order-1 md:order-2">
          <div className="sticky top-8 rounded-xl border border-line p-6">
            {listing ? (
              <div className="flex gap-4 border-b border-line-soft pb-6">
                <img src={photoUrl(listing.photos[0]?.url ?? "", 300)} alt="" className="h-24 w-28 rounded-lg object-cover" />
                <div className="text-sm">
                  <div className="text-xs text-muted">{propertyLabel(listing.property_type)} in {listing.city}</div>
                  <div className="font-semibold">{listing.title}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-current" /> {formatRating(listing.rating)} ({plural(listing.review_count, "review")})
                    {listing.host.is_superhost && <> · Superhost</>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="skeleton h-24 rounded-lg" />
            )}
            <h2 className="mb-4 mt-6 text-[22px] font-semibold">Price details</h2>
            {quote ? <PriceBreakdown quote={quote} /> : <div className="skeleton h-40 rounded-lg" />}
          </div>
        </aside>
      </div>
    </div>
  );
}

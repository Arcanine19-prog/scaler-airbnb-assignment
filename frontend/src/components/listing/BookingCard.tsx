"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronUp, Flag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DateRangeCalendar, type SelectedRange } from "@/components/common/DateRangeCalendar";
import { GuestPicker, guestSummary, totalGuests, type Guests } from "@/components/common/GuestPicker";
import { formatPrice, plural } from "@/lib/format";
import type { DateRange, ListingDetail, Quote } from "@/lib/types";

interface Props {
  listing: ListingDetail;
  range: SelectedRange;
  onRange: (r: SelectedRange) => void;
  guests: Guests;
  onGuests: (g: Guests) => void;
  blocked: DateRange[];
  quote: Quote | null;
  quoteError: string | null;
  onReserve: () => void;
}

export function PriceBreakdown({ quote }: { quote: Quote }) {
  const row = "flex justify-between";
  return (
    <div className="space-y-3 text-[15px]">
      <div className={row}><span className="underline">{formatPrice(quote.nightly_price)} x {plural(quote.nights, "night")}</span><span>{formatPrice(quote.subtotal)}</span></div>
      {quote.cleaning_fee > 0 && <div className={row}><span className="underline">Cleaning fee</span><span>{formatPrice(quote.cleaning_fee)}</span></div>}
      <div className={row}><span className="underline">Airbnb service fee</span><span>{formatPrice(quote.service_fee)}</span></div>
      <div className={row}><span className="underline">Taxes</span><span>{formatPrice(quote.taxes)}</span></div>
      <div className={`${row} border-t border-line-soft pt-4 font-semibold`}><span>Total</span><span>{formatPrice(quote.total)}</span></div>
    </div>
  );
}

export function BookingCard({ listing, range, onRange, guests, onGuests, blocked, quote, quoteError, onReserve }: Props) {
  const [panel, setPanel] = useState<"dates" | "guests" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setPanel(null);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasDates = range.checkIn && range.checkOut;
  const nights = quote?.nights ?? 0;
  const unavailable = quote && !quote.available;

  return (
    <div ref={ref} className="sticky top-28">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
        <div className="mb-6 text-[22px]">
          {quote && hasDates ? (
            <>
              <span className="font-semibold underline">{formatPrice(quote.subtotal)}</span>
              <span className="text-base"> for {plural(nights, "night")}</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{formatPrice(listing.price_per_night)}</span>
              <span className="text-base"> night</span>
            </>
          )}
        </div>

        <div className="relative rounded-lg border border-line">
          <button type="button" onClick={() => setPanel(panel === "dates" ? null : "dates")} className="grid w-full grid-cols-2 text-left">
            <span className="border-r border-line px-3 py-2.5">
              <span className="block text-[10px] font-bold uppercase">Check-in</span>
              <span className={`text-sm ${range.checkIn ? "" : "text-muted"}`}>{range.checkIn ? format(range.checkIn, "d/M/yyyy") : "Add date"}</span>
            </span>
            <span className="px-3 py-2.5">
              <span className="block text-[10px] font-bold uppercase">Checkout</span>
              <span className={`text-sm ${range.checkOut ? "" : "text-muted"}`}>{range.checkOut ? format(range.checkOut, "d/M/yyyy") : "Add date"}</span>
            </span>
          </button>
          <button type="button" onClick={() => setPanel(panel === "guests" ? null : "guests")} className="flex w-full items-center justify-between border-t border-line px-3 py-2.5 text-left">
            <span>
              <span className="block text-[10px] font-bold uppercase">Guests</span>
              <span className="text-sm">{guestSummary(guests) || "1 guest"}</span>
            </span>
            {panel === "guests" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {panel === "guests" && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg bg-surface px-4 pb-2 shadow-card ring-1 ring-line-soft">
              <GuestPicker value={guests} onChange={onGuests} maxGuests={listing.max_guests} />
              <p className="pb-2 text-xs text-muted">This place has a maximum of {plural(listing.max_guests, "guest")}, not including infants.</p>
              <div className="flex justify-end pb-2">
                <button type="button" onClick={() => setPanel(null)} className="rounded-lg px-3 py-2 font-semibold underline hover:bg-surface-soft">Close</button>
              </div>
            </div>
          )}

          {panel === "dates" && (
            <div className="absolute -right-6 -top-6 z-20 w-[min(680px,calc(100vw-48px))] rounded-2xl bg-surface p-8 shadow-card ring-1 ring-line-soft">
              <div className="mb-6">
                <h3 className="text-[22px] font-semibold">{hasDates ? plural(nights || 0, "night") : "Select dates"}</h3>
                <p className="text-sm text-muted">
                  {hasDates ? `${format(range.checkIn!, "d MMM yyyy")} – ${format(range.checkOut!, "d MMM yyyy")}` : "Add your travel dates for exact pricing"}
                </p>
              </div>
              <DateRangeCalendar
                checkIn={range.checkIn}
                checkOut={range.checkOut}
                blocked={blocked}
                onChange={(r) => {
                  onRange(r);
                  if (r.checkOut) setPanel(null);
                }}
              />
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => onRange({ checkIn: null, checkOut: null })} className="rounded-lg px-3 py-2 text-sm font-semibold underline hover:bg-surface-soft">Clear dates</button>
                <button type="button" onClick={() => setPanel(null)} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-bg">Close</button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={Boolean(hasDates && (unavailable || quoteError))}
          onClick={() => (hasDates ? onReserve() : setPanel("dates"))}
          className="btn-brand mt-4 w-full rounded-lg py-3.5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasDates ? "Reserve" : "Check availability"}
        </button>

        {(quoteError || unavailable) && (
          <p className="mt-3 text-center text-sm text-brand">{quoteError ?? "Those dates are not available. Try different dates."}</p>
        )}
        {totalGuests(guests) > listing.max_guests && <p className="mt-3 text-center text-sm text-brand">Too many guests for this place.</p>}

        {quote && hasDates && !unavailable && !quoteError && (
          <>
            <p className="my-4 text-center text-sm text-muted">You won&apos;t be charged yet</p>
            <PriceBreakdown quote={quote} />
          </>
        )}
      </div>
      <p className="mt-6 flex items-center justify-center gap-3 text-sm text-muted">
        <Flag className="h-4 w-4" /> <span className="underline">Report this listing</span>
      </p>
    </div>
  );
}

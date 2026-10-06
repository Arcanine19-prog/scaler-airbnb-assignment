"use client";

import { format, parseISO } from "date-fns";
import { DoorOpen, KeyRound, MapPin, Medal, Share, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DateRangeCalendar, type SelectedRange } from "@/components/common/DateRangeCalendar";
import { totalGuests, type Guests } from "@/components/common/GuestPicker";
import { HeartButton } from "@/components/common/HeartButton";
import { LocationMap } from "@/components/common/Maps";
import { Modal } from "@/components/common/Modal";
import { Avatar } from "@/components/common/Avatar";
import { Amenities } from "@/components/listing/Amenities";
import { BookingCard } from "@/components/listing/BookingCard";
import { HostSection } from "@/components/listing/HostSection";
import { Laurel } from "@/components/listing/Laurel";
import { PhotoGrid } from "@/components/listing/PhotoGrid";
import { Reviews } from "@/components/listing/Reviews";
import { useToast } from "@/components/providers/ToastProvider";
import { ApiError, api } from "@/lib/api";
import { formatPrice, formatRating, plural, propertyLabel, toISODate, yearsSince } from "@/lib/format";
import type { DateRange, ListingDetail, Quote } from "@/lib/types";

export default function ListingPage() {
  return (
    <Suspense>
      <ListingView />
    </Suspense>
  );
}

function ListingView() {
  const { id } = useParams<{ id: string }>();
  const listingId = Number(id);
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [blocked, setBlocked] = useState<DateRange[]>([]);
  const [range, setRange] = useState<SelectedRange>(() => ({
    checkIn: params.get("check_in") ? parseISO(params.get("check_in")!) : null,
    checkOut: params.get("check_out") ? parseISO(params.get("check_out")!) : null,
  }));
  const [guests, setGuests] = useState<Guests>(() => ({
    adults: Math.max(1, Number(params.get("adults") ?? 1)),
    children: Number(params.get("children") ?? 0),
    infants: Number(params.get("infants") ?? 0),
    pets: Number(params.get("pets") ?? 0),
  }));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [mobileDatesOpen, setMobileDatesOpen] = useState(false);

  useEffect(() => {
    api.listing(listingId).then(setListing).catch((e) => (e instanceof ApiError && e.status === 404 ? setNotFound(true) : toast(e.message, { kind: "error" })));
    api.unavailable(listingId).then(setBlocked).catch(() => {});
  }, [listingId, toast]);

  const checkIn = range.checkIn ? toISODate(range.checkIn) : null;
  const checkOut = range.checkOut ? toISODate(range.checkOut) : null;
  const guestCount = totalGuests(guests);

  // Live price quote + server-side availability check whenever the selection changes.
  useEffect(() => {
    if (!checkIn || !checkOut) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    api
      .quote(listingId, checkIn, checkOut, guestCount)
      .then((q) => !cancelled && (setQuote(q), setQuoteError(null)))
      .catch((e) => !cancelled && (setQuote(null), setQuoteError(e.message)));
    return () => {
      cancelled = true;
    };
  }, [listingId, checkIn, checkOut, guestCount]);

  // Keep the selection in the URL so a refresh or shared link keeps it.
  useEffect(() => {
    const q = new URLSearchParams();
    if (checkIn) q.set("check_in", checkIn);
    if (checkOut) q.set("check_out", checkOut);
    (Object.entries(guests) as [string, number][]).forEach(([k, v]) => v && q.set(k, String(v)));
    router.replace(`/rooms/${listingId}?${q}`, { scroll: false });
  }, [checkIn, checkOut, guests, listingId, router]);

  function reserve() {
    if (!checkIn || !checkOut) return setMobileDatesOpen(true);
    if (guestCount > (listing?.max_guests ?? 0)) return toast(`This place allows up to ${listing?.max_guests} guests`, { kind: "error" });
    const q = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    (Object.entries(guests) as [string, number][]).forEach(([k, v]) => v && q.set(k, String(v)));
    router.push(`/book/${listingId}?${q}`);
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">This listing isn&apos;t available</h1>
        <p className="mt-3 text-muted">It may have been removed by the host.</p>
        <Link href="/" className="mt-8 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-bg">Explore other stays</Link>
      </div>
    );
  }
  if (!listing) return <DetailSkeleton />;

  const firstName = listing.host.name.split(" ")[0];
  const hasAmenity = (name: string) => listing.amenities.some((a) => a.name === name);
  const highlights = [
    listing.host.is_superhost && { icon: Medal, title: `${firstName} is a Superhost`, text: "Superhosts are experienced, highly rated hosts." },
    hasAmenity("Self check-in") && { icon: KeyRound, title: "Self check-in", text: "Check yourself in with the keypad." },
    (listing.rating_breakdown.location ?? 0) >= 4.8 && { icon: MapPin, title: "Great location", text: "Recent guests loved the location." },
    { icon: DoorOpen, title: `${propertyLabel(listing.property_type)} all to yourself`, text: "You'll have the place to yourself." },
  ].filter(Boolean).slice(0, 3) as { icon: typeof Medal; title: string; text: string }[];

  const nights = quote?.nights ?? 0;

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-24 md:pt-6 xl:px-0">
      <div className="hidden items-center justify-between pb-6 md:flex">
        <h1 className="text-[26px] font-semibold">{listing.title}</h1>
        <div className="flex gap-2 text-sm font-semibold">
          <button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast("Link copied"); }} className="flex items-center gap-2 rounded-lg px-3 py-2 underline hover:bg-surface-soft">
            <Share className="h-4 w-4" /> Share
          </button>
          <span className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface-soft">
            <HeartButton listing={{ id: listing.id, photos: listing.photos.map((p) => p.url) }} className="[&_svg]:h-4 [&_svg]:w-4" />
            <span className="underline">Save</span>
          </span>
        </div>
      </div>

      <PhotoGrid photos={listing.photos} title={listing.title} />

      <div className="grid gap-x-24 md:grid-cols-[1fr_330px] lg:grid-cols-[1fr_372px]">
        <div className="divide-y divide-line-soft">
          <section className="pb-8 pt-8">
            <h1 className="mb-4 text-[26px] font-semibold leading-tight md:hidden">{listing.title}</h1>
            <h2 className="text-[22px] font-semibold">
              {propertyLabel(listing.property_type)} in {listing.city}, {listing.country}
            </h2>
            <p className="text-ink">
              {plural(listing.max_guests, "guest")} · {plural(listing.bedrooms, "bedroom")} · {plural(listing.beds, "bed")} · {plural(listing.bathrooms, "bathroom")}
            </p>

            {listing.is_guest_favourite ? (
              <div className="mt-6 flex items-center rounded-xl border border-line px-6 py-4">
                <div className="flex items-center gap-1 text-center text-[17px] font-semibold leading-5">
                  <Laurel side="left" />
                  <span>Guest<br />favourite</span>
                  <Laurel side="right" />
                </div>
                <p className="hidden flex-1 px-6 text-sm font-semibold sm:block">One of the most loved homes on Airbnb, according to guests</p>
                <div className="ml-auto border-l border-line-soft px-6 text-center">
                  <div className="text-[22px] font-semibold leading-6">{formatRating(listing.rating)}</div>
                  <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="h-2.5 w-2.5 fill-current" />)}</div>
                </div>
                <a href="#reviews" className="border-l border-line-soft pl-6 text-center">
                  <div className="text-[22px] font-semibold leading-6">{listing.review_count}</div>
                  <div className="text-xs underline">Reviews</div>
                </a>
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-1 font-semibold">
                <Star className="h-4 w-4 fill-current" /> {formatRating(listing.rating)}
                {listing.review_count > 0 && <>· <a href="#reviews" className="underline">{plural(listing.review_count, "review")}</a></>}
              </p>
            )}
          </section>

          <section className="flex items-center gap-6 py-6">
            <Avatar user={listing.host} size={40} />
            <div>
              <div className="font-semibold">Hosted by {firstName}</div>
              <div className="text-sm text-muted">
                {listing.host.is_superhost && "Superhost · "}
                {plural(yearsSince(listing.host.created_at), "year")} hosting
              </div>
            </div>
          </section>

          <section className="space-y-6 py-8">
            {highlights.map(({ icon: HighlightIcon, title, text }) => (
              <div key={title} className="flex gap-6">
                <HighlightIcon className="h-6 w-6 shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-muted">{text}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="py-8">
            <p className="line-clamp-6 whitespace-pre-line leading-6">{listing.description}</p>
            <button type="button" onClick={() => setDescriptionOpen(true)} className="mt-4 font-semibold underline">Show more</button>
            <Modal open={descriptionOpen} onClose={() => setDescriptionOpen(false)} size="max-w-2xl">
              <div className="px-6 pb-10 md:px-10">
                <h2 className="mb-6 text-[26px] font-semibold">About this space</h2>
                <p className="whitespace-pre-line leading-7">{listing.description}</p>
              </div>
            </Modal>
          </section>

          <Amenities amenities={listing.amenities} />

          <section className="py-12">
            <h2 className="text-[22px] font-semibold">
              {range.checkIn && range.checkOut ? `${plural(nights, "night")} in ${listing.city}` : "Select check-in date"}
            </h2>
            <p className="mb-6 text-sm text-muted">
              {range.checkIn && range.checkOut
                ? `${format(range.checkIn, "d MMM yyyy")} – ${format(range.checkOut, "d MMM yyyy")}`
                : "Add your travel dates for exact pricing"}
            </p>
            <DateRangeCalendar checkIn={range.checkIn} checkOut={range.checkOut} onChange={setRange} blocked={blocked} />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setRange({ checkIn: null, checkOut: null })} className="rounded-lg px-2 py-1 text-sm font-semibold underline hover:bg-surface-soft">Clear dates</button>
            </div>
          </section>
        </div>

        <aside className="hidden pt-8 md:block">
          <BookingCard listing={listing} range={range} onRange={setRange} guests={guests} onGuests={setGuests} blocked={blocked} quote={quote} quoteError={quoteError} onReserve={reserve} />
        </aside>
      </div>

      <div id="reviews" className="scroll-mt-24 border-t border-line-soft">
        <Reviews listing={listing} />
      </div>

      <section className="border-t border-line-soft py-12">
        <h2 className="mb-6 text-[22px] font-semibold">Where you&apos;ll be</h2>
        <p className="mb-6">{listing.city}, {listing.state}, {listing.country}</p>
        <div className="h-[360px] overflow-hidden rounded-xl md:h-[480px]">
          <LocationMap lat={listing.latitude} lng={listing.longitude} />
        </div>
        <p className="mt-4 text-sm text-muted">Exact location is provided after booking.</p>
      </section>

      <div className="border-t border-line-soft">
        <HostSection host={listing.host} />
      </div>

      <section className="border-t border-line-soft py-12">
        <h2 className="mb-6 text-[22px] font-semibold">Things to know</h2>
        <div className="grid gap-8 text-[15px] md:grid-cols-3">
          <div>
            <h3 className="mb-3 font-semibold">House rules</h3>
            <p>Check-in after 2:00 pm</p>
            <p>Checkout before 11:00 am</p>
            <p>{plural(listing.max_guests, "guest")} maximum</p>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Safety & property</h3>
            {["Smoke alarm", "Carbon monoxide alarm", "Fire extinguisher"].map((a) => (
              <p key={a}>{hasAmenity(a) ? a : `${a} not reported`}</p>
            ))}
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Cancellation policy</h3>
            <p>Free cancellation before check-in. Cancel from your Trips page and the dates are released immediately.</p>
          </div>
        </div>
      </section>

      {/* Phones: sticky reserve bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-line-soft bg-bg px-6 py-4 md:hidden">
        <div>
          <div className="font-semibold">
            {quote ? <span className="underline">{formatPrice(quote.subtotal)}</span> : formatPrice(listing.price_per_night)}
            <span className="font-normal"> {quote ? `for ${plural(nights, "night")}` : "night"}</span>
          </div>
          <button type="button" onClick={() => setMobileDatesOpen(true)} className="text-sm font-semibold underline">
            {range.checkIn && range.checkOut ? `${format(range.checkIn, "d MMM")} – ${format(range.checkOut, "d MMM")}` : "Add dates"}
          </button>
        </div>
        <button type="button" onClick={reserve} disabled={Boolean(quote && !quote.available) || Boolean(quoteError)} className="btn-brand rounded-lg px-8 py-3.5 font-semibold disabled:opacity-40">
          {range.checkIn && range.checkOut ? "Reserve" : "Check availability"}
        </button>
      </div>
      <Modal
        open={mobileDatesOpen}
        onClose={() => setMobileDatesOpen(false)}
        title="Select dates"
        footer={
          <div className="flex justify-between">
            <button type="button" onClick={() => setRange({ checkIn: null, checkOut: null })} className="font-semibold underline">Clear dates</button>
            <button type="button" onClick={() => setMobileDatesOpen(false)} className="rounded-lg bg-ink px-6 py-3 font-semibold text-bg">Save</button>
          </div>
        }
      >
        <div className="p-6">
          <DateRangeCalendar months={1} checkIn={range.checkIn} checkOut={range.checkOut} onChange={setRange} blocked={blocked} />
          {(quoteError || (quote && !quote.available)) && <p className="mt-4 text-sm text-brand">{quoteError ?? "Those dates are not available."}</p>}
        </div>
      </Modal>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px] px-6 pt-6 xl:px-0">
      <div className="skeleton mb-6 hidden h-8 w-1/2 rounded md:block" />
      <div className="skeleton h-[300px] rounded-xl md:h-[min(60vh,560px)]" />
      <div className="mt-8 grid gap-24 md:grid-cols-[1fr_372px]">
        <div className="space-y-3">
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
        </div>
        <div className="skeleton hidden h-72 rounded-xl md:block" />
      </div>
    </div>
  );
}

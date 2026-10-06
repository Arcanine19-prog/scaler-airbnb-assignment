"use client";

import { format, parseISO } from "date-fns";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DateRangeCalendar } from "@/components/common/DateRangeCalendar";
import { GuestPicker, guestSummary, type Guests } from "@/components/common/GuestPicker";
import { Icon } from "@/components/common/Icon";
import { toISODate } from "@/lib/format";
import { buildSearchUrl, POPULAR_DESTINATIONS, type SearchState } from "@/lib/search";

type Step = "where" | "when" | "who";

/** Full-screen search sheet used on phones, with Airbnb's stacked Where / When / Who cards. */
export function MobileSearch({ initial, onClose }: { initial: SearchState; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("where");
  const [location, setLocation] = useState(initial.location);
  const [checkIn, setCheckIn] = useState<Date | null>(initial.checkIn ? parseISO(initial.checkIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initial.checkOut ? parseISO(initial.checkOut) : null);
  const [guests, setGuests] = useState<Guests>({ adults: initial.adults, children: initial.children, infants: initial.infants, pets: initial.pets });

  function submit() {
    onClose();
    router.push(
      buildSearchUrl({
        ...initial,
        location,
        checkIn: checkIn && checkOut ? toISODate(checkIn) : null,
        checkOut: checkIn && checkOut ? toISODate(checkOut) : null,
        ...guests,
      }),
    );
  }

  const collapsed = (label: string, value: string, target: Step) => (
    <button type="button" onClick={() => setStep(target)} className="flex w-full items-center justify-between rounded-2xl bg-surface px-5 py-4 text-sm shadow-pill ring-1 ring-line-soft">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-surface-soft md:hidden">
      <div className="flex items-center px-4 pt-4">
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-full border border-line bg-surface p-2">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {step === "where" ? (
          <div className="rounded-3xl bg-surface p-6 shadow-card">
            <h2 className="mb-4 text-2xl font-bold">Where?</h2>
            <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3.5">
              <Search className="h-4 w-4" strokeWidth={2.5} />
              <input autoFocus value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Search destinations" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="mt-4 space-y-1">
              {POPULAR_DESTINATIONS.filter((d) => !location || d.name.toLowerCase().includes(location.toLowerCase())).slice(0, 5).map((d) => (
                <button key={d.name} type="button" onClick={() => { setLocation(d.name); setStep("when"); }} className="flex w-full items-center gap-4 rounded-xl p-2 text-left">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-soft"><Icon name={d.icon} className="h-5 w-5" /></span>
                  <span className="text-sm">{d.name}, India</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          collapsed("Where", location || "I'm flexible", "where")
        )}

        {step === "when" ? (
          <div className="rounded-3xl bg-surface p-6 shadow-card">
            <h2 className="mb-4 text-2xl font-bold">When&apos;s your trip?</h2>
            <DateRangeCalendar months={1} checkIn={checkIn} checkOut={checkOut} onChange={(r) => { setCheckIn(r.checkIn); setCheckOut(r.checkOut); if (r.checkOut) setStep("who"); }} />
          </div>
        ) : (
          collapsed("When", checkIn && checkOut ? `${format(checkIn, "d MMM")} – ${format(checkOut, "d MMM")}` : "Add dates", "when")
        )}

        {step === "who" ? (
          <div className="rounded-3xl bg-surface p-6 shadow-card">
            <h2 className="mb-2 text-2xl font-bold">Who&apos;s coming?</h2>
            <GuestPicker value={guests} onChange={setGuests} />
          </div>
        ) : (
          collapsed("Who", guestSummary(guests) || "Add guests", "who")
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line-soft bg-surface px-6 py-4">
        <button type="button" className="font-semibold underline" onClick={() => { setLocation(""); setCheckIn(null); setCheckOut(null); setGuests({ adults: 0, children: 0, infants: 0, pets: 0 }); }}>
          Clear all
        </button>
        <button type="button" onClick={submit} className="btn-brand flex items-center gap-2 rounded-lg px-6 py-3 font-semibold">
          <Search className="h-4 w-4" strokeWidth={3} /> Search
        </button>
      </div>
    </div>,
    document.body,
  );
}

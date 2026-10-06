"use client";

import { format, parseISO } from "date-fns";
import { MapPin, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DateRangeCalendar } from "@/components/common/DateRangeCalendar";
import { GuestPicker, guestSummary, type Guests } from "@/components/common/GuestPicker";
import { Icon } from "@/components/common/Icon";
import { toISODate } from "@/lib/format";
import { buildSearchUrl, POPULAR_DESTINATIONS, type SearchState } from "@/lib/search";

type Section = "where" | "checkIn" | "checkOut" | "who";

interface Props {
  initial: SearchState;
  /** Section to open immediately (when expanding from the compact pill). */
  autoFocus?: Section | null;
  onDone?: () => void;
}

/** The big pill search bar: Where | Check in | Check out | Who | (search). */
export function SearchBar({ initial, autoFocus = null, onDone }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Section | null>(autoFocus);
  const [location, setLocation] = useState(initial.location);
  const [checkIn, setCheckIn] = useState<Date | null>(initial.checkIn ? parseISO(initial.checkIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initial.checkOut ? parseISO(initial.checkOut) : null);
  const [guests, setGuests] = useState<Guests>({
    adults: initial.adults,
    children: initial.children,
    infants: initial.infants,
    pets: initial.pets,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit() {
    setActive(null);
    onDone?.();
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

  const segment = (section: Section) =>
    `relative flex h-full flex-col justify-center rounded-full px-6 text-left transition ${
      active === section ? "bg-surface shadow-card" : active ? "hover:bg-line/60" : "hover:bg-surface-soft"
    }`;
  const divider = (a: Section, b: Section) => (
    <div className={`h-8 w-px bg-line ${active === a || active === b ? "opacity-0" : ""}`} />
  );
  const clear = (onClear: () => void, show: boolean) =>
    show && (
      <span
        role="button"
        aria-label="Clear"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface-soft p-1 hover:bg-line"
      >
        <X className="h-3 w-3" strokeWidth={3} />
      </span>
    );

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[850px]">
      <div
        className={`flex h-16 items-center rounded-full border border-line shadow-pill transition ${
          active ? "bg-surface-soft" : "bg-surface"
        }`}
      >
        <div className={`${segment("where")} flex-[1.4] cursor-text`} onClick={() => setActive("where")}>
          <label htmlFor="search-where" className="text-xs font-semibold">Where</label>
          <input
            id="search-where"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onFocus={() => setActive("where")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search destinations"
            autoComplete="off"
            className="w-full truncate bg-transparent pr-4 text-sm text-ink outline-none placeholder:text-muted"
          />
          {clear(() => setLocation(""), active === "where" && location !== "")}
        </div>
        {divider("where", "checkIn")}
        <button type="button" className={`${segment("checkIn")} flex-1`} onClick={() => setActive("checkIn")}>
          <span className="text-xs font-semibold">Check in</span>
          <span className={`text-sm ${checkIn ? "text-ink" : "text-muted"}`}>{checkIn ? format(checkIn, "d MMM") : "Add dates"}</span>
          {clear(() => { setCheckIn(null); setCheckOut(null); }, active === "checkIn" && checkIn !== null)}
        </button>
        {divider("checkIn", "checkOut")}
        <button type="button" className={`${segment("checkOut")} flex-1`} onClick={() => setActive(checkIn ? "checkOut" : "checkIn")}>
          <span className="text-xs font-semibold">Check out</span>
          <span className={`text-sm ${checkOut ? "text-ink" : "text-muted"}`}>{checkOut ? format(checkOut, "d MMM") : "Add dates"}</span>
          {clear(() => setCheckOut(null), active === "checkOut" && checkOut !== null)}
        </button>
        {divider("checkOut", "who")}
        <div className={`${segment("who")} flex-[1.3] flex-row items-center justify-between pr-2`} onClick={() => setActive("who")}>
          <div className="min-w-0">
            <div className="text-xs font-semibold">Who</div>
            <div className={`truncate text-sm ${guestSummary(guests) ? "text-ink" : "text-muted"}`}>{guestSummary(guests) || "Add guests"}</div>
          </div>
          <button
            type="button"
            aria-label="Search"
            onClick={(e) => {
              e.stopPropagation();
              submit();
            }}
            className="btn-brand flex h-12 shrink-0 items-center gap-2 rounded-full px-4 font-semibold"
          >
            <Search className="h-4 w-4" strokeWidth={3} />
            {active && <span>Search</span>}
          </button>
        </div>
      </div>

      {active === "where" && (
        <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[425px] rounded-[32px] bg-surface py-6 shadow-card ring-1 ring-line-soft">
          <p className="px-8 pb-2 text-xs font-semibold">Suggested destinations</p>
          {POPULAR_DESTINATIONS.filter((d) => !location || d.name.toLowerCase().includes(location.toLowerCase())).map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => {
                setLocation(d.name);
                setActive("checkIn");
              }}
              className="flex w-full items-center gap-4 px-8 py-2.5 text-left hover:bg-surface-soft"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-soft">
                <Icon name={d.icon} className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-[15px] text-ink">{d.name}, India</span>
                <span className="block text-sm text-muted">{d.hint}</span>
              </span>
            </button>
          ))}
          {location && !POPULAR_DESTINATIONS.some((d) => d.name.toLowerCase().includes(location.toLowerCase())) && (
            <button type="button" onClick={submit} className="flex w-full items-center gap-4 px-8 py-2.5 text-left hover:bg-surface-soft">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-soft"><MapPin className="h-6 w-6" strokeWidth={1.5} /></span>
              <span className="text-[15px]">Search &ldquo;{location}&rdquo;</span>
            </button>
          )}
        </div>
      )}

      {(active === "checkIn" || active === "checkOut") && (
        <div className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-[850px] -translate-x-1/2 rounded-[32px] bg-surface px-8 py-8 shadow-card ring-1 ring-line-soft">
          <DateRangeCalendar
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={({ checkIn: a, checkOut: b }) => {
              setCheckIn(a);
              setCheckOut(b);
              setActive(b ? "who" : "checkOut");
            }}
          />
        </div>
      )}

      {active === "who" && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[400px] rounded-[32px] bg-surface px-8 py-4 shadow-card ring-1 ring-line-soft">
          <GuestPicker value={guests} onChange={setGuests} />
        </div>
      )}
    </div>
  );
}

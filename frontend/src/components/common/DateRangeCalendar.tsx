"use client";

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "@/lib/types";

export interface SelectedRange {
  checkIn: Date | null;
  checkOut: Date | null;
}

interface Props extends SelectedRange {
  onChange: (range: SelectedRange) => void;
  /** Confirmed bookings as [check_in, check_out) ranges — those nights can't be booked. */
  blocked?: DateRange[];
  /** Number of months shown side by side on desktop. */
  months?: 1 | 2;
}

const key = (d: Date) => format(d, "yyyy-MM-dd");
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Airbnb-style two-month range picker.
 *
 * Rules: a date can be a check-in if that night is free. Once a check-in is chosen, the
 * check-out can be any later date up to (and including) the first booked night after it,
 * so a stay can never span someone else's booking but back-to-back stays are allowed.
 */
export function DateRangeCalendar({ checkIn, checkOut, onChange, blocked = [], months = 2 }: Props) {
  const today = startOfDay(new Date());
  const [firstMonth, setFirstMonth] = useState(() => startOfMonth(checkIn ?? today));
  const [hovered, setHovered] = useState<Date | null>(null);

  const blockedNights = useMemo(() => {
    const nights = new Set<string>();
    for (const r of blocked) {
      const last = addDays(parseISO(r.check_out), -1);
      for (const d of eachDayOfInterval({ start: parseISO(r.check_in), end: last })) nights.add(key(d));
    }
    return nights;
  }, [blocked]);

  const choosingCheckOut = checkIn !== null && checkOut === null;

  // Latest allowed check-out for the current check-in: the first booked night after it.
  const maxCheckOut = useMemo(() => {
    if (!checkIn) return null;
    const sorted = [...blockedNights].sort();
    const next = sorted.find((n) => n > key(checkIn));
    return next ? parseISO(next) : null;
  }, [checkIn, blockedNights]);

  const canCheckIn = (d: Date) => !isBefore(d, today) && !blockedNights.has(key(d));
  const canCheckOut = (d: Date) =>
    checkIn !== null && isAfter(d, checkIn) && (maxCheckOut === null || !isAfter(d, maxCheckOut));

  function isSelectable(d: Date) {
    // While picking a check-out, only valid check-outs are enabled (plus earlier dates to restart).
    if (choosingCheckOut) return canCheckOut(d) || (isBefore(d, checkIn) && canCheckIn(d));
    return canCheckIn(d);
  }

  function select(d: Date) {
    if (choosingCheckOut && canCheckOut(d)) onChange({ checkIn, checkOut: d });
    else if (canCheckIn(d)) onChange({ checkIn: d, checkOut: null });
  }

  const rangeEnd = checkOut ?? (choosingCheckOut && hovered && canCheckOut(hovered) ? hovered : null);
  const inRange = (d: Date) => checkIn && rangeEnd && isAfter(d, checkIn) && isBefore(d, rangeEnd);

  const canGoBack = isAfter(firstMonth, startOfMonth(today));

  return (
    <div className="select-none">
      <div className={`grid gap-x-10 gap-y-6 ${months === 2 ? "md:grid-cols-2" : ""}`}>
        {Array.from({ length: months }, (_, i) => addMonths(firstMonth, i)).map((month, i) => (
          <div key={month.toISOString()} className={i > 0 ? "hidden md:block" : ""}>
            <div className="relative mb-4 flex h-8 items-center justify-center">
              {i === 0 && (
                <button
                  type="button"
                  aria-label="Previous month"
                  disabled={!canGoBack}
                  onClick={() => setFirstMonth(addMonths(firstMonth, -1))}
                  className="absolute left-0 rounded-full p-1.5 hover:bg-surface-soft disabled:opacity-20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <h3 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h3>
              {(i === months - 1 || months === 2) && (
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setFirstMonth(addMonths(firstMonth, 1))}
                  className={`absolute right-0 rounded-full p-1.5 hover:bg-surface-soft ${
                    months === 2 && i === 0 ? "md:hidden" : ""
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <MonthGrid
              month={month}
              renderDay={(d) => {
                const isStart = checkIn && isSameDay(d, checkIn);
                const isEnd = rangeEnd && isSameDay(d, rangeEnd);
                const selectable = isSelectable(d);
                const strike = !selectable && !isStart && !isBefore(d, today);
                return (
                  <div
                    className={`relative flex h-11 items-center justify-center ${
                      inRange(d) ? "bg-surface-soft" : ""
                    } ${isStart && rangeEnd ? "rounded-l-full bg-surface-soft" : ""} ${
                      isEnd && checkIn ? "rounded-r-full bg-surface-soft" : ""
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!selectable}
                      onClick={() => select(d)}
                      onMouseEnter={() => setHovered(d)}
                      onMouseLeave={() => setHovered(null)}
                      aria-label={format(d, "EEEE, d MMMM yyyy")}
                      aria-pressed={Boolean(isStart || isEnd)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${
                        isStart || isEnd
                          ? "bg-ink text-bg"
                          : selectable
                            ? "hover:ring-1 hover:ring-ink"
                            : "cursor-default text-muted/40"
                      } ${strike ? "line-through" : ""}`}
                    >
                      {format(d, "d")}
                    </button>
                  </div>
                );
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({ month, renderDay }: { month: Date; renderDay: (d: Date) => React.ReactNode }) {
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfMonth(month) });
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-muted">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) =>
          d.getMonth() === month.getMonth() ? <div key={d.toISOString()}>{renderDay(d)}</div> : <div key={d.toISOString()} />,
        )}
      </div>
    </div>
  );
}

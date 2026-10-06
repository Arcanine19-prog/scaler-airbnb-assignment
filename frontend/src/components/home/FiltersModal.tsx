"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { Modal } from "@/components/common/Modal";
import { api } from "@/lib/api";
import { formatPrice, propertyLabel } from "@/lib/format";
import { buildSearchUrl, toApiParams, type SearchState } from "@/lib/search";
import type { Amenity } from "@/lib/types";

const PROPERTY_TYPES = ["house", "apartment", "villa", "cabin", "cottage", "guesthouse"];
const PRICE_CEILING = 25000;
const BUCKETS = 30;

interface Props {
  open: boolean;
  onClose: () => void;
  search: SearchState;
}

export function FiltersModal({ open, onClose, search }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(search);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [prices, setPrices] = useState<number[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Reset the draft to the applied filters each time the modal opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(search);
  }, [open, search]);

  useEffect(() => {
    if (!open || amenities.length) return;
    api.amenities().then(setAmenities).catch(() => {});
    api.searchListings({ page_size: 50 }).then((p) => setPrices(p.items.map((l) => l.price_per_night))).catch(() => {});
  }, [open, amenities.length]);

  // Live "Show N places" count, debounced while dragging sliders.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api.searchListings({ ...toApiParams(draft), page_size: 1 }).then((p) => setCount(p.total)).catch(() => setCount(null));
    }, 250);
    return () => clearTimeout(t);
  }, [open, draft]);

  const minPrice = draft.minPrice ?? 0;
  const maxPrice = draft.maxPrice ?? PRICE_CEILING;
  const histogram = useMemo(() => {
    const buckets = new Array(BUCKETS).fill(0);
    prices.forEach((p) => buckets[Math.min(BUCKETS - 1, Math.floor((p / PRICE_CEILING) * BUCKETS))]++);
    const peak = Math.max(1, ...buckets);
    return buckets.map((b) => b / peak);
  }, [prices]);

  const update = (patch: Partial<SearchState>) => setDraft((d) => ({ ...d, ...patch }));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const setPrice = (lo: number, hi: number) =>
    update({ minPrice: lo > 0 ? lo : null, maxPrice: hi < PRICE_CEILING ? hi : null });

  function apply() {
    router.push(buildSearchUrl(draft));
    onClose();
  }
  const clearAll = () =>
    update({ minPrice: null, maxPrice: null, propertyTypes: [], amenities: [], minBedrooms: 0, minBeds: 0, minBathrooms: 0 });

  const groups = ["Essentials", "Features", "Location", "Safety"];
  const visibleGroups = showAllAmenities ? groups : groups.slice(0, 2);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      size="max-w-[780px]"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={clearAll} className="rounded-lg px-2 py-2 font-semibold underline hover:bg-surface-soft">Clear all</button>
          <button type="button" onClick={apply} className="rounded-lg bg-ink px-6 py-3.5 font-semibold text-bg hover:opacity-90">
            {count === null ? "Show places" : count === 0 ? "No exact matches" : `Show ${count} place${count === 1 ? "" : "s"}`}
          </button>
        </div>
      }
    >
      <div className="divide-y divide-line-soft px-6">
        <section className="py-8">
          <h3 className="text-[22px] font-semibold">Price range</h3>
          <p className="mb-6 text-sm text-muted">Nightly prices before fees and taxes</p>
          <div className="mx-auto max-w-[620px]">
            <div className="flex h-20 items-end gap-[2px] px-3">
              {histogram.map((h, i) => {
                const bucketPrice = (i / BUCKETS) * PRICE_CEILING;
                const inside = bucketPrice >= minPrice && bucketPrice <= maxPrice;
                return <div key={i} className={`flex-1 rounded-t-sm ${inside ? "bg-brand" : "bg-line"}`} style={{ height: `${Math.max(4, h * 100)}%` }} />;
              })}
            </div>
            <div className="relative h-6">
              <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-line" />
              {(["min", "max"] as const).map((which) => (
                <input
                  key={which}
                  type="range"
                  aria-label={which === "min" ? "Minimum price" : "Maximum price"}
                  min={0}
                  max={PRICE_CEILING}
                  step={500}
                  value={which === "min" ? minPrice : maxPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (which === "min") setPrice(Math.min(v, maxPrice - 500), maxPrice);
                    else setPrice(minPrice, Math.max(v, minPrice + 500));
                  }}
                  className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-line [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-line [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              {[
                { label: "Minimum", value: minPrice },
                { label: "Maximum", value: maxPrice },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="rounded-full border border-line px-6 py-3 font-semibold">
                    {formatPrice(value)}
                    {label === "Maximum" && value === PRICE_CEILING ? "+" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8">
          <h3 className="mb-6 text-[22px] font-semibold">Property type</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PROPERTY_TYPES.map((t) => {
              const on = draft.propertyTypes.includes(t);
              return (
                <button key={t} type="button" onClick={() => update({ propertyTypes: toggle(draft.propertyTypes, t) })}
                  className={`rounded-xl border p-4 text-left font-semibold transition ${on ? "border-ink bg-surface-soft ring-1 ring-ink" : "border-line hover:border-ink"}`}>
                  {propertyLabel(t)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="py-8">
          <h3 className="mb-2 text-[22px] font-semibold">Rooms and beds</h3>
          {([
            ["Bedrooms", "minBedrooms"],
            ["Beds", "minBeds"],
            ["Bathrooms", "minBathrooms"],
          ] as const).map(([label, field]) => (
            <AnyCounter key={field} label={label} value={draft[field]} onChange={(v) => update({ [field]: v })} />
          ))}
        </section>

        <section className="py-8">
          <h3 className="mb-6 text-[22px] font-semibold">Amenities</h3>
          {visibleGroups.map((group) => (
            <div key={group} className="mb-6">
              <h4 className="mb-3 font-semibold">{group}</h4>
              <div className="flex flex-wrap gap-3">
                {amenities.filter((a) => a.group === group).map((a) => {
                  const on = draft.amenities.includes(a.id);
                  return (
                    <button key={a.id} type="button" onClick={() => update({ amenities: toggle(draft.amenities, a.id) })}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${on ? "border-ink bg-surface-soft ring-1 ring-ink" : "border-line hover:border-ink"}`}>
                      <Icon name={a.icon} className="h-5 w-5" />
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setShowAllAmenities((s) => !s)} className="font-semibold underline">
            {showAllAmenities ? "Show less" : "Show more"}
          </button>
        </section>
      </div>
    </Modal>
  );
}

function AnyCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:border-ink hover:text-ink disabled:opacity-30 disabled:hover:border-line";
  return (
    <div className="flex items-center justify-between py-3">
      <span>{label}</span>
      <div className="flex items-center gap-4">
        <button type="button" aria-label={`Decrease ${label}`} className={btn} disabled={value === 0} onClick={() => onChange(value - 1)}><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-10 text-center">{value === 0 ? "Any" : `${value}+`}</span>
        <button type="button" aria-label={`Increase ${label}`} className={btn} disabled={value >= 8} onClick={() => onChange(value + 1)}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

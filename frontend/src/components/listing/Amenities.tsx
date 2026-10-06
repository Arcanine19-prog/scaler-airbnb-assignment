"use client";

import { useState } from "react";
import { Icon } from "@/components/common/Icon";
import { Modal } from "@/components/common/Modal";
import type { Amenity } from "@/lib/types";

const PREVIEW = 10;
const GROUP_ORDER = ["Location", "Features", "Essentials", "Safety"];

export function Amenities({ amenities }: { amenities: Amenity[] }) {
  const [open, setOpen] = useState(false);
  // Highlight the distinctive amenities (pool, beachfront, ...) before essentials like wifi.
  const sorted = [...amenities].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  return (
    <section className="py-12">
      <h2 className="mb-6 text-[22px] font-semibold">What this place offers</h2>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        {sorted.slice(0, PREVIEW).map((a) => (
          <div key={a.id} className="flex items-center gap-4">
            <Icon name={a.icon} className="h-6 w-6" />
            <span>{a.name}</span>
          </div>
        ))}
      </div>
      {amenities.length > PREVIEW && (
        <button type="button" onClick={() => setOpen(true)} className="mt-8 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-surface-soft">
          Show all {amenities.length} amenities
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} size="max-w-2xl">
        <div className="px-6 pb-8">
          <h2 className="mb-6 text-[26px] font-semibold">What this place offers</h2>
          {GROUP_ORDER.map((group) => {
            const items = amenities.filter((a) => a.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mb-8">
                <h3 className="mb-2 text-lg font-semibold">{group}</h3>
                {items.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 border-b border-line-soft py-6">
                    <Icon name={a.icon} className="h-6 w-6" />
                    {a.name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Modal>
    </section>
  );
}

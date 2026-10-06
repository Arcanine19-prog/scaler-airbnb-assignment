import { Counter } from "./Counter";

export interface Guests {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export const EMPTY_GUESTS: Guests = { adults: 0, children: 0, infants: 0, pets: 0 };

/** Infants and pets don't count towards a listing's guest limit (Airbnb's rule). */
export const totalGuests = (g: Guests) => g.adults + g.children;

export function guestSummary(g: Guests): string {
  const total = totalGuests(g);
  if (total === 0) return "";
  const parts = [`${total} guest${total > 1 ? "s" : ""}`];
  if (g.infants) parts.push(`${g.infants} infant${g.infants > 1 ? "s" : ""}`);
  if (g.pets) parts.push(`${g.pets} pet${g.pets > 1 ? "s" : ""}`);
  return parts.join(", ");
}

export function GuestPicker({ value, onChange, maxGuests = 16 }: { value: Guests; onChange: (g: Guests) => void; maxGuests?: number }) {
  const set = (key: keyof Guests) => (n: number) => {
    const next = { ...value, [key]: n };
    // Children/infants/pets need at least one adult, like on Airbnb.
    if (key !== "adults" && n > 0 && next.adults === 0) next.adults = 1;
    onChange(next);
  };
  const atLimit = totalGuests(value) >= maxGuests;
  return (
    <div className="divide-y divide-line-soft">
      <Counter label="Adults" description="Ages 13 or above" value={value.adults} max={atLimit ? value.adults : 16}
        min={value.children + value.infants + value.pets > 0 ? 1 : 0} onChange={set("adults")} />
      <Counter label="Children" description="Ages 2–12" value={value.children} max={atLimit ? value.children : 16} onChange={set("children")} />
      <Counter label="Infants" description="Under 2" value={value.infants} max={5} onChange={set("infants")} />
      <Counter label="Pets" description="Bringing a service animal?" value={value.pets} max={5} onChange={set("pets")} />
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import { useSession } from "@/components/providers/SessionProvider";
import { api } from "@/lib/api";
import { formatPrice, formatRange, photoUrl, plural } from "@/lib/format";
import type { Booking, HostListing } from "@/lib/types";

const TABS = [
  { key: "upcoming", label: "Upcoming", match: (b: Booking) => b.trip_status === "upcoming" },
  { key: "current", label: "Currently hosting", match: (b: Booking) => b.trip_status === "current" },
  { key: "completed", label: "Completed", match: (b: Booking) => b.trip_status === "completed" },
  { key: "cancelled", label: "Cancelled", match: (b: Booking) => b.trip_status === "cancelled" },
  { key: "all", label: "All", match: () => true },
] as const;

/** Host dashboard ("Today"): stats + reservations across all of the host's listings. */
export default function HostingTodayPage() {
  const { user } = useSession();
  const [reservations, setReservations] = useState<Booking[] | null>(null);
  const [listings, setListings] = useState<HostListing[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("upcoming");

  useEffect(() => {
    if (!user) return;
    api.hostReservations().then(setReservations).catch(() => setReservations([]));
    api.hostListings().then(setListings).catch(() => setListings([]));
  }, [user]);

  if (user && !user.is_host) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-[32px] font-semibold">Airbnb it.</h1>
        <p className="mt-3 text-muted">You don&apos;t have any listings yet. Create one to start hosting — or switch to a host account from the menu.</p>
        <Link href="/hosting/listings/new" className="btn-brand mt-8 inline-block rounded-lg px-6 py-3 font-semibold">Get started</Link>
      </div>
    );
  }

  const current = TABS.find((t) => t.key === tab)!;
  const visible = (reservations ?? []).filter(current.match).sort((a, b) => (tab === "upcoming" ? a.check_in.localeCompare(b.check_in) : b.check_in.localeCompare(a.check_in)));
  const earnings = listings.reduce((sum, l) => sum + l.earnings, 0);
  const upcomingCount = (reservations ?? []).filter((b) => b.trip_status === "upcoming" || b.trip_status === "current").length;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 xl:px-10">
      <h1 className="text-[32px] font-semibold">Welcome back, {user?.name.split(" ")[0]}</h1>

      <div className="my-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total earnings", value: formatPrice(earnings) },
          { label: "Upcoming stays", value: String(upcomingCount) },
          { label: "Active listings", value: String(listings.length) },
          { label: "Total bookings", value: String(listings.reduce((s, l) => s + l.total_bookings, 0)) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line p-5">
            <div className="text-sm text-muted">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[22px] font-semibold">Your reservations</h2>
        <Link href="/hosting/listings" className="font-semibold underline">Manage listings</Link>
      </div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${tab === t.key ? "border-ink ring-1 ring-ink font-semibold" : "border-line hover:border-ink"}`}>
            {t.label} ({(reservations ?? []).filter(t.match).length})
          </button>
        ))}
      </div>

      {reservations === null ? (
        <div className="skeleton h-48 rounded-xl" />
      ) : visible.length === 0 ? (
        <div className="rounded-xl bg-surface-soft p-10 text-center text-muted">You don&apos;t have any {current.label.toLowerCase()} reservations.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((b) => (
            <Link key={b.id} href={`/trips/${b.id}`} className="rounded-xl border border-line p-5 transition hover:shadow-card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted">{b.trip_status === "cancelled" ? "Cancelled" : formatRange(b.check_in, b.check_out)}</div>
                  <div className="text-lg font-semibold">{b.guest.name}</div>
                  <div className="text-sm text-muted">{plural(b.guests, "guest")} · {plural(b.nights, "night")} · {formatPrice(b.total_price)}</div>
                </div>
                <Avatar user={b.guest} size={44} />
              </div>
              <div className="flex items-center gap-3 border-t border-line-soft pt-4">
                <img src={photoUrl(b.listing.photos[0], 200)} alt="" className="h-10 w-10 rounded-md object-cover" />
                <span className="truncate text-sm">{b.listing.title}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

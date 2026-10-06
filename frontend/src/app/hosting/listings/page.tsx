/* eslint-disable @next/next/no-img-element */
"use client";

import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import { formatPrice, formatRating, photoUrl, propertyLabel } from "@/lib/format";
import type { HostListing } from "@/lib/types";

export default function HostListingsPage() {
  const { user } = useSession();
  const toast = useToast();
  const [rows, setRows] = useState<HostListing[] | null>(null);
  const [deleting, setDeleting] = useState<HostListing | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) api.hostListings().then(setRows).catch(() => setRows([]));
  }, [user]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteListing(deleting.listing.id);
      setRows((r) => r?.filter((x) => x.listing.id !== deleting.listing.id) ?? null);
      toast("Listing deleted");
      setDeleting(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete listing", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 xl:px-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-[32px] font-semibold">Your listings</h1>
        <Link href="/hosting/listings/new" aria-label="Create listing" className="flex items-center gap-2 rounded-full bg-surface-soft px-4 py-3 font-semibold hover:bg-line-soft">
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Create listing</span>
        </Link>
      </div>

      {rows === null ? (
        <div className="skeleton h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-surface-soft p-12 text-center">
          <p className="mb-6 text-muted">You don&apos;t have any listings yet.</p>
          <Link href="/hosting/listings/new" className="btn-brand rounded-lg px-6 py-3 font-semibold">Create your first listing</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="py-3 font-semibold">Listing</th>
                <th className="py-3 font-semibold">Location</th>
                <th className="py-3 font-semibold">Price</th>
                <th className="py-3 font-semibold">Rating</th>
                <th className="py-3 font-semibold">Upcoming</th>
                <th className="py-3 font-semibold">Earnings</th>
                <th className="py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map(({ listing: l, upcoming_bookings, earnings }) => (
                <tr key={l.id} className="hover:bg-surface-soft">
                  <td className="py-3 pr-4">
                    <Link href={`/rooms/${l.id}`} className="flex items-center gap-4">
                      <img src={photoUrl(l.photos[0], 200)} alt="" className="h-14 w-20 rounded-lg object-cover" />
                      <span>
                        <span className="block max-w-[260px] truncate font-semibold">{l.title}</span>
                        <span className="text-muted">{propertyLabel(l.property_type)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{l.city}, {l.state}</td>
                  <td className="py-3 pr-4">{formatPrice(l.price_per_night)}</td>
                  <td className="py-3 pr-4"><span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current" />{formatRating(l.rating)} ({l.review_count})</span></td>
                  <td className="py-3 pr-4">{upcoming_bookings}</td>
                  <td className="py-3 pr-4">{formatPrice(earnings)}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/hosting/listings/${l.id}/edit`} aria-label="Edit listing" className="rounded-full p-2 hover:bg-line-soft"><Pencil className="h-4 w-4" /></Link>
                      <button type="button" aria-label="Delete listing" onClick={() => setDeleting(rows.find((r) => r.listing.id === l.id)!)} className="rounded-full p-2 hover:bg-line-soft"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete listing?"
        fullScreenMobile={false}
        footer={
          <div className="flex justify-between">
            <button type="button" onClick={() => setDeleting(null)} className="rounded-lg px-4 py-3 font-semibold underline">Cancel</button>
            <button type="button" onClick={confirmDelete} disabled={busy} className="rounded-lg bg-ink px-6 py-3 font-semibold text-bg disabled:opacity-50">{busy ? "Deleting…" : "Delete"}</button>
          </div>
        }
      >
        <div className="p-6">
          <p className="font-semibold">{deleting?.listing.title}</p>
          <p className="mt-2 text-muted">Guests won&apos;t be able to find or book it anymore. Past trips stay in guests&apos; history. Listings with upcoming reservations can&apos;t be deleted.</p>
        </div>
      </Modal>
    </div>
  );
}

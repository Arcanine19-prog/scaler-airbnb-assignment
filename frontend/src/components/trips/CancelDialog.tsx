"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import { formatPrice, formatRange } from "@/lib/format";
import type { Booking } from "@/lib/types";

export function CancelDialog({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: (b: Booking) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setBusy(true);
    try {
      const updated = await api.cancelBooking(booking.id);
      toast("Reservation cancelled. You'll get a full refund.");
      onDone(updated);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't cancel", { kind: "error" });
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Cancel reservation"
      fullScreenMobile={false}
      footer={
        <div className="flex justify-between">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-3 font-semibold underline hover:bg-surface-soft">Keep reservation</button>
          <button type="button" onClick={cancel} disabled={busy} className="rounded-lg bg-ink px-6 py-3 font-semibold text-bg disabled:opacity-50">
            {busy ? "Cancelling…" : "Cancel reservation"}
          </button>
        </div>
      }
    >
      <div className="p-6">
        <p className="text-lg font-semibold">{booking.listing.title}</p>
        <p className="text-muted">{formatRange(booking.check_in, booking.check_out)}</p>
        <p className="mt-4">You&apos;ll be refunded <span className="font-semibold">{formatPrice(booking.total_price)}</span> and the dates will become available to other guests.</p>
      </div>
    </Modal>
  );
}

"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import type { Booking, ReviewCreate } from "@/lib/types";

type RatingKey = Exclude<keyof ReviewCreate, "booking_id" | "comment">;

const FIELDS: { key: RatingKey; label: string }[] = [
  { key: "rating", label: "Overall experience" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "check_in", label: "Check-in" },
  { key: "communication", label: "Communication" },
  { key: "location", label: "Location" },
  { key: "value", label: "Value" },
];

function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} onMouseEnter={() => setHover(n)}>
          <Star className={`h-6 w-6 transition ${n <= (hover || value) ? "fill-ink text-ink" : "text-line"}`} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

/** Leave a review for a completed stay (the backend enforces completed + once-only). */
export function ReviewModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({ rating: 0, cleanliness: 0, accuracy: 0, check_in: 0, communication: 0, location: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (Object.values(ratings).some((v) => v === 0)) return setError("Please rate every category.");
    if (comment.trim().length < 10) return setError("Tell future guests a bit more (at least 10 characters).");
    setSaving(true);
    try {
      await api.createReview({ booking_id: booking.id, ...ratings, comment: comment.trim() });
      toast("Thanks for your review!");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your review");
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Write a review"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={submit} disabled={saving} className="rounded-lg bg-ink px-6 py-3 font-semibold text-bg disabled:opacity-50">
            {saving ? "Submitting…" : "Submit review"}
          </button>
        </div>
      }
    >
      <div className="space-y-5 p-6">
        <p className="text-muted">How was your stay at <span className="font-semibold text-ink">{booking.listing.title}</span>?</p>
        {FIELDS.map(({ key, label }) => (
          <div key={key} className={`flex items-center justify-between ${key === "rating" ? "border-b border-line-soft pb-5" : ""}`}>
            <span className={key === "rating" ? "font-semibold" : ""}>{label}</span>
            <StarInput label={label} value={ratings[key]} onChange={(v) => setRatings({ ...ratings, [key]: v })} />
          </div>
        ))}
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={5} placeholder="What did you love about this place?" className="w-full rounded-lg border border-line bg-transparent p-3 outline-none focus:border-ink" />
        {error && <p className="text-sm text-brand">{error}</p>}
      </div>
    </Modal>
  );
}

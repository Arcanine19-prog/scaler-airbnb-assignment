"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, KeyRound, Map as MapIcon, MessageSquare, SprayCan, Star, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { api } from "@/lib/api";
import { formatRating, plural, yearsSince } from "@/lib/format";
import type { ListingDetail, Review } from "@/lib/types";
import { Laurel } from "./Laurel";

const CATEGORIES = [
  { key: "cleanliness", label: "Cleanliness", icon: SprayCan },
  { key: "accuracy", label: "Accuracy", icon: CheckCircle2 },
  { key: "check_in", label: "Check-in", icon: KeyRound },
  { key: "communication", label: "Communication", icon: MessageSquare },
  { key: "location", label: "Location", icon: MapIcon },
  { key: "value", label: "Value", icon: Tag },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-2.5 w-2.5 ${i < value ? "fill-ink text-ink" : "text-line"}`} />
      ))}
    </span>
  );
}

function ReviewItem({ review, clamp = true }: { review: Review; clamp?: boolean }) {
  return (
    <article>
      <div className="mb-3 flex items-center gap-3">
        <Avatar user={review.author} size={48} />
        <div>
          <div className="font-semibold">{review.author.name.split(" ")[0]}</div>
          <div className="text-sm text-muted">{review.author.location ?? `${yearsSince(review.author.created_at)} years on Airbnb`}</div>
        </div>
      </div>
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Stars value={review.rating} />
        <span className="font-semibold">·</span>
        <span className="font-semibold">{format(parseISO(review.created_at), "MMMM yyyy")}</span>
      </div>
      <p className={`text-[15px] leading-6 ${clamp ? "line-clamp-3" : ""}`}>{review.comment}</p>
    </article>
  );
}

export function Reviews({ listing }: { listing: ListingDetail }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [all, setAll] = useState<Review[]>([]);
  const [allPage, setAllPage] = useState(0);
  const [allHasMore, setAllHasMore] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.reviews(listing.id, 1, 6).then((p) => setReviews(p.items)).catch(() => {});
  }, [listing.id]);

  const loadMore = () =>
    api.reviews(listing.id, allPage + 1, 10).then((p) => {
      setAll((prev) => [...prev, ...p.items]);
      setAllPage(p.page);
      setAllHasMore(p.has_more);
    });

  if (listing.review_count === 0) {
    return (
      <section className="py-12">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold"><Star className="h-5 w-5 fill-current" /> No reviews (yet)</h2>
        <p className="mt-2 text-muted">This host has no reviews for this place yet. Stay here and be the first!</p>
      </section>
    );
  }

  const maxBar = Math.max(1, ...Object.values(listing.rating_distribution));

  return (
    <section className="py-12">
      {listing.is_guest_favourite ? (
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-1">
            <Laurel side="left" className="h-24 w-14" />
            <span className="text-[72px] font-semibold leading-none tracking-tight">{formatRating(listing.rating)}</span>
            <Laurel side="right" className="h-24 w-14" />
          </div>
          <h2 className="mt-2 text-[22px] font-semibold">Guest favourite</h2>
          <p className="max-w-xs text-muted">One of the most loved homes on Airbnb, according to guests</p>
        </div>
      ) : (
        <h2 className="mb-8 flex items-center gap-2 text-[22px] font-semibold">
          <Star className="h-5 w-5 fill-current" /> {formatRating(listing.rating)} · {plural(listing.review_count, "review")}
        </h2>
      )}

      <div className="no-scrollbar mb-10 flex gap-0 overflow-x-auto border-b border-line-soft pb-8 lg:grid lg:grid-cols-7">
        <div className="shrink-0 pr-6 lg:border-r lg:border-line-soft">
          <div className="mb-2 text-sm font-semibold">Overall rating</div>
          {Object.entries(listing.rating_distribution).map(([stars, count]) => (
            <div key={stars} className="flex items-center gap-2 text-xs">
              <span className="w-2">{stars}</span>
              <span className="h-1 w-24 rounded-full bg-line-soft"><span className="block h-1 rounded-full bg-ink" style={{ width: `${(count / maxBar) * 100}%` }} /></span>
            </div>
          ))}
        </div>
        {CATEGORIES.map(({ key, label, icon: CategoryIcon }) => (
          <div key={key} className="flex w-32 shrink-0 flex-col justify-between border-l border-line-soft px-6 first:border-l-0 lg:w-auto">
            <div>
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-lg font-semibold">{listing.rating_breakdown[key]?.toFixed(1) ?? "–"}</div>
            </div>
            <CategoryIcon className="mt-6 h-8 w-8" strokeWidth={1.25} />
          </div>
        ))}
      </div>

      <div className="grid gap-x-24 gap-y-10 md:grid-cols-2">
        {reviews.map((r) => (
          <ReviewItem key={r.id} review={r} />
        ))}
      </div>

      {listing.review_count > reviews.length && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            if (all.length === 0) loadMore();
          }}
          className="mt-10 rounded-lg bg-surface-soft px-6 py-3 font-semibold hover:bg-line-soft"
        >
          Show all {listing.review_count} reviews
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} size="max-w-3xl">
        <div className="px-6 pb-8 md:px-10">
          <h2 className="mb-8 text-[26px] font-semibold">{plural(listing.review_count, "review")}</h2>
          <div className="space-y-10">
            {all.map((r) => (
              <ReviewItem key={r.id} review={r} clamp={false} />
            ))}
          </div>
          {allHasMore && all.length > 0 && (
            <button type="button" onClick={loadMore} className="mt-10 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-surface-soft">
              Show more reviews
            </button>
          )}
        </div>
      </Modal>
    </section>
  );
}

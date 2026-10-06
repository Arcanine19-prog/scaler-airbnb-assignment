"use client";

import { BadgeCheck, MessageSquare, ShieldCheck, Star } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { useToast } from "@/components/providers/ToastProvider";
import { formatRating, yearsSince } from "@/lib/format";
import type { Host } from "@/lib/types";

/** "Meet your host" card. */
export function HostSection({ host }: { host: Host }) {
  const toast = useToast();
  const years = yearsSince(host.created_at);
  return (
    <section className="py-12">
      <h2 className="mb-8 text-[22px] font-semibold">Meet your host</h2>
      <div className="grid gap-10 md:grid-cols-[380px_1fr]">
        <div className="flex items-center gap-6 rounded-3xl bg-surface p-8 shadow-[0_6px_20px_rgba(0,0,0,0.2)] ring-1 ring-line-soft">
          <div className="flex flex-1 flex-col items-center text-center">
            <div className="relative">
              <Avatar user={host} size={104} />
              {host.is_superhost && (
                <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="mt-3 text-[28px] font-bold leading-8">{host.name.split(" ")[0]}</div>
            <div className="text-sm font-semibold">{host.is_superhost ? "Superhost" : "Host"}</div>
          </div>
          <dl className="w-24 divide-y divide-line-soft">
            <div className="pb-3"><dt className="text-[22px] font-bold leading-6">{host.review_count}</dt><dd className="text-[10px] font-semibold">Reviews</dd></div>
            <div className="py-3"><dt className="flex items-center gap-1 text-[22px] font-bold leading-6">{formatRating(host.rating)}<Star className="h-3.5 w-3.5 fill-current" /></dt><dd className="text-[10px] font-semibold">Rating</dd></div>
            <div className="pt-3"><dt className="text-[22px] font-bold leading-6">{years}</dt><dd className="text-[10px] font-semibold">{years === 1 ? "Year" : "Years"} hosting</dd></div>
          </dl>
        </div>
        <div>
          {host.is_superhost && (
            <>
              <h3 className="text-lg font-semibold">{host.name.split(" ")[0]} is a Superhost</h3>
              <p className="mb-6 mt-1 text-[15px] text-muted">Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.</p>
            </>
          )}
          {host.bio && <p className="mb-6 text-[15px] leading-6">{host.bio}</p>}
          <h3 className="text-lg font-semibold">Host details</h3>
          <p className="mb-1 mt-1 text-[15px]">Response rate: 100%</p>
          <p className="mb-6 text-[15px]">Responds within an hour</p>
          <button type="button" onClick={() => toast("Messaging hosts is coming soon", { kind: "info" })} className="flex items-center gap-2 rounded-lg bg-surface-soft px-6 py-3 font-semibold hover:bg-line-soft">
            <MessageSquare className="h-4 w-4" /> Message host
          </button>
          <p className="mt-8 flex items-start gap-3 border-t border-line-soft pt-6 text-xs text-muted">
            <BadgeCheck className="h-6 w-6 shrink-0 text-brand" />
            To help protect your payment, always use Airbnb to send money and communicate with hosts.
          </p>
        </div>
      </div>
    </section>
  );
}

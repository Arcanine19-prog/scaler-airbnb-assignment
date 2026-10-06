"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COLUMNS = [
  { title: "Support", links: ["Help Centre", "Get help with a safety issue", "AirCover", "Anti-discrimination", "Disability support", "Cancellation options"] },
  { title: "Hosting", links: ["Airbnb your home", "AirCover for Hosts", "Hosting resources", "Community forum", "Hosting responsibly", "Join a free Hosting class"] },
  { title: "Airbnb", links: ["Newsroom", "New features", "Careers", "Investors", "Gift cards", "Emergency stays"] },
];

export function Footer() {
  const pathname = usePathname();
  // Checkout and the listing wizard are focused flows without a footer, as on Airbnb.
  if (pathname.startsWith("/book/") || /^\/hosting\/listings\/(new|\d+\/edit)/.test(pathname)) return null;
  return (
    <footer className="mt-16 border-t border-line-soft bg-surface-soft">
      <div className="mx-auto max-w-[1760px] px-6 xl:px-20">
        <div className="grid gap-8 border-b border-line-soft py-12 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
              <ul className="space-y-3 text-sm text-ink">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href={l === "Airbnb your home" ? "/hosting/listings/new" : "/help"} className="hover:underline">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-3 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-ink">
            © 2026 Airbnb clone · Built for the Scaler SDE assignment · <Link href="/help" className="hover:underline">Privacy</Link> ·{" "}
            <Link href="/help" className="hover:underline">Terms</Link>
          </p>
          <div className="flex items-center gap-6 font-semibold">
            <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> English (IN)</span>
            <span>₹ INR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

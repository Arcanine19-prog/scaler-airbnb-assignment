"use client";

import { format, parseISO } from "date-fns";
import { Globe, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { guestSummary } from "@/components/common/GuestPicker";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { parseSearch } from "@/lib/search";
import { Logo } from "./Logo";
import { MobileSearch } from "./MobileSearch";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";

type FocusSection = "where" | "checkIn" | "who";

const TABS = [
  { label: "Homes", emoji: "🏠", active: true },
  { label: "Experiences", emoji: "🎈", active: false },
  { label: "Services", emoji: "🛎️", active: false },
];

export function Header() {
  const pathname = usePathname();
  const params = useSearchParams();
  const search = parseSearch(params);
  const { user } = useSession();
  const toast = useToast();

  const isHome = pathname === "/";
  const isCheckout = pathname.startsWith("/book/");
  const isHosting = pathname.startsWith("/hosting");

  const [scrolled, setScrolled] = useState(false);
  // Remember which URL the search was expanded on, so navigating anywhere closes it.
  const [opened, setOpened] = useState<{ section: FocusSection; url: string } | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentUrl = `${pathname}?${params}`;
  const forcedOpen = opened?.url === currentUrl ? opened.section : null;
  const setForcedOpen = (section: FocusSection | null) => setOpened(section ? { section, url: currentUrl } : null);

  const expanded = (isHome && !scrolled) || forcedOpen !== null;

  if (isCheckout) {
    return (
      <header className="border-b border-line-soft bg-bg">
        <div className="mx-auto flex h-20 max-w-[1120px] items-center px-6">
          <Logo />
        </div>
      </header>
    );
  }

  const where = search.location || "Anywhere";
  const when = search.checkIn && search.checkOut ? `${format(parseISO(search.checkIn), "d MMM")} – ${format(parseISO(search.checkOut), "d MMM")}` : "Any week";
  const who = guestSummary(search) || "Add guests";

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-40 bg-bg ${expanded || !isHome ? "border-b border-line-soft" : "border-b border-line-soft"}`}>
        {/* ----- Phones: a single "Start your search" pill ----- */}
        <div className="flex h-[72px] items-center px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-surface py-3.5 text-sm shadow-pill ring-1 ring-line-soft"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            <span className="font-semibold">{search.location || (isHosting ? "Search stays" : "Start your search")}</span>
          </button>
        </div>

        {/* ----- Tablet / desktop ----- */}
        <div className="mx-auto hidden h-20 max-w-[1760px] items-center justify-between gap-4 px-6 md:flex xl:px-20">
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          {isHosting ? (
            <nav className="flex gap-2 text-[15px]">
              <Link href="/hosting" className={`rounded-full px-4 py-2 hover:bg-surface-soft ${pathname === "/hosting" ? "font-semibold" : "text-muted"}`}>Today</Link>
              <Link href="/hosting/listings" className={`rounded-full px-4 py-2 hover:bg-surface-soft ${pathname.startsWith("/hosting/listings") ? "font-semibold" : "text-muted"}`}>Listings</Link>
              <Link href="/messages" className="rounded-full px-4 py-2 text-muted hover:bg-surface-soft">Messages</Link>
            </nav>
          ) : expanded ? (
            <nav className="flex items-center gap-2">
              {TABS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => !t.active && toast(`${t.label} are coming soon`, { kind: "info" })}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-[15px] transition ${t.active ? "border-ink font-semibold" : "border-transparent text-muted hover:text-ink"}`}
                >
                  <span className="text-2xl" aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex items-center rounded-full border border-line bg-surface py-1.5 pl-2 pr-2 shadow-pill transition hover:shadow-card">
              <button type="button" onClick={() => setForcedOpen("where")} className="max-w-[160px] truncate px-4 text-sm font-semibold">{where}</button>
              <span className="h-6 w-px bg-line" />
              <button type="button" onClick={() => setForcedOpen("checkIn")} className="px-4 text-sm font-semibold">{when}</button>
              <span className="h-6 w-px bg-line" />
              <button type="button" onClick={() => setForcedOpen("who")} className={`flex items-center gap-3 pl-4 text-sm ${search.adults ? "font-semibold" : "text-muted"}`}>
                {who}
                <span className="btn-brand flex h-8 w-8 items-center justify-center rounded-full">
                  <Search className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </button>
            </div>
          )}

          <div className="flex flex-1 items-center justify-end gap-1">
            {isHosting ? (
              <Link href="/" className="rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-surface-soft">Switch to travelling</Link>
            ) : (
              <Link href={user?.is_host ? "/hosting" : "/hosting/listings/new"} className="hidden rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-surface-soft lg:block">
                {user?.is_host ? "Switch to hosting" : "Become a host"}
              </Link>
            )}
            <button type="button" aria-label="Choose a language and currency" onClick={() => toast("Language & currency settings are coming soon", { kind: "info" })} className="rounded-full p-3 hover:bg-surface-soft">
              <Globe className="h-4 w-4" />
            </button>
            <UserMenu />
          </div>
        </div>

        {expanded && !isHosting && (
          <div className="hidden px-6 pb-6 md:block">
            <SearchBar key={params.toString() + (forcedOpen ?? "")} initial={search} autoFocus={forcedOpen} onDone={() => setForcedOpen(null)} />
          </div>
        )}
      </header>

      {/* Dim the page while the search was expanded from the compact pill. */}
      {forcedOpen && <div className="fixed inset-0 z-30 hidden bg-black/25 md:block" onClick={() => setForcedOpen(null)} />}

      {/* Spacer: the header is fixed, so reserve its height in the flow. */}
      <div className={`h-[72px] ${isHome ? "md:h-[168px]" : "md:h-20"}`} />

      {mobileSearchOpen && <MobileSearch initial={search} onClose={() => setMobileSearchOpen(false)} />}
    </>
  );
}

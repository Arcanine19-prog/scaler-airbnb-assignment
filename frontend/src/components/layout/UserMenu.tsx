"use client";

import { Menu, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import { useSession } from "@/components/providers/SessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { AccountSwitcher } from "./AccountSwitcher";

export function UserMenu() {
  const { user } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const item = "block w-full px-4 py-3 text-left text-sm hover:bg-surface-soft";
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Main navigation menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pl-3 pr-1.5 transition hover:shadow-pill"
      >
        <Menu className="h-4 w-4" strokeWidth={2.5} />
        {user ? <Avatar user={user} size={30} /> : <span className="skeleton h-[30px] w-[30px] rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-xl bg-surface py-2 shadow-card ring-1 ring-line-soft">
          {user && <div className="px-4 pb-2 pt-1 text-xs text-muted">Signed in as <span className="font-semibold text-ink">{user.name}</span></div>}
          <Link href="/wishlists" onClick={close} className={`${item} font-semibold`}>Wishlists</Link>
          <Link href="/trips" onClick={close} className={`${item} font-semibold`}>Trips</Link>
          <Link href="/messages" onClick={close} className={`${item} font-semibold`}>Messages</Link>
          <div className="my-2 border-t border-line-soft" />
          {user?.is_host ? (
            <Link href="/hosting" onClick={close} className={item}>Manage listings</Link>
          ) : (
            <Link href="/hosting/listings/new" onClick={close} className={item}>Airbnb your home</Link>
          )}
          <button type="button" onClick={toggleTheme} className={`${item} flex items-center justify-between`}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/help" onClick={close} className={item}>Help Centre</Link>
          <div className="my-2 border-t border-line-soft" />
          <div className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Switch account (demo)</div>
          <div className="max-h-64 overflow-y-auto">
            <AccountSwitcher onSwitched={close} />
          </div>
        </div>
      )}
    </div>
  );
}

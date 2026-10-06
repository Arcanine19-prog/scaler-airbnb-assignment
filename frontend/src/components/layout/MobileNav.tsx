"use client";

import { Heart, MessageSquare, Search, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./Logo";

const ITEMS = [
  { href: "/", label: "Explore", icon: Search },
  { href: "/wishlists", label: "Wishlists", icon: Heart },
  { href: "/trips", label: "Trips", icon: null },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/account", label: "Profile", icon: UserCircle2 },
];

/** Airbnb's bottom tab bar on phones. Hidden on detail/checkout pages, which have their own action bar. */
export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/rooms/") || pathname.startsWith("/book/")) return null;
  return (
    <>
      <div className="h-16 md:hidden" />
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line-soft bg-bg md:hidden">
        {ITEMS.map(({ href, label, icon: IconComponent }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${active ? "text-brand" : "text-muted"}`}>
              {IconComponent ? (
                <IconComponent className="h-6 w-6" strokeWidth={active ? 2.2 : 1.6} />
              ) : (
                <LogoMark className="h-6 w-6" />
              )}
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

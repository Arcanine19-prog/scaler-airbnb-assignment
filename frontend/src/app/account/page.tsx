"use client";

import { ChevronRight, Home, LifeBuoy, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { useSession } from "@/components/providers/SessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";

/** Profile tab (mainly for phones, where the user menu dropdown isn't shown). */
export default function AccountPage() {
  const { user } = useSession();
  const { theme, toggleTheme } = useTheme();
  const row = "flex items-center justify-between border-b border-line-soft py-4";
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-[32px] font-semibold">Profile</h1>
      {user && (
        <div className="mb-8 flex items-center gap-4 border-b border-line-soft pb-8">
          <Avatar user={user} size={64} />
          <div>
            <div className="text-xl font-semibold">{user.name}</div>
            <div className="text-sm text-muted">{user.is_host ? "Host" : "Guest"} · {user.location}</div>
          </div>
        </div>
      )}
      <Link href={user?.is_host ? "/hosting" : "/hosting/listings/new"} className={row}>
        <span className="flex items-center gap-3"><Home className="h-5 w-5" /> {user?.is_host ? "Switch to hosting" : "Airbnb your home"}</span>
        <ChevronRight className="h-5 w-5" />
      </Link>
      <button type="button" onClick={toggleTheme} className={`${row} w-full`}>
        <span className="flex items-center gap-3">{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} {theme === "dark" ? "Light mode" : "Dark mode"}</span>
        <ChevronRight className="h-5 w-5" />
      </button>
      <Link href="/help" className={row}>
        <span className="flex items-center gap-3"><LifeBuoy className="h-5 w-5" /> Get help</span>
        <ChevronRight className="h-5 w-5" />
      </Link>
      <h2 className="mb-2 mt-10 text-lg font-semibold">Switch account (demo login)</h2>
      <p className="mb-4 text-sm text-muted">Authentication is mocked — pick any guest or host to act as them.</p>
      <div className="-mx-4 rounded-xl">
        <AccountSwitcher />
      </div>
    </div>
  );
}

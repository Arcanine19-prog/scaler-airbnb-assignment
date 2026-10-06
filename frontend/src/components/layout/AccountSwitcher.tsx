"use client";

import { Check } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Avatar } from "@/components/common/Avatar";

/** Mocked login: pick which seeded user you are. Used in the user menu and the mobile account page. */
export function AccountSwitcher({ onSwitched }: { onSwitched?: () => void }) {
  const { user, users, switchUser } = useSession();
  const toast = useToast();
  return (
    <div>
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => {
            if (u.id !== user?.id) {
              switchUser(u.id);
              toast(`Logged in as ${u.name}`);
            }
            onSwitched?.();
          }}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface-soft"
        >
          <Avatar user={u} size={28} />
          <span className="flex-1 truncate">{u.name}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{u.is_host ? "Host" : "Guest"}</span>
          <Check className={`h-4 w-4 ${u.id === user?.id ? "" : "invisible"}`} />
        </button>
      ))}
    </div>
  );
}

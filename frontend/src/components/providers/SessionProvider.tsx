"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setApiUser } from "@/lib/api";
import type { User } from "@/lib/types";

const STORAGE_KEY = "airbnb-clone.user-id";

interface Session {
  user: User | null;
  users: User[];
  switchUser: (id: number) => void;
  refreshUser: () => Promise<void>;
}

const SessionContext = createContext<Session>({
  user: null,
  users: [],
  switchUser: () => {},
  refreshUser: async () => {},
});

export const useSession = () => useContext(SessionContext);

function readStoredId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Mocked authentication (allowed by the assignment). Every seeded user can be "logged in"
 * from the user menu; the chosen id is persisted locally and sent as the X-User-Id header.
 * Any user can be a guest; a user who owns listings is also a host.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const activate = useCallback((u: User) => {
    setApiUser(u.id); // must happen before state updates trigger user-dependent fetches
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, String(u.id));
    } catch {
      /* storage unavailable: session lasts for this tab only */
    }
  }, []);

  useEffect(() => {
    api
      .users()
      .then((list) => {
        setUsers(list);
        const stored = list.find((u) => u.id === readStoredId());
        // Default to the first guest account so the demo starts as a traveller.
        const initial = stored ?? list.find((u) => !u.is_host) ?? list[0];
        if (initial) activate(initial);
      })
      .catch(() => setUsers([]));
  }, [activate]);

  const switchUser = useCallback(
    (id: number) => {
      const next = users.find((u) => u.id === id);
      if (next) activate(next);
    },
    [users, activate],
  );

  const refreshUser = useCallback(async () => {
    const list = await api.users();
    setUsers(list);
    const fresh = list.find((u) => u.id === user?.id);
    if (fresh) setUser(fresh);
  }, [user?.id]);

  return (
    <SessionContext.Provider value={{ user, users, switchUser, refreshUser }}>{children}</SessionContext.Provider>
  );
}

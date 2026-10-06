"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { WishlistProvider } from "./WishlistProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </SessionProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

/** Placeholder for features the assignment allows to be mocked (messaging, help, etc.). */
export function ComingSoon({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-soft">{icon}</div>
      <h1 className="text-[28px] font-semibold">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
      <span className="mt-4 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Coming soon</span>
      <Link href="/" className="mt-8 rounded-lg bg-ink px-6 py-3 font-semibold text-bg">Keep exploring</Link>
    </div>
  );
}

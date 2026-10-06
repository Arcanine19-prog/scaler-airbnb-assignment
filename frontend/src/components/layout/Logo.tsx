import Link from "next/link";

/** Coral loop mark — our own drawing in the spirit of Airbnb's Bélo. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M16 3.5c-1.5 0-2.6.9-3.5 2.6L5.3 20.6c-.6 1.2-.8 2.1-.8 2.9 0 3 2.4 5.5 5.4 5.5 2.2 0 4.1-1.3 6.1-3.5 2 2.2 3.9 3.5 6.1 3.5 3 0 5.4-2.5 5.4-5.5 0-.8-.2-1.7-.8-2.9L19.5 6.1c-.9-1.7-2-2.6-3.5-2.6Zm0 18.6c-1.6-2-2.5-3.7-2.5-5.1 0-1.6 1.1-2.7 2.5-2.7s2.5 1.1 2.5 2.7c0 1.4-.9 3.1-2.5 5.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" aria-label="Home" className="flex items-center gap-1 text-brand">
      <LogoMark />
      <span className="hidden text-[22px] font-extrabold tracking-tight lg:inline">airbnb</span>
    </Link>
  );
}

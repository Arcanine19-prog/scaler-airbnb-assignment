import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-[64px] font-bold leading-none">Oops!</h1>
      <p className="mt-4 text-2xl">We can&apos;t seem to find the page you&apos;re looking for.</p>
      <p className="mt-2 text-sm font-semibold text-muted">Error code: 404</p>
      <Link href="/" className="mt-8 inline-block font-semibold underline">Go home</Link>
    </div>
  );
}

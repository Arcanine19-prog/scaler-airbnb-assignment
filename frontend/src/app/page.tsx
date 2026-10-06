"use client";

import { List, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListingsMap } from "@/components/common/Maps";
import { CategoryBar } from "@/components/home/CategoryBar";
import { FiltersModal } from "@/components/home/FiltersModal";
import { ListingCard, ListingCardSkeleton } from "@/components/home/ListingCard";
import { api } from "@/lib/api";
import { nightsBetween } from "@/lib/format";
import { parseSearch, toApiParams } from "@/lib/search";
import type { ListingCard as Listing } from "@/lib/types";

const PAGE_SIZE = 24;

export default function HomePage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const params = useSearchParams();
  const search = useMemo(() => parseSearch(params), [params]);
  const apiParams = useMemo(() => toApiParams(search), [search]);
  const queryKey = JSON.stringify(apiParams);

  const [items, setItems] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (pageToLoad: number) => {
      const id = ++requestId.current; // ignore responses from superseded searches
      setLoading(true);
      setError(null);
      try {
        const res = await api.searchListings({ ...JSON.parse(queryKey), page: pageToLoad, page_size: PAGE_SIZE });
        if (id !== requestId.current) return;
        setItems((prev) => (pageToLoad === 1 ? res.items : [...prev, ...res.items]));
        setPage(pageToLoad);
        setTotal(res.total);
        setHasMore(res.has_more);
      } catch {
        if (id === requestId.current) setError("We couldn't load homes right now. The server may be waking up — try again in a few seconds.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [queryKey],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1);
    window.scrollTo({ top: 0 });
  }, [load]);

  // Infinite scroll: load the next page when the sentinel below the grid becomes visible.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && load(page + 1), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, load]);

  const nights = search.checkIn && search.checkOut ? nightsBetween(search.checkIn, search.checkOut) : undefined;
  const linkQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of ["check_in", "check_out", "adults", "children", "infants", "pets"]) {
      const v = params.get(k);
      if (v) q.set(k, v);
    }
    return q.toString();
  }, [params]);

  const isFiltered = params.toString() !== "";
  const firstLoad = loading && items.length === 0;

  const grid = (
    <>
      {isFiltered && !firstLoad && !error && (
        <h1 className="mb-6 text-sm font-semibold md:text-base">
          {total === 0 ? "No homes found" : `${total > 40 ? "Over 40" : total} home${total === 1 ? "" : "s"}`}
          {search.location && ` in ${search.location}`}
        </h1>
      )}

      {error && (
        <div className="mx-auto max-w-md py-20 text-center">
          <p className="mb-4 text-muted">{error}</p>
          <button type="button" onClick={() => load(1)} className="rounded-lg bg-ink px-5 py-3 font-semibold text-bg">Try again</button>
        </div>
      )}

      {!error && !firstLoad && items.length === 0 && (
        <div className="py-16">
          <h2 className="text-[22px] font-semibold">No exact matches</h2>
          <p className="mt-2 text-muted">Try changing or removing some of your filters or adjusting your search area.</p>
          <Link href="/" className="mt-6 inline-block rounded-lg border border-ink px-5 py-3 font-semibold hover:bg-surface-soft">Remove all filters</Link>
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 ${
          showMap ? "lg:grid-cols-2 2xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1880px]:grid-cols-6"
        }`}
      >
        {items.map((l) => (
          <ListingCard key={l.id} listing={l} nights={nights} linkQuery={linkQuery} onHover={setHoveredId} />
        ))}
        {loading && Array.from({ length: firstLoad ? 12 : 4 }, (_, i) => <ListingCardSkeleton key={`s${i}`} />)}
      </div>
      <div ref={sentinel} />
      {hasMore && !loading && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <p className="text-lg font-semibold">Continue exploring homes</p>
          <button type="button" onClick={() => load(page + 1)} className="rounded-lg bg-ink px-6 py-3.5 font-semibold text-bg">Show more</button>
        </div>
      )}
    </>
  );

  return (
    <>
      <CategoryBar search={search} onOpenFilters={() => setFiltersOpen(true)} />
      <FiltersModal open={filtersOpen} onClose={() => setFiltersOpen(false)} search={search} />

      {showMap ? (
        <div className="mx-auto flex max-w-[1760px] gap-6 md:pl-6 xl:pl-20">
          <div className="hidden w-full py-6 md:block md:w-[55%] md:pr-0 lg:w-[60%]">{grid}</div>
          <div className="sticky top-[72px] h-[calc(100dvh-72px-64px)] w-full md:top-[164px] md:h-[calc(100dvh-164px)] md:w-[45%] lg:w-[40%]">
            <ListingsMap listings={items} highlightedId={hoveredId} />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1760px] px-6 py-6 xl:px-20">{grid}</div>
      )}

      <button
        type="button"
        onClick={() => setShowMap((s) => !s)}
        className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#222] px-5 py-3.5 text-sm font-semibold text-white shadow-card transition hover:scale-105 md:bottom-12"
      >
        {showMap ? (
          <>Show list <List className="h-4 w-4" /></>
        ) : (
          <>Show map <MapIcon className="h-4 w-4" /></>
        )}
      </button>
    </>
  );
}

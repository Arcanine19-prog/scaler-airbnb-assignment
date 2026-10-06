"use client";

import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { api } from "@/lib/api";
import { activeFilterCount, buildSearchUrl, type SearchState } from "@/lib/search";
import type { Category } from "@/lib/types";

export function CategoryBar({ search, onOpenFilters }: { search: SearchState; onOpenFilters: () => void }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const updateEdges = () => {
    const el = scroller.current;
    if (el) setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  const filterCount = activeFilterCount(search);

  return (
    <div className="sticky top-[72px] z-30 bg-bg md:top-20">
      <div className="mx-auto flex max-w-[1760px] items-center gap-6 px-6 pt-3 xl:px-20">
        <div className="relative min-w-0 flex-1">
          {!edges.start && (
            <button type="button" aria-label="Scroll categories left" onClick={() => scrollBy(-1)} className="absolute left-0 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface shadow-sm hover:scale-105 hover:shadow-pill md:flex">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div ref={scroller} onScroll={updateEdges} className="no-scrollbar flex gap-8 overflow-x-auto">
            {categories.length === 0 &&
              Array.from({ length: 12 }, (_, i) => <div key={i} className="skeleton h-12 w-16 shrink-0 rounded" />)}
            {categories.map((c) => {
              const active = search.category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => router.push(buildSearchUrl({ ...search, category: active ? null : c.slug }))}
                  className={`flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 pt-1 text-xs font-semibold transition ${
                    active ? "border-ink text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"
                  }`}
                >
                  <Icon name={c.icon} className="h-6 w-6" />
                  <span className="whitespace-nowrap">{c.name}</span>
                </button>
              );
            })}
          </div>
          {!edges.end && categories.length > 0 && (
            <>
              <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-16 bg-gradient-to-l from-bg md:block" />
              <button type="button" aria-label="Scroll categories right" onClick={() => scrollBy(1)} className="absolute right-0 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface shadow-sm hover:scale-105 hover:shadow-pill md:flex">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className={`relative mb-2 flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold transition hover:border-ink hover:bg-surface-soft ${filterCount ? "border-ink" : "border-line"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {filterCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-bg">{filterCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

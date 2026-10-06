/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronLeft, ChevronRight, Grip, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { photoUrl } from "@/lib/format";
import type { Photo } from "@/lib/types";

/** Airbnb's 1 large + 4 small photo mosaic, a "Show all photos" tour, and a full-screen viewer. */
export function PhotoGrid({ photos, title }: { photos: Photo[]; title: string }) {
  const [tourOpen, setTourOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const urls = photos.map((p) => p.url);

  return (
    <>
      {/* Phones: swipeable strip with a counter */}
      <div className="relative -mx-6 md:hidden">
        <div
          className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setMobileIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {urls.map((u, i) => (
            <img key={i} src={photoUrl(u, 900)} alt={i === 0 ? title : ""} onClick={() => setTourOpen(true)} className="h-full w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
        <span className="absolute bottom-4 right-4 rounded-md bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          {mobileIndex + 1} / {urls.length}
        </span>
      </div>

      {/* Tablet/desktop mosaic */}
      <div className="relative hidden h-[min(60vh,560px)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl md:grid">
        {urls.slice(0, 5).map((u, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setTourOpen(true)}
            className={`group relative overflow-hidden bg-surface-soft ${i === 0 ? "col-span-2 row-span-2" : ""} ${urls.length < 5 && i === 0 ? "col-span-4" : ""}`}
          >
            <img src={photoUrl(u, i === 0 ? 1200 : 700)} alt={i === 0 ? title : ""} className="h-full w-full object-cover transition group-hover:brightness-90" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTourOpen(true)}
          className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg border border-[#222] bg-white px-4 py-1.5 text-sm font-semibold text-[#222] hover:bg-[#f7f7f7]"
        >
          <Grip className="h-4 w-4" /> Show all photos
        </button>
      </div>

      {tourOpen &&
        createPortal(
          <div className="fixed inset-0 z-[85] overflow-y-auto bg-bg">
            <div className="sticky top-0 z-10 flex h-16 items-center bg-bg px-6">
              <button type="button" aria-label="Close photo tour" onClick={() => setTourOpen(false)} className="rounded-full p-2 hover:bg-surface-soft">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-6 pb-16">
              {urls.map((u, i) => (
                <button key={i} type="button" onClick={() => setViewerIndex(i)} className={i % 3 === 0 ? "col-span-2" : ""}>
                  <img src={photoUrl(u, 1200)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {viewerIndex !== null && <PhotoViewer urls={urls} index={viewerIndex} onIndex={setViewerIndex} onClose={() => setViewerIndex(null)} />}
    </>
  );
}

function PhotoViewer({ urls, index, onIndex, onClose }: { urls: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < urls.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, urls.length, onIndex, onClose]);

  const nav = "absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 text-white hover:bg-white/10 disabled:opacity-0";
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div className="flex h-16 items-center justify-between px-6 text-white">
        <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-white/10">
          <X className="h-4 w-4" /> Close
        </button>
        <span className="text-sm">{index + 1} / {urls.length}</span>
        <span className="w-16" />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-10 md:px-24">
        <img src={photoUrl(urls[index], 1600)} alt="" className="max-h-full max-w-full object-contain" />
        <button type="button" aria-label="Previous" disabled={index === 0} onClick={() => onIndex(index - 1)} className={`${nav} left-4`}><ChevronLeft /></button>
        <button type="button" aria-label="Next" disabled={index === urls.length - 1} onClick={() => onIndex(index + 1)} className={`${nav} right-4`}><ChevronRight /></button>
      </div>
    </div>,
    document.body,
  );
}

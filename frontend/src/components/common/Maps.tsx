"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at import time, so the maps are client-only.
const Loading = () => <div className="skeleton h-full w-full" />;

export const ListingsMap = dynamic(() => import("./LeafletMap").then((m) => m.ListingsMap), { ssr: false, loading: Loading });
export const LocationMap = dynamic(() => import("./LeafletMap").then((m) => m.LocationMap), { ssr: false, loading: Loading });

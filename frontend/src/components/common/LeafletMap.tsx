/* eslint-disable @next/next/no-img-element */
"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { formatPrice, formatRating, photoUrl } from "@/lib/format";
import type { ListingCard } from "@/lib/types";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

const pinIcon = (price: number, active: boolean) =>
  L.divIcon({ className: "", html: `<span class="price-pin ${active ? "active" : ""}">${formatPrice(price)}</span>`, iconSize: [0, 0] });

const homeIcon = L.divIcon({
  className: "",
  iconSize: [0, 0],
  html: `<span style="transform:translate(-50%,-50%);display:flex;width:48px;height:48px;border-radius:9999px;background:#ff385c;align-items:center;justify-content:center;box-shadow:0 0 0 12px rgba(255,56,92,.18)">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"/></svg></span>`,
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 11);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Explore map: a price pin per listing, popup card on click. */
export function ListingsMap({ listings, highlightedId }: { listings: ListingCard[]; highlightedId?: number | null }) {
  const points = listings.map((l) => [l.latitude, l.longitude] as [number, number]);
  return (
    <MapContainer center={[22.5, 79]} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <FitBounds points={points} />
      {listings.map((l) => (
        <Marker key={l.id} position={[l.latitude, l.longitude]} icon={pinIcon(l.price_per_night, highlightedId === l.id)} zIndexOffset={highlightedId === l.id ? 1000 : 0}>
          <Popup closeButton={false} className="listing-popup" minWidth={260}>
            <Link href={`/rooms/${l.id}`} className="block w-[260px] text-[#222] no-underline">
              <img src={photoUrl(l.photos[0] ?? "", 520)} alt="" className="h-40 w-full rounded-t-xl object-cover" />
              <div className="p-3 text-sm">
                <div className="flex justify-between font-semibold"><span className="truncate">{l.city}, {l.state}</span><span>★ {formatRating(l.rating)}</span></div>
                <div className="truncate text-[#6a6a6a]">{l.title}</div>
                <div className="mt-1"><b>{formatPrice(l.price_per_night)}</b> night</div>
              </div>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/** Detail page "Where you'll be" map, or the host form's location picker when `onPick` is set. */
export function LocationMap({ lat, lng, zoom = 12, onPick }: { lat: number; lng: number; zoom?: number; onPick?: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <Recenter lat={lat} lng={lng} />
      {onPick && <ClickToPick onPick={onPick} />}
      <Marker position={[lat, lng]} icon={homeIcon} />
    </MapContainer>
  );
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))) });
  return null;
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { ArrowDown, ArrowUp, BedDouble, Building2, Castle, House, ImagePlus, Link2, Tent, Trees, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Counter } from "@/components/common/Counter";
import { Icon } from "@/components/common/Icon";
import { LocationMap } from "@/components/common/Maps";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { api } from "@/lib/api";
import { CITY_PRESETS } from "@/lib/cities";
import { formatPrice, photoUrl, propertyLabel } from "@/lib/format";
import type { Amenity, Category, ListingWrite, PropertyType } from "@/lib/types";

const PROPERTY_TYPES: { type: PropertyType; icon: typeof House }[] = [
  { type: "house", icon: House },
  { type: "apartment", icon: Building2 },
  { type: "villa", icon: Castle },
  { type: "cabin", icon: Trees },
  { type: "cottage", icon: Tent },
  { type: "guesthouse", icon: BedDouble },
];

const STEPS = ["type", "category", "location", "basics", "amenities", "photos", "details", "price", "review"] as const;
type Step = (typeof STEPS)[number];

export const EMPTY_LISTING: ListingWrite = {
  title: "",
  description: "",
  property_type: "house",
  category_id: null,
  city: CITY_PRESETS[0].city,
  state: CITY_PRESETS[0].state,
  country: "India",
  latitude: CITY_PRESETS[0].lat,
  longitude: CITY_PRESETS[0].lng,
  price_per_night: 4000,
  cleaning_fee: 500,
  max_guests: 4,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  amenity_ids: [],
  photo_urls: [],
};

/** Per-step validation; returns an error message or null. Mirrors the backend's Pydantic rules. */
function validate(step: Step, l: ListingWrite): string | null {
  switch (step) {
    case "location":
      return l.city.trim().length < 2 || l.state.trim().length < 2 ? "Enter the city and state." : null;
    case "photos":
      return l.photo_urls.length === 0 ? "Add at least one photo." : null;
    case "details":
      if (l.title.trim().length < 5) return "Your title needs at least 5 characters.";
      if (l.description.trim().length < 20) return "Your description needs at least 20 characters.";
      return null;
    case "price":
      return l.price_per_night < 100 ? "Set a nightly price of at least ₹100." : null;
    default:
      return null;
  }
}

interface Props {
  listingId?: number;
  initial: ListingWrite;
}

/** Airbnb's step-by-step "Airbnb your home" flow, used for both creating and editing a listing. */
export function ListingWizard({ listingId, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { refreshUser } = useSession();
  const [listing, setListing] = useState<ListingWrite>(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [photoInput, setPhotoInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.amenities().then(setAmenities).catch(() => {});
  }, []);

  const step = STEPS[stepIndex];
  const isEdit = listingId !== undefined;
  const update = (patch: Partial<ListingWrite>) => setListing((l) => ({ ...l, ...patch }));

  function go(delta: number) {
    if (delta > 0) {
      const problem = validate(step, listing);
      setError(problem);
      if (problem) return;
    }
    setError(null);
    setStepIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + delta)));
    window.scrollTo({ top: 0 });
  }

  async function save() {
    const firstInvalid = STEPS.findIndex((s) => validate(s, listing));
    if (firstInvalid !== -1) {
      setStepIndex(firstInvalid);
      setError(validate(STEPS[firstInvalid], listing));
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit ? await api.updateListing(listingId, listing) : await api.createListing(listing);
      if (!isEdit) await refreshUser(); // the user is now a host
      toast(isEdit ? "Listing updated" : "Your listing is published!");
      router.push(isEdit ? "/hosting/listings" : `/rooms/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the listing");
      setSaving(false);
    }
  }

  function addPhotoUrl() {
    const url = photoInput.trim();
    if (!/^https?:\/\/.+/.test(url)) return setError("Paste a full image URL starting with http(s)://");
    update({ photo_urls: [...listing.photo_urls, url] });
    setPhotoInput("");
    setError(null);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) urls.push((await api.uploadPhoto(file)).url);
      update({ photo_urls: [...listing.photo_urls, ...urls] });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const movePhoto = (i: number, delta: number) => {
    const urls = [...listing.photo_urls];
    [urls[i], urls[i + delta]] = [urls[i + delta], urls[i]];
    update({ photo_urls: urls });
  };

  const tile = (on: boolean) =>
    `flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition ${on ? "border-ink bg-surface-soft ring-1 ring-ink" : "border-line hover:border-ink"}`;
  const textInput = "w-full rounded-lg border border-line bg-transparent px-4 py-3 outline-none focus:border-ink focus:ring-1 focus:ring-ink";
  const guestFee = Math.round(listing.price_per_night * 0.14);

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col">
      <div className="mx-auto flex w-full max-w-[1120px] justify-end gap-3 px-6 pt-6">
        {isEdit && (
          <button type="button" onClick={save} disabled={saving} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
            Save &amp; exit
          </button>
        )}
        <Link href={isEdit ? "/hosting/listings" : "/hosting"} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink">Exit</Link>
      </div>

      <div className="mx-auto w-full max-w-[640px] flex-1 px-6 pb-40 pt-8">
        {step === "type" && (
          <>
            <h1 className="mb-8 text-[32px] font-semibold leading-tight">Which of these best describes your place?</h1>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PROPERTY_TYPES.map(({ type, icon: TypeIcon }) => (
                <button key={type} type="button" onClick={() => update({ property_type: type })} className={tile(listing.property_type === type)}>
                  <TypeIcon className="h-8 w-8" strokeWidth={1.5} />
                  <span className="font-semibold">{propertyLabel(type)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "category" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Which category fits your place best?</h1>
            <p className="mb-8 text-muted">Guests browse by these categories on the home page.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => update({ category_id: listing.category_id === c.id ? null : c.id })} className={tile(listing.category_id === c.id)}>
                  <Icon name={c.icon} className="h-8 w-8" />
                  <span className="font-semibold">{c.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "location" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Where&apos;s your place located?</h1>
            <p className="mb-6 text-muted">Pick a city, then click the map to drop the pin exactly. Guests only see the area until they book.</p>
            <select
              aria-label="City preset"
              value={CITY_PRESETS.find((c) => c.city === listing.city && c.state === listing.state)?.city ?? ""}
              onChange={(e) => {
                const p = CITY_PRESETS.find((c) => c.city === e.target.value);
                if (p) update({ city: p.city, state: p.state, latitude: p.lat, longitude: p.lng });
              }}
              className={`${textInput} mb-3`}
            >
              <option value="">Other (type below)</option>
              {CITY_PRESETS.map((c) => <option key={c.city} value={c.city}>{c.city}, {c.state}</option>)}
            </select>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <input aria-label="City" placeholder="City" value={listing.city} onChange={(e) => update({ city: e.target.value })} className={textInput} />
              <input aria-label="State" placeholder="State" value={listing.state} onChange={(e) => update({ state: e.target.value })} className={textInput} />
            </div>
            <div className="h-[340px] overflow-hidden rounded-xl">
              <LocationMap lat={listing.latitude} lng={listing.longitude} zoom={11} onPick={(latitude, longitude) => update({ latitude, longitude })} />
            </div>
            <p className="mt-2 text-xs text-muted">Pin: {listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)}</p>
          </>
        )}

        {step === "basics" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Share some basics about your place</h1>
            <p className="mb-6 text-muted">You&apos;ll add more details later, such as bed types.</p>
            <div className="divide-y divide-line-soft">
              <Counter label="Guests" value={listing.max_guests} min={1} max={16} onChange={(v) => update({ max_guests: v })} />
              <Counter label="Bedrooms" value={listing.bedrooms} min={0} max={50} onChange={(v) => update({ bedrooms: v })} />
              <Counter label="Beds" value={listing.beds} min={1} max={50} onChange={(v) => update({ beds: v })} />
              <Counter label="Bathrooms" value={listing.bathrooms} min={1} max={50} onChange={(v) => update({ bathrooms: v })} />
            </div>
          </>
        )}

        {step === "amenities" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Tell guests what your place has to offer</h1>
            <p className="mb-8 text-muted">You can add more amenities after you publish your listing.</p>
            {["Essentials", "Features", "Location", "Safety"].map((group) => (
              <div key={group} className="mb-8">
                <h2 className="mb-3 font-semibold">{group}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {amenities.filter((a) => a.group === group).map((a) => {
                    const on = listing.amenity_ids.includes(a.id);
                    return (
                      <button key={a.id} type="button" onClick={() => update({ amenity_ids: on ? listing.amenity_ids.filter((x) => x !== a.id) : [...listing.amenity_ids, a.id] })} className={tile(on)}>
                        <Icon name={a.icon} className="h-7 w-7" />
                        <span className="text-sm font-semibold">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {step === "photos" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Add some photos of your place</h1>
            <p className="mb-6 text-muted">Paste image links or upload from your device. The first photo is your cover.</p>
            <div className="mb-3 flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-ink">
                <Link2 className="h-4 w-4 text-muted" />
                <input value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhotoUrl())} placeholder="https://images.unsplash.com/…" className="w-full bg-transparent py-3 outline-none" />
              </div>
              <button type="button" onClick={addPhotoUrl} className="rounded-lg bg-ink px-5 font-semibold text-bg">Add</button>
            </div>
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="mb-6 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-ink/40 py-10 hover:bg-surface-soft">
              <ImagePlus className="h-10 w-10" strokeWidth={1.25} />
              <span className="font-semibold">{uploading ? "Uploading…" : "Upload from your device"}</span>
              <span className="text-xs text-muted">JPG, PNG or WEBP · up to 5MB each</span>
            </button>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
            <div className="grid grid-cols-2 gap-3">
              {listing.photo_urls.map((url, i) => (
                <div key={`${url}-${i}`} className={`group relative overflow-hidden rounded-xl bg-surface-soft ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}>
                  <img src={photoUrl(url, 800)} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#222] shadow">Cover photo</span>}
                  <div className="absolute right-2 top-2 flex gap-1">
                    {i > 0 && <button type="button" aria-label="Move earlier" onClick={() => movePhoto(i, -1)} className="rounded-full bg-white/90 p-1.5 text-[#222] shadow"><ArrowUp className="h-4 w-4" /></button>}
                    {i < listing.photo_urls.length - 1 && <button type="button" aria-label="Move later" onClick={() => movePhoto(i, 1)} className="rounded-full bg-white/90 p-1.5 text-[#222] shadow"><ArrowDown className="h-4 w-4" /></button>}
                    <button type="button" aria-label="Remove photo" onClick={() => update({ photo_urls: listing.photo_urls.filter((_, j) => j !== i) })} className="rounded-full bg-white/90 p-1.5 text-[#222] shadow"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === "details" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Now, let&apos;s give your place a title</h1>
            <p className="mb-4 text-muted">Short titles work best. Have fun with it — you can always change it later.</p>
            <textarea value={listing.title} maxLength={120} rows={2} onChange={(e) => update({ title: e.target.value })} className={`${textInput} text-2xl`} />
            <p className="mb-8 mt-1 text-xs font-semibold text-muted">{listing.title.length}/120</p>
            <h2 className="mb-2 text-2xl font-semibold">Create your description</h2>
            <p className="mb-4 text-muted">Share what makes your place special.</p>
            <textarea value={listing.description} maxLength={5000} rows={8} onChange={(e) => update({ description: e.target.value })} className={textInput} />
            <p className="mt-1 text-xs font-semibold text-muted">{listing.description.length}/5000</p>
          </>
        )}

        {step === "price" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">Now, set your price</h1>
            <p className="mb-10 text-muted">You can change it anytime.</p>
            <div className="mb-2 flex items-center justify-center text-6xl font-bold">
              ₹
              <input aria-label="Price per night" inputMode="numeric" value={listing.price_per_night || ""} onChange={(e) => update({ price_per_night: Number(e.target.value.replace(/\D/g, "").slice(0, 7)) })} className="w-[5ch] bg-transparent text-center outline-none" />
            </div>
            <p className="mb-8 text-center text-muted">per night</p>
            <div className="mb-6 space-y-2 rounded-xl border border-line p-5 text-[15px]">
              <div className="flex justify-between"><span>Base price</span><span>{formatPrice(listing.price_per_night)}</span></div>
              <div className="flex justify-between"><span>Guest service fee</span><span>{formatPrice(guestFee)}</span></div>
              <div className="flex justify-between border-t border-line-soft pt-3 font-semibold"><span>Guest price before taxes</span><span>{formatPrice(listing.price_per_night + guestFee)}</span></div>
            </div>
            <label className="block">
              <span className="mb-2 block font-semibold">Cleaning fee (per stay)</span>
              <input inputMode="numeric" value={listing.cleaning_fee} onChange={(e) => update({ cleaning_fee: Number(e.target.value.replace(/\D/g, "").slice(0, 6)) })} className={textInput} />
            </label>
          </>
        )}

        {step === "review" && (
          <>
            <h1 className="mb-2 text-[32px] font-semibold leading-tight">{isEdit ? "Review your changes" : "Review your listing"}</h1>
            <p className="mb-8 text-muted">Here&apos;s what we&apos;ll show to guests. Make sure everything looks good.</p>
            <div className="overflow-hidden rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.15)] ring-1 ring-line-soft">
              {listing.photo_urls[0] && <img src={photoUrl(listing.photo_urls[0], 900)} alt="" className="aspect-[4/3] w-full object-cover" />}
              <div className="p-5">
                <div className="text-lg font-semibold">{listing.title}</div>
                <div className="text-muted">{propertyLabel(listing.property_type)} in {listing.city}, {listing.state}</div>
                <div className="mt-2 text-sm text-muted">{listing.max_guests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds · {listing.bathrooms} bathrooms</div>
                <div className="mt-2"><span className="font-semibold">{formatPrice(listing.price_per_night)}</span> night · {listing.photo_urls.length} photos · {listing.amenity_ids.length} amenities</div>
              </div>
            </div>
          </>
        )}

        {error && <p className="mt-6 rounded-lg bg-brand/10 p-3 text-sm font-semibold text-brand">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 bg-bg md:bottom-0">
        <div className="flex h-1.5 gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="h-full flex-1 bg-line-soft">
              <div className={`h-full bg-ink transition-all ${i <= stepIndex ? "w-full" : "w-0"}`} />
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <button type="button" onClick={() => go(-1)} disabled={stepIndex === 0} className="rounded-lg px-3 py-3 font-semibold underline disabled:invisible">Back</button>
          {step === "review" ? (
            <button type="button" onClick={save} disabled={saving} className="btn-brand rounded-lg px-8 py-3.5 font-semibold disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Publish"}
            </button>
          ) : (
            <button type="button" onClick={() => go(1)} className="rounded-lg bg-ink px-8 py-3.5 font-semibold text-bg">Next</button>
          )}
        </div>
      </div>
    </div>
  );
}

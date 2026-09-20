"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CompareSlider } from "@/components/CompareSlider";
import { formatBytes, formatMegapixels, formatResolution, labelForFrame } from "@/lib/format";
import type { PhotoDTO, QueueItem } from "@/lib/types";

const SAMPLES = [
  { src: "/samples/alpine-lake.jpg", title: "Alpine Lake", caption: "Dawn still water" },
  { src: "/samples/golden-coast.jpg", title: "Golden Coast", caption: "Pacific last light" },
  { src: "/samples/night-skyline.jpg", title: "Night Skyline", caption: "City after dark" },
  { src: "/samples/sunset-range.jpg", title: "Sunset Range", caption: "Aerial ridgeline" },
] as const;

const ACCEPT = "image/jpeg,image/png,image/webp,image/tiff,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.tif,.tiff,.avif";

type StudioProps = {
  initialPhotos: PhotoDTO[];
};

export function Studio({ initialPhotos }: StudioProps) {
  const [photos, setPhotos] = useState<PhotoDTO[]>(initialPhotos);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialPhotos[0]?.id ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const working = useRef(false);

  const selected = photos.find((photo) => photo.id === selectedId) ?? photos[0] ?? null;

  const stats = useMemo(() => {
    const pixels = photos.reduce((sum, photo) => sum + photo.upscaledWidth * photo.upscaledHeight, 0);
    const bytes = photos.reduce((sum, photo) => sum + photo.upscaledBytes, 0);
    return {
      count: photos.length,
      pixels,
      bytes,
    };
  }, [photos]);

  const processFiles = useCallback(async (fileList: File[]) => {
    const images = fileList.filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|tiff?|avif|gif|bmp)$/i.test(file.name));
    if (images.length === 0) {
      setError("Please drop photo files (JPG, PNG, WebP, TIFF, AVIF).");
      return;
    }

    setError(null);
    const items: QueueItem[] = images.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
    }));
    setQueue((current) => [...items, ...current]);
    setBusy(true);

    for (const [index, file] of images.entries()) {
      const itemId = items[index].id;
      setQueue((current) =>
        current.map((entry) => (entry.id === itemId ? { ...entry, status: "working" } : entry)),
      );

      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/photos", { method: "POST", body: form });
        const payload = (await response.json()) as { photos?: PhotoDTO[]; error?: string };
        if (!response.ok || !payload.photos?.[0]) {
          throw new Error(payload.error || "Upscale failed");
        }
        const photo = payload.photos[0];
        setPhotos((current) => [photo, ...current.filter((row) => row.id !== photo.id)]);
        setSelectedId(photo.id);
        setQueue((current) =>
          current.map((entry) => (entry.id === itemId ? { ...entry, status: "done", photo } : entry)),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upscale failed";
        setQueue((current) =>
          current.map((entry) => (entry.id === itemId ? { ...entry, status: "error", error: message } : entry)),
        );
        setError(message);
      }
    }

    setBusy(false);
  }, []);

  const onFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const files = Array.from(list);
      void processFiles(files);
    },
    [processFiles],
  );

  const fileFromSample = useCallback(async (sample: (typeof SAMPLES)[number]) => {
    const response = await fetch(sample.src);
    const blob = await response.blob();
    return new File([blob], `${sample.title.replace(/\s+/g, "-").toLowerCase()}-hd.jpg`, {
      type: blob.type || "image/jpeg",
    });
  }, []);

  const runSamples = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    try {
      const files = await Promise.all(SAMPLES.map((sample) => fileFromSample(sample)));
      await processFiles(files);
    } finally {
      working.current = false;
    }
  }, [fileFromSample, processFiles]);

  const runSample = useCallback(
    async (sample: (typeof SAMPLES)[number]) => {
      if (working.current) return;
      working.current = true;
      try {
        await processFiles([await fileFromSample(sample)]);
      } finally {
        working.current = false;
      }
    },
    [fileFromSample, processFiles],
  );

  const removePhoto = useCallback(async (id: number) => {
    const response = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setPhotos((current) => {
      const next = current.filter((photo) => photo.id !== id);
      setSelectedId((prev) => (prev === id ? (next[0]?.id ?? null) : prev));
      return next;
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="grain" />
      <div className="vignette" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-gold">
              <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          <div>
            <p className="font-display text-lg tracking-[0.18em] text-mist uppercase">Lumina</p>
            <p className="text-[10px] tracking-[0.28em] text-mute uppercase">4K HDR Lab</p>
          </div>
        </div>
        <div className="hidden items-center gap-6 text-[11px] tracking-[0.22em] text-mute uppercase sm:flex">
          <span>Lanczos 2×</span>
          <span className="h-3 w-px bg-line" />
          <span>CLAHE HDR</span>
          <span className="h-3 w-px bg-line" />
          <span>4:4:4 JPEG</span>
        </div>
        <a
          href="#studio"
          className="rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-[11px] tracking-[0.2em] text-gold uppercase"
        >
          Open bay
        </a>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pt-4 pb-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rise">
          <p className="text-[11px] tracking-[0.42em] text-gold uppercase">Photo finishing suite</p>
          <h1 className="font-display mt-5 max-w-3xl text-[clamp(3.1rem,8vw,6.4rem)] leading-[0.9] font-light text-mist">
            Lift <span className="gold-text italic">1080p</span>
            <br />
            into cinema <span className="italic">4K HDR</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-mute">
            Drop as many stills as you want. Lumina super-resolves every frame to 4K, then grades it with local contrast,
            richer color, and HDR punch — ready to download.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="pulse-glow rounded-full bg-gold px-6 py-3 text-sm font-medium tracking-wide text-ink"
            >
              Upload photos
            </button>
            <button
              type="button"
              onClick={() => void runSamples()}
              className="rounded-full border border-line px-6 py-3 text-sm text-mist"
            >
              Try sample stills
            </button>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-[10px] tracking-[0.22em] text-mute uppercase">Processed</dt>
              <dd className="font-display mt-1 text-2xl">{stats.count}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.22em] text-mute uppercase">Output</dt>
              <dd className="font-display mt-1 text-2xl">{(stats.pixels / 1_000_000).toFixed(0)} MP</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.22em] text-mute uppercase">Library</dt>
              <dd className="font-display mt-1 text-2xl">{formatBytes(stats.bytes)}</dd>
            </div>
          </dl>
        </div>

        <div className="relative rise" style={{ animationDelay: "120ms" }}>
          <div className="frame-corners overflow-hidden rounded-[28px] border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero.jpg" alt="Cinematic alpine lake at golden hour" className="h-[520px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
            <div className="absolute top-5 left-5 flex items-center gap-2 text-[10px] tracking-[0.28em] text-gold uppercase">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Rec · 4K HDR
            </div>
            <p className="absolute right-5 bottom-5 font-display text-xl text-mist/90 italic">From HD master to UHD print</p>
          </div>
        </div>
      </section>

      <section id="studio" className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div
          className={`panel rounded-[32px] p-4 sm:p-8 ${dragOver ? "drop-active" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            onFiles(event.dataTransfer.files);
          }}
        >
          <div className="flex flex-col gap-4 border border-dashed border-gold/25 bg-black/25 px-6 py-12 text-center sm:px-12">
            <p className="text-[11px] tracking-[0.35em] text-gold uppercase">Intake bay</p>
            <h2 className="font-display text-3xl text-mist sm:text-4xl">Drop every photo you want graded</h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-mute">
              Unlimited batch size in one sitting. Each still is independently 2× upscaled toward 3840×2160, then given an
              HDR color grade. JPG, PNG, WebP, TIFF and AVIF up to 25 MB each.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-mist px-6 py-3 text-sm font-medium text-ink"
              >
                Choose files
              </button>
              {photos.length > 0 && (
                <a
                  href="/api/photos/zip"
                  className="rounded-full border border-gold/40 px-6 py-3 text-sm text-gold"
                >
                  Download all 4K HDR
                </a>
              )}
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {busy && <p className="text-xs tracking-[0.2em] text-gold uppercase">Grading in progress…</p>}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(event) => {
              onFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />

          {queue.length > 0 && (
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {queue.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center gap-4 rounded-2xl border border-line bg-black/30 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="h-14 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm text-mist">{item.name}</p>
                    <p className="text-[11px] text-mute">{formatBytes(item.size)}</p>
                  </div>
                  <StatusChip status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <div className="mt-10 overflow-hidden rounded-[32px] border border-line bg-ink-soft">
            <CompareSlider before={selected.originalUrl} after={selected.upscaledUrl} alt={selected.originalName} />
            <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
              <div>
                <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Hero grade</p>
                <h3 className="font-display mt-2 text-3xl">{selected.originalName}</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute">
                  Drag the slider to compare the HD original against the 4K HDR finish. The right side is the delivered
                  master — sharper, wider in color, and twice the linear resolution.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta label="Source" value={`${labelForFrame(selected.originalWidth, selected.originalHeight)} · ${formatResolution(selected.originalWidth, selected.originalHeight)}`} />
                <Meta label="Delivered" value={`${labelForFrame(selected.upscaledWidth, selected.upscaledHeight)} · ${formatResolution(selected.upscaledWidth, selected.upscaledHeight)}`} />
                <Meta label="Original weight" value={formatBytes(selected.originalBytes)} />
                <Meta label="4K HDR weight" value={formatBytes(selected.upscaledBytes)} />
                <Meta label="Source detail" value={formatMegapixels(selected.originalWidth, selected.originalHeight)} />
                <Meta label="Output detail" value={formatMegapixels(selected.upscaledWidth, selected.upscaledHeight)} />
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-2">
                <a
                  href={`/api/photos/${selected.id}/download?variant=upscaled`}
                  className="rounded-full bg-gold px-5 py-2.5 text-sm text-ink"
                >
                  Download 4K HDR
                </a>
                <a
                  href={`/api/photos/${selected.id}/download?variant=original`}
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-mist"
                >
                  Download original
                </a>
                <button
                  type="button"
                  onClick={() => void removePhoto(selected.id)}
                  className="rounded-full border border-red-400/30 px-5 py-2.5 text-sm text-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {[
            {
              step: "01",
              title: "Ingest",
              body: "Queue every still at once. Lumina keeps originals untouched in the vault while work prints are made.",
            },
            {
              step: "02",
              title: "Super-resolve",
              body: "Lanczos3 reconstruction doubles linear resolution so a 1920×1080 master lands at true 3840×2160 UHD.",
            },
            {
              step: "03",
              title: "HDR grade",
              body: "CLAHE local contrast, saturation lift, and 4:4:4 encoding give the frame that luminous HDR finish.",
            },
          ].map((item) => (
            <article key={item.step} className="rounded-[28px] border border-line bg-panel/80 p-6">
              <p className="text-[11px] tracking-[0.3em] text-gold uppercase">{item.step}</p>
              <h3 className="font-display mt-3 text-2xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mute">{item.body}</p>
            </article>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="mt-16">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-[11px] tracking-[0.3em] text-gold uppercase">Reference rolls</p>
                <h3 className="font-display mt-2 text-3xl">Start with a sample still</h3>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.src}
                  type="button"
                  onClick={() => void runSample(sample)}
                  className="group overflow-hidden rounded-[24px] border border-line text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sample.src} alt={sample.title} className="h-44 w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="p-4">
                    <p className="text-sm text-mist">{sample.title}</p>
                    <p className="text-xs text-mute">{sample.caption}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.3em] text-gold uppercase">Print library</p>
                <h3 className="font-display mt-2 text-3xl">{photos.length} graded frame{photos.length === 1 ? "" : "s"}</h3>
              </div>
              <a href="/api/photos/zip" className="text-sm text-gold">
                Zip the whole roll →
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => {
                const active = selected?.id === photo.id;
                return (
                  <article
                    key={photo.id}
                    className={`overflow-hidden rounded-[24px] border ${active ? "border-gold/50" : "border-line"} bg-black/30`}
                  >
                    <button type="button" onClick={() => setSelectedId(photo.id)} className="block w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.thumbUrl} alt={photo.originalName} className="h-52 w-full object-cover" />
                    </button>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-mist">{photo.originalName}</p>
                        <p className="mt-1 text-[11px] text-mute">
                          {formatResolution(photo.originalWidth, photo.originalHeight)} →{" "}
                          {formatResolution(photo.upscaledWidth, photo.upscaledHeight)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/api/photos/${photo.id}/download?variant=upscaled`}
                          className="rounded-full border border-gold/30 px-3 py-1 text-[11px] text-gold"
                        >
                          4K
                        </a>
                        <button
                          type="button"
                          onClick={() => void removePhoto(photo.id)}
                          className="rounded-full border border-line px-3 py-1 text-[11px] text-mute"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <footer className="relative z-10 border-t border-line px-6 py-10 text-center text-xs tracking-[0.2em] text-mute uppercase">
        Lumina Lab · HD to 4K HDR finishing · Masters stay on this machine
      </footer>
    </div>
  );
}

function StatusChip({ status }: { status: QueueItem["status"] }) {
  if (status === "working") {
    return (
      <span className="flex items-center gap-2 text-[11px] tracking-[0.16em] text-gold uppercase">
        <span className="spin-slow inline-block h-3 w-3 rounded-full border border-gold/30 border-t-gold" />
        Grading
      </span>
    );
  }
  if (status === "done") {
    return <span className="text-[11px] tracking-[0.16em] text-teal uppercase">Ready</span>;
  }
  if (status === "error") {
    return <span className="text-[11px] tracking-[0.16em] text-red-300 uppercase">Failed</span>;
  }
  return <span className="text-[11px] tracking-[0.16em] text-mute uppercase">Queued</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-black/30 px-4 py-3">
      <p className="text-[10px] tracking-[0.2em] text-mute uppercase">{label}</p>
      <p className="mt-1 text-sm text-mist">{value}</p>
    </div>
  );
}

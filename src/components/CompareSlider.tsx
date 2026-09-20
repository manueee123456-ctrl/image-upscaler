"use client";

import { useCallback, useRef, useState } from "react";

type CompareSliderProps = {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
};

export function CompareSlider({
  before,
  after,
  beforeLabel = "1080p HD",
  afterLabel = "4K HDR",
  alt = "Before and after comparison",
}: CompareSliderProps) {
  const [pos, setPos] = useState(54);
  const frame = useRef<HTMLDivElement>(null);

  const move = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(97, Math.max(3, next)));
  }, []);

  return (
    <div
      ref={frame}
      className="relative aspect-[16/10] w-full cursor-ew-resize overflow-hidden bg-black select-none"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>
      <div className="absolute inset-y-0 z-10 w-px bg-gold-bright" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold/70 bg-ink/80 text-gold shadow-[0_0_24px_rgba(224,192,122,0.35)]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M6 4L2 9l4 5M12 4l4 5-4 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      </div>
      <span className="absolute top-4 left-4 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] tracking-[0.22em] text-mist uppercase">
        {beforeLabel}
      </span>
      <span className="absolute top-4 right-4 rounded-full border border-gold/30 bg-gold/15 px-3 py-1 text-[10px] tracking-[0.22em] text-gold-bright uppercase">
        {afterLabel}
      </span>
    </div>
  );
}

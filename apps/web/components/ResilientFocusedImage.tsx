"use client";

import { ImageOff, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type ResilientFocusedImageProps = {
  src: string;
  alt: string;
  zoom: number;
  preloadUrls?: string[];
  maxRetries?: number;
};

type PanPosition = {
  x: number;
  y: number;
};

function retryableImageUrl(src: string, attempt: number): string {
  if (attempt === 0 || src.startsWith("data:")) {
    return src;
  }

  try {
    const base = typeof window === "undefined" ? "https://rentorbit.local" : window.location.origin;
    const parsedUrl = new URL(src, base);
    parsedUrl.searchParams.set("ro_retry", String(attempt));

    if (src.startsWith("/")) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return parsedUrl.toString();
  } catch {
    return `${src}${src.includes("?") ? "&" : "?"}ro_retry=${attempt}`;
  }
}

export function ResilientFocusedImage({
  src,
  alt,
  zoom,
  preloadUrls = [],
  maxRetries = 3
}: ResilientFocusedImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [autoRetries, setAutoRetries] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: PanPosition;
  } | null>(null);
  const imageSrc = useMemo(() => retryableImageUrl(src, attempt), [attempt, src]);
  const canPan = loaded && !failed && zoom > 1;

  useEffect(() => {
    setAttempt(0);
    setAutoRetries(0);
    setLoaded(false);
    setFailed(false);
    setPan({ x: 0, y: 0 });
    setImageSize(null);
    setIsDragging(false);
    dragRef.current = null;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [src]);

  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
      return;
    }

    setPan((current) => clampPan(current, zoom));
  }, [imageSize, zoom]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      setPan((current) => clampPan(current, zoom));
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [zoom]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const preloaders = preloadUrls
      .filter((url) => url && url !== src)
      .slice(0, 2)
      .map((url) => {
        const image = new window.Image();
        image.decoding = "async";
        image.src = url;
        return image;
      });

    return () => {
      preloaders.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [preloadUrls, src]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  function scheduleRetry() {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    if (autoRetries >= maxRetries) {
      setFailed(true);
      setLoaded(false);
      return;
    }

    const retryDelayMs = 450 * (autoRetries + 1);
    retryTimerRef.current = setTimeout(() => {
      setLoaded(false);
      setFailed(false);
      setAutoRetries((current) => current + 1);
      setAttempt((current) => current + 1);
    }, retryDelayMs);
  }

  function manualRetry() {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setLoaded(false);
    setFailed(false);
    setPan({ x: 0, y: 0 });
    setAutoRetries(0);
    setAttempt((current) => current + 1);
  }

  function clampPan(nextPan: PanPosition, nextZoom = zoom): PanPosition {
    const container = containerRef.current;

    if (!container || !imageSize || nextZoom <= 1) {
      return { x: 0, y: 0 };
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (!containerWidth || !containerHeight || !imageSize.width || !imageSize.height) {
      return { x: 0, y: 0 };
    }

    const imageRatio = imageSize.width / imageSize.height;
    const containerRatio = containerWidth / containerHeight;
    const fittedWidth = imageRatio > containerRatio ? containerWidth : containerHeight * imageRatio;
    const fittedHeight = imageRatio > containerRatio ? containerWidth / imageRatio : containerHeight;
    const maxX = Math.max(0, (fittedWidth * (nextZoom - 1)) / 2);
    const maxY = Math.max(0, (fittedHeight * (nextZoom - 1)) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, nextPan.x)),
      y: Math.min(maxY, Math.max(-maxY, nextPan.y))
    };
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canPan) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan
    };
    setIsDragging(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setPan(
      clampPan({
        x: drag.origin.x + event.clientX - drag.startX,
        y: drag.origin.y + event.clientY - drag.startY
      })
    );
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
    setPan((current) => clampPan(current));
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${
        canPan ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onLostPointerCapture={() => {
        dragRef.current = null;
        setIsDragging(false);
      }}
      style={{ touchAction: canPan ? "none" : "auto" }}
      title={canPan ? "Drag to inspect the zoomed image" : undefined}
    >
      {!loaded && !failed ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-orbit-field">
          <div className="rounded-[22px] bg-orbit-panel/82 px-5 py-4 text-center shadow-[0_16px_34px_rgba(25,32,29,0.12)] backdrop-blur-md">
            <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#806A00]" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-orbit-ink/62">
              Loading image
            </p>
          </div>
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-orbit-field">
          <div className="max-w-[280px] rounded-[24px] bg-orbit-panel/88 px-6 py-5 text-center shadow-[0_16px_34px_rgba(25,32,29,0.12)] backdrop-blur-md">
            <ImageOff className="mx-auto h-8 w-8 text-orbit-ink/58" aria-hidden="true" />
            <p className="mt-3 text-sm font-black text-orbit-ink">Image unavailable</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-orbit-ink/58">
              The image source did not respond. You can retry without closing this listing.
            </p>
            <button
              type="button"
              onClick={manualRetry}
              className="orbit-cta-gold mt-4 inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-black"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry image
            </button>
          </div>
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={(event) => {
            setLoaded(true);
            setFailed(false);
            setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight
            });
          }}
          onError={scheduleRetry}
          draggable={false}
          className={`h-full w-full select-none object-contain transition-opacity duration-200 ease-out ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
            transitionProperty: isDragging ? "opacity" : "opacity, transform"
          }}
        />
      )}
    </div>
  );
}

"use client";

// "Media" component: responsive <picture> (or looping <video>) inside an aspect box,
// with a black cover that fades out once the asset is ready.

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MediaItem } from "@/lib/content";
import { getRuntime } from "@/lib/runtime";

type VideoSource = {
  mp4high?: string;
  mp4medium?: string;
  mp4low?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
};

type Props = {
  item?: (Omit<MediaItem, "video"> & { video?: VideoSource | null }) | null;
  aspect?: number | boolean;
  background?: boolean;
  contain?: boolean;
  fit?: boolean;
  sound?: boolean;
  observe?: boolean;
  high?: boolean;
  src?: string | null;
  alt?: string;
  className?: string;
  children?: ReactNode;
};

export default function Media({
  item = null,
  aspect = true,
  background = true,
  contain = false,
  fit = false,
  sound = false,
  observe = true,
  high = false,
  src = null,
  alt = "",
  className,
  children,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [complete, setComplete] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const imgEl = useRef<HTMLImageElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);

  const video = item?.video || null;
  const image = item?.responsiveImage;
  const srcIsVideo = !!src && /\.(mp4|webm|ogg)$/i.test(src);
  const hasVideo = !!(srcIsVideo || video?.mp4high || video?.mp4medium || video?.mp4low) && !lowPower;
  const videoSrc = srcIsVideo
    ? src
    : video
      ? high
        ? video.mp4high || video.mp4medium || video.mp4low
        : video.mp4medium || video.mp4low
      : null;
  const videoFallback = !!video && !hasVideo;
  const imageSrc = src || (videoFallback ? video?.thumbnailUrl : image?.src);
  const ratio =
    typeof aspect === "number"
      ? aspect
      : aspect === false
        ? null
        : (hasVideo && video?.width && video?.height) || (videoFallback && video?.width && video?.height)
          ? video!.height! / video!.width!
          : image?.aspectRatio
            ? 1 / image.aspectRatio
            : item?.width && item?.height
              ? item.height / item.width
              : 0.5625;

  useEffect(() => {
    setLowPower(getRuntime().device.features.lowPowerMode ?? false);
    const img = imgEl.current;
    if (img) {
      if (img.complete) {
        setComplete(true);
        setLoaded(true);
      } else img.onload = () => setLoaded(true);
    }
    const v = videoEl.current;
    if (v) {
      if (v.readyState >= 3) setLoaded(true);
      else v.addEventListener("canplay", () => setLoaded(true), { once: true });
    }
  }, []);

  useEffect(() => {
    const v = videoEl.current;
    if (!v || !observe) return;
    const { observeVid } = getRuntime();
    observeVid.observe(v);
    return () => observeVid.unobserve(v);
  }, [observe, hasVideo]);

  if (!item && !src) return null;

  const classes = [
    "media",
    contain ? "media-contain" : fit ? "media-fit" : "media-fill",
    aspect ? "relative" : "absolute inset-0",
    loaded && !complete && "is-loaded",
    complete && "is-complete",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure className={classes}>
      {aspect ? <div className="aspect media__aspect" style={{ ["--aspect" as string]: `${ratio}` }} /> : null}
      {hasVideo && observe ? (
        <video ref={videoEl} src={videoSrc ?? undefined} muted={!sound} loop playsInline />
      ) : null}
      {hasVideo && !observe ? (
        <video ref={videoEl} src={videoSrc ?? undefined} muted={!sound} loop autoPlay playsInline />
      ) : null}
      {!hasVideo ? (
        <picture className="media__picture">
          {!videoFallback && !src ? (
            <source srcSet={image?.webpSrcSet || ""} sizes={image?.sizes || ""} type="image/webp" />
          ) : null}
          {!videoFallback && !src ? (
            <source srcSet={image?.srcSet || ""} sizes={image?.sizes || ""} type="image/jpeg" />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgEl}
            src={imageSrc ?? undefined}
            width={image?.width}
            height={image?.height}
            alt={image?.alt ?? alt}
            title={image?.title ?? undefined}
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </picture>
      ) : null}
      {background && !hasVideo ? <div className="media__bg" /> : null}
      {children}
    </figure>
  );
}

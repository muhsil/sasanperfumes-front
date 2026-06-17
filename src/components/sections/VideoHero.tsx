"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Play, Volume2, VolumeX } from "lucide-react";
import type { Locale } from "@/config/site";

interface VideoHeroConfig {
  enabled: boolean; video_url: string; poster_url: string;
  title_en: string; title_ar: string; subtitle_en: string; subtitle_ar: string;
  btn_text_en: string; btn_text_ar: string; btn_url: string;
  autoplay: boolean; muted: boolean;
}

function isYoutube(url: string) { return url.includes("youtube.com") || url.includes("youtu.be"); }
function isVimeo(url: string)   { return url.includes("vimeo.com"); }

function getYoutubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}
function getVimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : "";
}

export function VideoHero({ locale }: { locale: Locale }) {
  const [config, setConfig] = useState<VideoHeroConfig | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAr = locale === "ar";

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_WC_API_URL || ""}/wp-json/sasanperfumes/v1/video-hero`)
      .then((r) => r.json())
      .then((d: VideoHeroConfig) => { if (d?.enabled) { setConfig(d); setMuted(d.muted ?? true); } })
      .catch(() => {});
  }, []);

  if (!config?.enabled || !config.video_url) return null;

  const title    = isAr ? config.title_ar    : config.title_en;
  const subtitle = isAr ? config.subtitle_ar : config.subtitle_en;
  const btnText  = isAr ? config.btn_text_ar : config.btn_text_en;

  const isYT = isYoutube(config.video_url);
  const isVM = isVimeo(config.video_url);
  const isMp4 = !isYT && !isVM;

  return (
    <section className="relative h-[80vh] min-h-[500px] overflow-hidden bg-black" dir={isAr ? "rtl" : "ltr"}>
      {/* Video */}
      {isMp4 ? (
        <video
          ref={videoRef}
          src={config.video_url}
          poster={config.poster_url}
          autoPlay={config.autoplay}
          muted={muted}
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      ) : isYT ? (
        <iframe
          src={`https://www.youtube.com/embed/${getYoutubeId(config.video_url)}?autoplay=${config.autoplay ? 1 : 0}&mute=1&loop=1&controls=0&playlist=${getYoutubeId(config.video_url)}`}
          className="absolute inset-0 h-full w-full scale-150 object-cover opacity-70"
          allow="autoplay; encrypted-media"
          title="Hero video"
        />
      ) : isVM ? (
        <iframe
          src={`https://player.vimeo.com/video/${getVimeoId(config.video_url)}?autoplay=${config.autoplay ? 1 : 0}&muted=1&loop=1&background=1`}
          className="absolute inset-0 h-full w-full scale-150 object-cover opacity-70"
          allow="autoplay; fullscreen"
          title="Hero video"
        />
      ) : null}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
        {title && (
          <h1 className="mb-3 max-w-2xl text-2xl font-bold leading-tight sm:text-4xl">{title}</h1>
        )}
        {subtitle && (
          <p className="mb-8 max-w-lg text-sm opacity-90 sm:text-lg">{subtitle}</p>
        )}
        {btnText && config.btn_url && (
          <Link
            href={config.btn_url}
            className="rounded-xl border-2 border-white px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white hover:text-brand-primary transition-colors"
          >
            {btnText}
          </Link>
        )}
      </div>

      {/* Controls for mp4 */}
      {isMp4 && (
        <div className="absolute bottom-4 flex gap-2 ltr:right-4 rtl:left-4">
          <button
            onClick={() => {
              if (videoRef.current) {
                playing ? videoRef.current.pause() : videoRef.current.play();
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setMuted((m) => !m);
              if (videoRef.current) videoRef.current.muted = !muted;
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useRef } from 'react';

// The source frame (1600x894) is bottom-weighted: the bull spans y 334-820
// on a near-white bg matching the page bg (#fff). The aspect-locked crop
// (1600/586 at object-position center 86%) shows y 264-850 — the whole bull
// with a thin margin above the horns for the top fade and a thin margin
// below the shadow, no dead band under him. The video's own white blends at
// every unmasked edge, so only the top needs the fade.
//
// React drops the `muted` attribute during SSR, which makes Chrome refuse
// autoplay — raw HTML keeps it in the server-rendered markup.
//
// The band sits below the fold, and Chrome suppresses attribute-triggered
// autoplay for <video> elements outside the initial viewport — even fully
// buffered ones. A scripted play() call isn't subject to that suppression,
// so the mount effect below nudges playback explicitly.
export function HeroAmbientVideo(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = containerRef.current?.querySelector('video');
    if (!video) {
      return;
    }

    const play = () => {
      video.play().catch(() => undefined);
    };

    play();
    video.addEventListener('loadeddata', play);
    return () => {
      video.removeEventListener('loadeddata', play);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="mt-8 aspect-[1600/586] w-full sm:mt-12"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
      }}
    >
      <div
        ref={containerRef}
        className="h-full w-full motion-reduce:hidden"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static markup, no user input
        dangerouslySetInnerHTML={{
          __html: `
            <video autoplay loop muted playsinline preload="auto"
              poster="/landing/video/hero-ambient-poster.webp"
              style="width:100%;height:100%;object-fit:cover;object-position:center 86%;display:block">
              <source src="/landing/video/hero-ambient-loop.webm" type="video/webm" />
              <source src="/landing/video/hero-ambient-loop.mp4" type="video/mp4" />
            </video>`,
        }}
      />
      <img
        src="/landing/video/hero-ambient-poster.webp"
        alt=""
        className="hidden h-full w-full object-cover object-[center_86%] motion-reduce:block"
      />
    </div>
  );
}

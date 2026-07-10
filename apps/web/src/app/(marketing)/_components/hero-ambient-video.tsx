// The source frame (1600x894) is bottom-weighted: the bull's horns start at
// ~37% down and its shadow ends flush with the frame's near-white bg, which
// matches the page bg (#fff) — so an aspect-locked, bottom-anchored crop
// shows the whole bull at every width with no crop into it and no visible
// seam at the bottom edge. Only the blank top needs the fade.
//
// React drops the `muted` attribute during SSR, which makes Chrome refuse
// autoplay — raw HTML keeps it in the server-rendered markup.
export function HeroAmbientVideo(): React.ReactElement {
  return (
    <div
      aria-hidden
      className="-mt-6 aspect-[1600/630] w-full sm:-mt-8"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
      }}
    >
      <div
        className="h-full w-full motion-reduce:hidden"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static markup, no user input
        dangerouslySetInnerHTML={{
          __html: `
            <video autoplay loop muted playsinline preload="auto"
              poster="/landing/video/hero-ambient-poster.webp"
              style="width:100%;height:100%;object-fit:cover;object-position:center bottom;display:block">
              <source src="/landing/video/hero-ambient-loop.webm" type="video/webm" />
              <source src="/landing/video/hero-ambient-loop.mp4" type="video/mp4" />
            </video>`,
        }}
      />
      <img
        src="/landing/video/hero-ambient-poster.webp"
        alt=""
        className="hidden h-full w-full object-cover object-bottom motion-reduce:block"
      />
    </div>
  );
}

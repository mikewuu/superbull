// React drops the `muted` attribute during SSR, which makes Chrome refuse
// autoplay — raw HTML keeps it in the server-rendered markup.
export function ChargeLoopVideo(): React.ReactElement {
  return (
    <div
      aria-hidden
      className="h-full w-full"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static markup, no user input
      dangerouslySetInnerHTML={{
        __html: `
          <video autoplay loop muted playsinline preload="auto"
            poster="/landing/video/charge-loop-poster.webp"
            style="width:100%;height:100%;object-fit:cover;display:block">
            <source src="/landing/video/charge-loop.webm" type="video/webm" />
            <source src="/landing/video/charge-loop.mp4" type="video/mp4" />
          </video>`,
      }}
    />
  );
}

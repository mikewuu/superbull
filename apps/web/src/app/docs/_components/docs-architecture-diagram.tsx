export function DocsArchitectureDiagram() {
  return (
    <figure className="mt-6 rounded-xl border border-border-subtle bg-bg-muted p-6">
      <figcaption className="font-mono text-[11px] tracking-wide text-content-muted uppercase">
        topology
      </figcaption>
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-5">
        <div className="flex w-full flex-col gap-4 sm:w-auto">
          <div className="mx-auto w-full max-w-[260px] rounded-lg border border-border-subtle bg-bg-default p-3">
            <p className="font-mono text-[11px] font-medium text-content-emphasis">your app</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="rounded border border-border-subtle bg-bg-muted px-2 py-1 text-center font-mono text-[10px] text-content-default">
                @superbull/express
              </div>
              <div className="rounded border border-border-subtle bg-bg-muted px-2 py-1 text-center font-mono text-[10px] text-content-default">
                board + API
              </div>
            </div>
            <p className="mt-2 text-center font-mono text-[10px] text-content-muted">in-process</p>
          </div>

          <div className="mx-auto flex w-full max-w-[260px] items-center gap-1.5">
            <div className="flex-1 rounded-lg border border-border-subtle bg-bg-default p-3 text-center">
              <p className="font-mono text-[11px] font-medium text-content-emphasis">workers</p>
              <p className="mt-1 font-mono text-[10px] text-content-muted">no UI</p>
            </div>
            <span aria-hidden className="font-mono text-[11px] text-content-muted">
              →
            </span>
            <div className="flex-1 rounded-lg border border-border-subtle bg-bg-default p-3 text-center">
              <p className="font-mono text-[11px] font-medium text-content-emphasis">connector</p>
              <p className="mt-1 font-mono text-[10px] text-content-muted">no inbound port</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-content-muted">
          <span aria-hidden className="font-mono text-base sm:hidden">
            ↓
          </span>
          <span aria-hidden className="hidden font-mono text-base sm:inline">
            →
          </span>
          <p className="font-mono text-[10px] text-content-subtle">outbound WS</p>
          <p className="font-mono text-[10px] text-content-subtle">one-time token</p>
        </div>

        <div className="mx-auto w-full max-w-[200px] rounded-lg border border-border-emphasis bg-bg-default p-4 text-center sm:mx-0">
          <p className="font-mono text-[11px] font-medium text-content-emphasis">
            connect.superbull.com
          </p>
          <p className="mt-1 font-mono text-[10px] text-content-muted">gateway + hub</p>
        </div>
      </div>
    </figure>
  );
}

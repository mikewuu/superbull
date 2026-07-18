const tree = `superbull/
├── packages/
│   ├── api/       adapter interfaces, createBoard()
│   ├── react/     the dashboard UI
│   ├── connector/ outbound WS agent, no inbound port
│   ├── express/
│   ├── fastify/
│   ├── hono/
│   ├── koa/
│   ├── h3/
│   ├── hapi/
│   ├── elysia/
│   ├── bun/
│   └── nestjs/
└── apps/
    ├── web/       hosted app: projects, alerts, analytics, status pages
    └── gateway/   WebSocket termination for connectors`;

export function RepoTreeCard(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-inverted shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-2 font-mono text-xs text-white/40">$ tree -L 2 superbull</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-white/85">
        {tree}
      </pre>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="font-mono text-xs text-white/40">LICENSE</p>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-white/70">
          MIT License.
          <br />
          Server-adapter architecture derived from bull-board, also MIT licensed.
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 text-center">
        <div className="px-3 py-4">
          <p className="font-mono text-lg font-semibold text-white">9</p>
          <p className="mt-1 text-xs text-white/40">server adapters</p>
        </div>
        <div className="px-3 py-4">
          <p className="font-mono text-lg font-semibold text-white">400+</p>
          <p className="mt-1 text-xs text-white/40">tests</p>
        </div>
        <div className="px-3 py-4">
          <p className="font-mono text-lg font-semibold text-white">MIT</p>
          <p className="mt-1 text-xs text-white/40">license</p>
        </div>
      </div>
    </div>
  );
}

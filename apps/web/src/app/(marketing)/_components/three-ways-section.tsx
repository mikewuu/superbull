import { AdapterInstallPanel } from './adapter-install-panel';
import { CopyButton } from './copy-button';

const runCommand =
  'npx @superbull/connector \\\n  --token $SUPERBULL_TOKEN \\\n  --queues my-queue,other-queue \\\n  --redis-host redis.internal';

const connectedOutput =
  '✓ connected to wss://connect.superbull.com\n✓ watching 2 queues, live in the dashboard';

const enrollNote =
  'Connectors → New connector in your workspace\n→ copy the one-time token it shows you\n→ paste it into --token above';

export function ThreeWaysSection(): React.ReactElement {
  return (
    <section className="border-y border-border-subtle bg-bg-muted px-4 py-24 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-2sm text-content-subtle">02 / three ways to run it</p>
        <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
          Embed it, connect it,
          <br />
          <span className="text-content-muted">or watch a whole fleet.</span>
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <div className="flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-bg-default p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-content-emphasis">Embed</h3>
              <p className="mt-2 text-2sm leading-6 text-content-default">
                Mount an adapter in your own app. The board and the REST API share your process and
                your queues. Pick your framework.
              </p>
              <div className="mt-5 min-w-0 flex-1">
                <AdapterInstallPanel />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-bg-default p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-content-emphasis">Connector</h3>
              <p className="mt-2 text-2sm leading-6 text-content-default">
                Run one command next to your workers. No inbound port, no public URL: it opens one
                outbound connection and nothing else.
              </p>
              <div className="mt-5 flex min-w-0 flex-1 flex-col gap-3">
                <div className="relative overflow-hidden rounded-xl bg-bg-inverted">
                  <div className="flex items-center justify-between px-4 pt-3">
                    <span className="font-mono text-xs text-white/40">run it</span>
                    <CopyButton text={runCommand} />
                  </div>
                  <pre className="px-4 pb-4 pt-1.5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all text-white/85">
                    {runCommand}
                  </pre>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-bg-inverted">
                  <div className="flex items-center justify-between px-4 pt-3">
                    <span className="font-mono text-xs text-white/40">on connect</span>
                  </div>
                  <pre className="px-4 pb-4 pt-1.5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all text-candy-green/80">
                    {connectedOutput}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border-subtle bg-bg-default p-6 shadow-sm lg:col-span-1">
            <h3 className="text-lg font-semibold text-content-emphasis">Hub</h3>
            <p className="mt-2 text-2sm leading-6 text-content-default">
              Sign in, and every connector in your workspace gets history, analytics, error
              tracking, email alerts, and a public status page.
            </p>
          </div>
          <div className="relative min-w-0 lg:col-span-2">
            <pre className="overflow-x-auto rounded-2xl bg-bg-inverted p-5 font-mono text-[12.5px] leading-relaxed text-white/85">
              {enrollNote}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

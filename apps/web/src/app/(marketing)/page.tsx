import Image from 'next/image';
import { AdapterInstallPanel } from './_components/adapter-install-panel';
import { ChargeLoopVideo } from './_components/charge-loop-video';
import { CopyButton } from './_components/copy-button';
import { InstallCommand } from './_components/install-command';
import { NavBar } from './_components/nav-bar';
import { Reveal } from './_components/reveal';
import { SectionHeader } from './_components/section-header';

const githubUrl = 'https://github.com/mikewu/superbull';

const metrics = [
  { value: '9', label: 'framework adapters — one import away' },
  { value: '8', label: 'MCP tools your agent can call' },
  { value: '1 command', label: 'headless proxy, no code changes' },
  { value: 'MIT', label: 'free, self-hosted, no seat limits' },
];

const mcpTools = [
  ['list_sources', 'List the proxy sources the hub federates, without their bearer tokens'],
  ['add_source', 'Register a remote proxy; stores its token, never returns it'],
  ['remove_source', 'Remove a proxy source the hub federates'],
  ['list_queues', 'Queue names, counts, and paused state for one source'],
  ['get_queue', "One queue's current page of jobs, filtered by status"],
  ['retry_job', 'Retry a failed or completed job'],
  ['pause_queue', "Stop a queue's processing"],
  ['resume_queue', 'Resume a paused queue'],
] as const;

const faqs = [
  {
    q: 'Do I need the hub to use SuperBull?',
    a: 'No. Mount an adapter in your app and you have a full board and REST API in one process. The hub is only for federating multiple proxy sources behind one login, with history, alerts, and status pages.',
  },
  {
    q: 'Is bullmq bundled with SuperBull?',
    a: "No — it's a peerDependency. SuperBull calls your app's own Queue instance, so retries, promotes, and removes always run against the exact BullMQ version your workers use.",
  },
  {
    q: 'Does this replace bull-board?',
    a: "It forks bull-board's adapter architecture (credited, MIT) and rebuilds the UI on top: faceted filters, bulk actions, a timeline waterfall, metrics, redaction hooks, and an MCP server bull-board doesn't have.",
  },
  {
    q: 'Can an agent operate my queues directly?',
    a: 'Yes. The hub exposes 8 MCP tools — list and get queues, retry a job, pause or resume — the same actions a human gets from the board, reachable by anything that speaks MCP.',
  },
];

export default function LandingPage(): React.ReactElement {
  return (
    <main className="overflow-x-clip bg-bg-default">
      <NavBar />

      {/* hero */}
      <section id="install" className="scroll-mt-16 px-4 pt-16 pb-24 sm:px-6 sm:pt-20 sm:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-muted px-3 py-1 text-2sm font-semibold text-content-default">
            Open source · MIT licensed
          </span>
          <h1 className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight text-content-emphasis sm:text-6xl">
            See every job.
            <br />
            Fix what&apos;s stuck.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-content-default">
            SuperBull is an open-source dashboard for BullMQ: a dense runs table, full job
            timelines, one-click retries, and alerts — wired straight into the queues you already
            run.
          </p>
          <div className="mx-auto mt-8 max-w-md">
            <InstallCommand />
          </div>
          <p className="mt-4 text-2sm text-content-subtle">
            MIT licensed · your Redis, your data · no seat limits ·{' '}
            <a
              href="/docs"
              className="font-medium text-content-emphasis underline underline-offset-4"
            >
              read the docs
            </a>
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <Image
            src="/landing/mascot/bull-peek.webp"
            alt=""
            aria-hidden
            width={112}
            height={112}
            className="bull-bob absolute -top-11 right-8 z-10 w-20 select-none sm:-top-14 sm:right-16 sm:w-24"
          />
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-default shadow-[0_30px_80px_-30px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-1.5 border-b border-border-subtle bg-bg-muted px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
              <span className="ml-2 rounded-md bg-bg-default px-2.5 py-0.5 text-2sm text-content-subtle ring-1 ring-border-subtle">
                localhost:3333
              </span>
            </div>
            <Image
              src="/landing/screenshots/overview.webp"
              alt="SuperBull overview page: throughput chart, per-queue workload, and Redis stats"
              width={2000}
              height={1250}
              className="w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* metrics */}
      <section className="border-y border-border-subtle bg-bg-muted py-12">
        <Reveal>
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 text-center sm:px-6 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="text-4xl font-semibold tracking-tight text-content-emphasis">
                  {metric.value}
                </div>
                <div className="mt-1.5 text-2sm text-content-subtle">{metric.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* problem */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <Reveal>
          <SectionHeader
            center
            kicker="The problem"
            l1="BullMQ ships the queue."
            l2="Not the dashboard."
            sub="You get getJobs() and a Redis key nobody's supposed to touch by hand. Every team writes the same page: a table, a retry button, a chart if someone has time. bull-board covers the basics and stalls at a job list. SuperBull is the rest of that dashboard, already built."
          />
        </Reveal>
      </section>

      {/* three ways to run it */}
      <section className="border-y border-border-subtle bg-bg-muted px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeader
              kicker="Three ways to run it"
              l1="Embed it, proxy it,"
              l2="or federate a whole fleet."
            />
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Reveal className="min-w-0 lg:col-span-2">
              <div className="flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-bg-default p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-content-emphasis">Embed</h3>
                <p className="mt-2 text-2sm leading-6 text-content-default">
                  Mount an adapter in your own app. The board and the REST API share your process
                  and your queues — pick your framework.
                </p>
                <div className="mt-5 min-w-0 flex-1">
                  <AdapterInstallPanel />
                </div>
              </div>
            </Reveal>

            <Reveal className="min-w-0" delay={100}>
              <div className="flex h-full min-w-0 flex-col rounded-2xl border border-border-subtle bg-bg-default p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-content-emphasis">Proxy</h3>
                <p className="mt-2 text-2sm leading-6 text-content-default">
                  Run one command next to your workers. No UI, no code changes, bearer-token auth,
                  an open <code className="font-mono text-content-emphasis">/healthz</code>.
                </p>
                <div className="relative mt-5 min-w-0 flex-1">
                  <div className="absolute top-3 right-3">
                    <CopyButton
                      text={
                        'npx superbull-proxy \\\n  -n "my-app" -t $SUPERBULL_TOKEN \\\n  --queues my-queue,other-queue \\\n  --hub https://hub.example.com --hub-token $HUB_API_TOKEN'
                      }
                    />
                  </div>
                  <pre className="h-full overflow-x-auto rounded-xl bg-bg-inverted p-5 font-mono text-[12.5px] leading-relaxed text-white/85">
                    {`npx superbull-proxy \\
  -n "my-app" -t $SUPERBULL_TOKEN \\
  --queues my-queue,other-queue \\
  --hub https://hub.example.com --hub-token $HUB_API_TOKEN`}
                  </pre>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-border-subtle bg-bg-default p-6 shadow-sm lg:col-span-1">
                <h3 className="text-lg font-semibold text-content-emphasis">Hub</h3>
                <p className="mt-2 text-2sm leading-6 text-content-default">
                  A Next.js app that federates every proxy: history, analytics, error tracking,
                  email alerts, and a public status page per source.
                </p>
              </div>
              <div className="relative min-w-0 lg:col-span-2">
                <div className="absolute top-3 right-3 z-10">
                  <CopyButton
                    text={
                      'curl https://hub.example.com/api/sources \\\n  -H "Authorization: Bearer $HUB_API_TOKEN" \\\n  -d \'{"name":"my-app","url":"https://proxy.example.com","token":"..."}\''
                    }
                  />
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-bg-inverted p-5 font-mono text-[12.5px] leading-relaxed text-white/85">
                  {`curl https://hub.example.com/api/sources \\
  -H "Authorization: Bearer $HUB_API_TOKEN" \\
  -d '{"name":"my-app","url":"https://proxy.example.com","token":"..."}'`}
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* feature stories */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl space-y-24">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h3 className="text-3xl font-semibold tracking-tight text-content-emphasis">
                  A dense runs table, not a job list.
                </h3>
                <p className="mt-4 text-lg leading-8 text-content-default">
                  Every job across every queue, faceted by status, sorted by created or processed
                  time, searchable by name or id. Quick-retry inline, select a page, bulk retry,
                  promote, or remove — the trigger.dev-style table BullMQ never shipped, plus a
                  cmd-K palette to jump anywhere.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border-subtle shadow-sm">
                <Image
                  src="/landing/screenshots/queue-detail.webp"
                  alt="SuperBull queue detail page: dense runs table with status filters and per-minute throughput"
                  width={2000}
                  height={1250}
                  className="w-full"
                />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="order-last overflow-hidden rounded-2xl border border-border-subtle shadow-sm lg:order-first">
                <Image
                  src="/landing/screenshots/job-detail.webp"
                  alt="SuperBull job detail page: timeline waterfall, logs, data, options, and return value"
                  width={2000}
                  height={1250}
                  className="w-full"
                />
              </div>
              <div>
                <h3 className="text-3xl font-semibold tracking-tight text-content-emphasis">
                  The whole story for one job.
                </h3>
                <p className="mt-4 text-lg leading-8 text-content-default">
                  A timeline waterfall shows wait time next to run time. Every attempt keeps its own
                  history, logs, data, options, and return value. Replay opens the same job with an
                  editable payload — no re-triggering blind.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h3 className="text-3xl font-semibold tracking-tight text-content-emphasis">
                  Fix what&apos;s stuck, in bulk.
                </h3>
                <p className="mt-4 text-lg leading-8 text-content-default">
                  Select a page of failed jobs and retry, promote, or remove them together.
                  Data-redaction hooks keep sensitive fields out of the board, and one board reads
                  from multiple Redis instances at once.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <div className="aspect-[16/10] w-full">
                  <ChargeLoopVideo />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* dark band — alerts while you sleep */}
      <section className="bg-bg-inverted px-4 py-24 text-white sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <div>
              <p className="text-2sm font-semibold tracking-[0.14em] text-candy-orange uppercase">
                While you're away
              </p>
              <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
                It keeps watch.
                <br />
                <span className="text-white/50">You get the digest.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg leading-8 text-white/70">
                The hub watches every federated queue for failure spikes, stalled processing, and
                duration regressions. Email alerts fire the moment something breaks; a daily digest
                rounds up what changed overnight.
              </p>
              <Image
                src="/landing/mascot/bull-nightwatch.webp"
                alt=""
                aria-hidden
                width={240}
                height={240}
                className="bull-bob mt-8 w-48"
              />
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Daily digest</span>
                <span className="rounded-full bg-candy-orange/20 px-3 py-1 text-xs font-semibold text-candy-orange">
                  3 alerts
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  'send-emails: 12 jobs failed in the last hour — retry rate under 40%.',
                  'process-videos has been paused for 6 hours. Nobody resumed it.',
                  "sync-contacts: p95 duration jumped from 400ms to 4.1s after last night's deploy.",
                ].map((line) => (
                  <div key={line} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <p className="text-2sm leading-6 text-white/85">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MCP tools */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeader
              center
              kicker="Agent-native"
              l1="Every action is a tool"
              l2="your agent can call."
              sub="The hub speaks MCP over one authenticated endpoint. Give an agent a token and it can list queues, inspect one job, retry it, and pause or resume processing — the same actions a human gets from the board."
            />
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12 divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-bg-default">
              {mcpTools.map(([name, desc]) => (
                <div
                  key={name}
                  className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <code className="shrink-0 font-mono text-2sm font-semibold text-content-emphasis">
                    {name}
                  </code>
                  <span className="text-2sm text-content-subtle">{desc}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* open source */}
      <section className="border-y border-border-subtle bg-bg-muted px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <SectionHeader
                  kicker="Open source"
                  l1="MIT licensed."
                  l2="No seat limits, no pricing page."
                />
                <p className="mt-5 max-w-lg text-lg leading-8 text-content-default">
                  Fork it, self-host it, read every line. SuperBull's adapter architecture is
                  derived from bull-board (MIT, credited in the repo); the board, the proxy, and the
                  hub are all in the same public repository.
                </p>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 inline-flex h-11 items-center rounded-lg bg-brand px-5 text-2sm font-semibold text-white transition-colors hover:bg-brand-deep"
                >
                  View source on GitHub
                </a>
              </div>
              <Image
                src="/landing/mascot/bull-presenting.webp"
                alt=""
                aria-hidden
                width={260}
                height={260}
                className="bull-bob mx-auto w-52"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* faq */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <SectionHeader center kicker="FAQ" l1="Fair questions." />
          </Reveal>
          <div className="mt-12 divide-y divide-border-subtle">
            {faqs.map((item, i) => (
              <Reveal key={item.q} delay={i * 60}>
                <div className="py-6">
                  <h3 className="text-lg font-semibold text-content-emphasis">{item.q}</h3>
                  <p className="mt-2.5 leading-7 text-content-default">{item.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className="border-t border-border-subtle bg-bg-inverted px-4 py-24 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
              See every job.
              <br />
              <span className="text-white/50">Fix what&apos;s stuck.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-white/70">
              One install, and your queues stop being a Redis key you're afraid to touch.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <InstallCommand />
            </div>
            <p className="mt-4 text-2sm text-white/50">
              MIT licensed · self-hosted · your data stays yours
            </p>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-bg-inverted px-4 pb-14 text-white/70 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 border-t border-white/10 pt-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Image src="/landing/logos/logo-mark.webp" alt="" width={22} height={22} />
            <span className="text-base font-semibold text-white">SuperBull</span>
          </div>
          <nav className="flex items-center gap-6 text-2sm">
            <a href="/docs" className="hover:text-white">
              Docs
            </a>
            <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-white">
              GitHub
            </a>
            <span>MIT License</span>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-2sm italic text-white/40">
          SuperBull doesn&apos;t flinch at a wall of failed jobs. — the bull
        </p>
      </footer>
    </main>
  );
}

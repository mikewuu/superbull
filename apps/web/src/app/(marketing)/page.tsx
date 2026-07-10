import Image from 'next/image';
import { AlertTranscript } from './_components/alert-transcript';
import { BoardMockShell } from './_components/board-mock-shell';
import { DiyRealityCard } from './_components/diy-reality-card';
import { FeatureLedger } from './_components/feature-ledger';
import { FinalCta } from './_components/final-cta';
import { HeroAmbientVideo } from './_components/hero-ambient-video';
import { InstallCommand } from './_components/install-command';
import { McpConsole } from './_components/mcp-console';
import { NavBar } from './_components/nav-bar';
import { RepoTreeCard } from './_components/repo-tree-card';
import { Reveal } from './_components/reveal';
import { StatFlood } from './_components/stat-flood';
import { ThreeWaysSection } from './_components/three-ways-section';

const githubUrl = 'https://github.com/mikewu/superbull';

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
      <section
        id="install"
        className="relative isolate scroll-mt-16 overflow-hidden px-4 pt-16 pb-24 sm:px-6 sm:pt-20 sm:pb-28"
      >
        <div className="relative z-10">
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
            <p className="mt-2 text-2sm text-content-muted">
              Works with Express, Fastify, Hono +6 more · BullMQ 5 · 400+ tests
            </p>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
            <Image
              src="/landing/mascot/bull-peek.webp"
              alt=""
              aria-hidden
              width={112}
              height={96}
              unoptimized
              className="bull-bob absolute -top-9 right-10 z-10 w-16 select-none sm:-top-11 sm:right-20 sm:w-20"
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
              <BoardMockShell />
            </div>
          </div>
        </div>

        <HeroAmbientVideo />
      </section>

      {/* problem */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <div>
              <p className="font-mono text-2sm text-content-subtle">01 — the problem</p>
              <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
                BullMQ ships the queue.
                <br />
                <span className="text-content-muted">Not the dashboard.</span>
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-content-default">
                You get getJobs() and a Redis key nobody&apos;s supposed to touch by hand. Every
                team writes the same page: a table, a retry button, a chart if someone has time.
                bull-board covers the basics and stalls at a job list. SuperBull is the rest of that
                dashboard, already built.
              </p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <DiyRealityCard />
          </Reveal>
        </div>
      </section>

      {/* stat flood */}
      <section className="border-y border-border-subtle bg-bg-muted py-16">
        <Reveal>
          <StatFlood />
        </Reveal>
      </section>

      {/* three ways to run it */}
      <Reveal>
        <ThreeWaysSection />
      </Reveal>

      {/* feature deep dive */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-2sm text-content-subtle">03 — what you get</p>

          <div className="mt-10 space-y-24">
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
              <FeatureLedger />
            </Reveal>

            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <h3 className="text-3xl font-semibold tracking-tight text-content-emphasis">
                  Fix what&apos;s stuck, in bulk.
                </h3>
                <p className="mt-4 text-lg leading-8 text-content-default">
                  Select a page of failed jobs and retry, promote, or remove them together.
                  Data-redaction hooks keep sensitive fields out of the board, and one board reads
                  from multiple Redis instances at once.
                </p>
              </div>
              <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-border-subtle shadow-sm">
                <Image
                  src="/landing/screenshots/overview.webp"
                  alt="SuperBull overview page: throughput chart and current workload across queues"
                  width={2000}
                  height={1250}
                  className="w-full"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* alerts — the page's single dark band */}
      <section className="bg-bg-inverted px-4 py-24 text-white sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <div>
              <p className="font-mono text-2sm text-white/40">04 — while you&apos;re away</p>
              <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl">
                It keeps watch.
                <br />
                <span className="text-white/50">You get the alert.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg leading-8 text-white/70">
                The hub watches every federated queue for failure spikes, stalled processing, and
                duration regressions. Email alerts fire the moment something breaks; a daily digest
                rounds up what changed overnight.
              </p>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <AlertTranscript />
          </Reveal>
        </div>
      </section>

      {/* agent-native / mcp */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-mono text-2sm text-content-subtle">05 — agent-native</p>
              <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
                Every action is a tool
                <br />
                <span className="text-content-muted">your agent can call.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-content-default">
                The hub speaks MCP over one authenticated endpoint. Give an agent a token and it can
                list queues, inspect one job, retry it, and pause or resume processing — the same
                actions a human gets from the board.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12">
              <McpConsole />
            </div>
          </Reveal>
        </div>
      </section>

      {/* open source */}
      <section className="border-y border-border-subtle bg-bg-muted px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <div>
              <p className="font-mono text-2sm text-content-subtle">06 — open source</p>
              <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
                MIT licensed.
                <br />
                <span className="text-content-muted">No seat limits, no pricing page.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-content-default">
                Fork it, self-host it, read every line. SuperBull&apos;s adapter architecture is
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
          </Reveal>
          <Reveal delay={140}>
            <RepoTreeCard />
          </Reveal>
        </div>
      </section>

      {/* faq */}
      <section className="px-4 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <div className="text-center">
              <p className="font-mono text-2sm text-content-subtle">FAQ</p>
              <h2 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
                What people ask
                <br />
                <span className="text-content-muted">before they mount it.</span>
              </h2>
            </div>
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

      <FinalCta />

      {/* footer */}
      <footer className="border-t border-border-subtle bg-bg-muted px-4 pt-10 pb-14 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Image src="/landing/logos/logo-mark.webp" alt="" width={22} height={22} />
            <span className="text-base font-semibold text-content-emphasis">SuperBull</span>
          </div>
          <nav className="flex items-center gap-6 text-2sm text-content-subtle">
            <a href="/docs" className="hover:text-content-emphasis">
              Docs
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-content-emphasis"
            >
              GitHub
            </a>
            <span>MIT License</span>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-2sm text-content-muted">
          SuperBull doesn&apos;t flinch at a wall of failed jobs.
        </p>
      </footer>
    </main>
  );
}

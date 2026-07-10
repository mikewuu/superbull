import { InstallCommand } from './install-command';
import { Reveal } from './reveal';

export function FinalCta(): React.ReactElement {
  return (
    <section className="border-t border-border-subtle bg-bg-muted px-4 py-24 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <h2 className="text-4xl leading-[1.08] font-semibold tracking-tight text-content-emphasis sm:text-5xl">
            See every job.
            <br />
            <span className="text-content-muted">Fix what&apos;s stuck.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-content-default">
            One install, and your queues stop being a Redis key you&apos;re afraid to touch.
          </p>
          <div className="mx-auto mt-8 max-w-md">
            <InstallCommand />
          </div>
          <p className="mt-4 text-2sm text-content-subtle">
            MIT licensed · self-hosted · your data stays yours ·{' '}
            <a
              href="/docs"
              className="font-medium text-content-emphasis underline underline-offset-4"
            >
              read the docs
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

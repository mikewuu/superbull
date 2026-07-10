import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';

const components = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mt-0 text-3xl font-semibold tracking-tight text-content-emphasis" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="mt-12 border-t border-border-subtle pt-8 text-xl font-semibold text-content-emphasis first:mt-0 first:border-t-0 first:pt-0"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="mt-8 text-base font-semibold text-content-emphasis" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mt-4 text-sm leading-6 text-content-default" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul
      className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-6 text-content-default"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol
      className="mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-content-default"
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => (
    <li className="marker:text-content-muted" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="font-medium text-content-emphasis underline underline-offset-2" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold text-content-emphasis" {...props} />
  ),
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="mt-4 overflow-x-auto rounded-lg border border-border-subtle bg-bg-inverted p-4 text-[13px] leading-6 text-neutral-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code
      className="rounded border border-border-subtle bg-bg-subtle px-1.5 py-0.5 font-mono text-[0.85em] text-content-emphasis"
      {...props}
    />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="mt-4 border-l-2 border-border-emphasis pl-4 text-sm leading-6 text-content-subtle"
      {...props}
    />
  ),
  hr: (props: ComponentPropsWithoutRef<'hr'>) => (
    <hr className="mt-10 border-border-subtle" {...props} />
  ),
};

export function DocsMarkdown(props: { content: string }) {
  const { content } = props;
  return (
    <div className="first:[&>*]:mt-0">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}

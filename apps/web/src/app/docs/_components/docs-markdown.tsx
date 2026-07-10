import { isValidElement } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { slugify } from '../_lib/slugify';

function getPlainText(node: ReactNode): string {
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getPlainText).join('');
  }
  if (isValidElement(node)) {
    return getPlainText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

const components = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mt-0 text-3xl font-semibold tracking-tight text-content-emphasis" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      id={slugify(getPlainText(props.children))}
      className="mt-14 border-t border-border-subtle pt-9 text-xl font-semibold text-content-emphasis first:mt-0 first:border-t-0 first:pt-0"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3
      id={slugify(getPlainText(props.children))}
      className="mt-10 text-base font-semibold text-content-emphasis"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mt-5 text-sm leading-7 text-content-default" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul
      className="mt-5 list-disc space-y-2 pl-5 text-sm leading-7 text-content-default"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol
      className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-7 text-content-default"
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
      className="mt-5 overflow-x-auto rounded-lg border border-border-subtle bg-bg-inverted p-4 text-[13px] leading-6 text-neutral-100"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => {
    const isBlockCode =
      (props.className ?? '').startsWith('language-') ||
      getPlainText(props.children).includes('\n');
    if (isBlockCode) {
      return <code {...props} />;
    }
    return (
      <code
        className="rounded border border-border-subtle bg-bg-subtle px-1.5 py-0.5 font-mono text-[0.85em] text-content-emphasis"
        {...props}
      />
    );
  },
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="mt-5 border-l-2 border-border-emphasis pl-4 text-sm leading-7 text-content-subtle"
      {...props}
    />
  ),
  hr: (props: ComponentPropsWithoutRef<'hr'>) => (
    <hr className="mt-12 border-border-subtle" {...props} />
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

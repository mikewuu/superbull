import {
  headers as alertsHeaders,
  intro as alertsIntro,
  outro as alertsOutro,
  rows as alertsRows,
} from '../alerts/content';
import {
  intro as analyticsIntro,
  mid as analyticsMid,
  outro as analyticsOutro,
  rangeHeaders,
  rangeRows,
  seriesHeaders,
  seriesRows,
} from '../analytics/content';
import {
  intro as apiIntro,
  globalHeaders,
  globalRows,
  jobHeaders,
  jobHeading,
  jobIntro,
  jobRows,
  midMarkdown,
  queueHeaders,
  queueRows,
} from '../api/content';
import {
  headers as configurationHeaders,
  intro as configurationIntro,
  rows as configurationRows,
  redaction,
} from '../configuration/content';
import { content as overviewContent } from '../content';
import {
  content as dashboardsContent,
  headers as dashboardsHeaders,
  outro as dashboardsOutro,
  rows as dashboardsRows,
} from '../dashboards/content';
import { content as gettingStartedContent } from '../getting-started/content';
import {
  headers as hubHeaders,
  intro as hubIntro,
  rows as hubRows,
  ingestSection,
} from '../hub/content';
import {
  headers as mcpHeaders,
  intro as mcpIntro,
  outro as mcpOutro,
  rows as mcpRows,
} from '../mcp/content';
import { behavior, flagHeaders, flagRows, intro as proxyIntro } from '../proxy/content';
import {
  adapterHeaders,
  adapterRows,
  perAdapter,
  intro as standaloneIntro,
} from '../standalone/content';
import {
  content as statusPagesContent,
  headers as statusPagesHeaders,
  outro as statusPagesOutro,
  rows as statusPagesRows,
} from '../status-pages/content';
import { slugify } from './slugify';

export type DocsSearchSection = {
  heading: string | null;
  headingId: string | null;
  body: string;
};

export type DocsSearchPage = {
  href: string;
  sections: DocsSearchSection[];
};

export type DocsSearchMatch = {
  headingText: string | null;
  headingId: string | null;
  snippet: string | null;
};

function tableMarkdown(headers: string[], rows: string[][]): string {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerLine, separatorLine, ...rowLines].join('\n');
}

function splitSections(markdown: string): DocsSearchSection[] {
  const sections: DocsSearchSection[] = [];
  let heading: string | null = null;
  let headingId: string | null = null;
  let bodyLines: string[] = [];

  for (const line of markdown.split('\n')) {
    const h3Text = line.match(/^###\s+(.+)$/)?.[1];
    const h2Text = line.match(/^##\s+(.+)$/)?.[1];
    const headingText = h3Text ?? h2Text;
    if (headingText) {
      sections.push({ heading, headingId, body: bodyLines.join('\n') });
      heading = headingText;
      headingId = slugify(headingText);
      bodyLines = [];
      continue;
    }
    if (/^#\s+.+$/.test(line)) {
      continue;
    }
    bodyLines.push(line);
  }
  sections.push({ heading, headingId, body: bodyLines.join('\n') });
  return sections;
}

function buildPage(href: string, markdown: string): DocsSearchPage {
  return { href, sections: splitSections(markdown) };
}

export const docsSearchIndex: DocsSearchPage[] = [
  buildPage('/docs', overviewContent),
  buildPage('/docs/getting-started', gettingStartedContent),
  buildPage(
    '/docs/standalone',
    [standaloneIntro, tableMarkdown(adapterHeaders, adapterRows), perAdapter].join('\n\n'),
  ),
  buildPage(
    '/docs/proxy',
    [proxyIntro, tableMarkdown(flagHeaders, flagRows), behavior].join('\n\n'),
  ),
  buildPage(
    '/docs/hub',
    [hubIntro, tableMarkdown(hubHeaders, hubRows), ingestSection].join('\n\n'),
  ),
  buildPage(
    '/docs/alerts',
    [alertsIntro, tableMarkdown(alertsHeaders, alertsRows), alertsOutro].join('\n\n'),
  ),
  buildPage(
    '/docs/status-pages',
    [statusPagesContent, tableMarkdown(statusPagesHeaders, statusPagesRows), statusPagesOutro].join(
      '\n\n',
    ),
  ),
  buildPage(
    '/docs/dashboards',
    [dashboardsContent, tableMarkdown(dashboardsHeaders, dashboardsRows), dashboardsOutro].join(
      '\n\n',
    ),
  ),
  buildPage(
    '/docs/analytics',
    [
      analyticsIntro,
      tableMarkdown(rangeHeaders, rangeRows),
      analyticsMid,
      tableMarkdown(seriesHeaders, seriesRows),
      analyticsOutro,
    ].join('\n\n'),
  ),
  buildPage(
    '/docs/api',
    [
      apiIntro,
      tableMarkdown(globalHeaders, globalRows),
      midMarkdown,
      tableMarkdown(queueHeaders, queueRows),
      jobHeading,
      tableMarkdown(jobHeaders, jobRows),
      jobIntro,
    ].join('\n\n'),
  ),
  buildPage('/docs/mcp', [mcpIntro, tableMarkdown(mcpHeaders, mcpRows), mcpOutro].join('\n\n')),
  buildPage(
    '/docs/configuration',
    [configurationIntro, tableMarkdown(configurationHeaders, configurationRows), redaction].join(
      '\n\n',
    ),
  ),
];

const SNIPPET_RADIUS = 40;
const SNIPPET_MAX_LENGTH = 80;

function stripMarkdown(text: string): string {
  return text
    .replace(/```/g, ' ')
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSnippet(body: string, query: string): string | null {
  const plainBody = stripMarkdown(body);
  if (!plainBody) {
    return null;
  }

  const matchIndex = plainBody.toLowerCase().indexOf(query);
  if (matchIndex === -1) {
    if (plainBody.length <= SNIPPET_MAX_LENGTH) {
      return plainBody;
    }
    return `${plainBody.slice(0, SNIPPET_MAX_LENGTH).trim()}…`;
  }

  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(plainBody.length, matchIndex + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < plainBody.length ? '…' : '';
  return `${prefix}${plainBody.slice(start, end).trim()}${suffix}`;
}

export function findMatch(page: DocsSearchPage, query: string): DocsSearchMatch | null {
  for (const section of page.sections) {
    const headingMatches = section.heading?.toLowerCase().includes(query) ?? false;
    const bodyMatches = section.body.toLowerCase().includes(query);
    if (!headingMatches && !bodyMatches) {
      continue;
    }

    return {
      headingText: section.heading,
      headingId: section.headingId,
      snippet: buildSnippet(section.body, query),
    };
  }

  return null;
}

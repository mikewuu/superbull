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

type SearchEntry = { href: string; text: string };

export const docsSearchIndex: SearchEntry[] = [
  { href: '/docs', text: overviewContent.toLowerCase() },
  { href: '/docs/getting-started', text: gettingStartedContent.toLowerCase() },
  {
    href: '/docs/standalone',
    text: [standaloneIntro, adapterHeaders.join(' '), adapterRows.flat().join(' '), perAdapter]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/proxy',
    text: [proxyIntro, flagHeaders.join(' '), flagRows.flat().join(' '), behavior]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/hub',
    text: [hubIntro, hubHeaders.join(' '), hubRows.flat().join(' '), ingestSection]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/alerts',
    text: [alertsIntro, alertsHeaders.join(' '), alertsRows.flat().join(' '), alertsOutro]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/status-pages',
    text: [
      statusPagesContent,
      statusPagesHeaders.join(' '),
      statusPagesRows.flat().join(' '),
      statusPagesOutro,
    ]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/dashboards',
    text: [
      dashboardsContent,
      dashboardsHeaders.join(' '),
      dashboardsRows.flat().join(' '),
      dashboardsOutro,
    ]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/analytics',
    text: [
      analyticsIntro,
      rangeHeaders.join(' '),
      rangeRows.flat().join(' '),
      analyticsMid,
      seriesHeaders.join(' '),
      seriesRows.flat().join(' '),
      analyticsOutro,
    ]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/api',
    text: [
      apiIntro,
      globalHeaders.join(' '),
      globalRows.flat().join(' '),
      midMarkdown,
      queueHeaders.join(' '),
      queueRows.flat().join(' '),
      jobHeading,
      jobHeaders.join(' '),
      jobRows.flat().join(' '),
      jobIntro,
    ]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/mcp',
    text: [mcpIntro, mcpHeaders.join(' '), mcpRows.flat().join(' '), mcpOutro]
      .join(' ')
      .toLowerCase(),
  },
  {
    href: '/docs/configuration',
    text: [
      configurationIntro,
      configurationHeaders.join(' '),
      configurationRows.flat().join(' '),
      redaction,
    ]
      .join(' ')
      .toLowerCase(),
  },
];

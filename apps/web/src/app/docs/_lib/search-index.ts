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
import { behavior, intro as connectorIntro, flagHeaders, flagRows } from '../connector/content';
import {
  introContent as overviewIntroContent,
  quickstartContent as overviewQuickstartContent,
} from '../content';
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
  intro as mcpIntro,
  outro as mcpOutro,
  toolGroups as mcpToolGroups,
  toolHeaders as mcpToolHeaders,
} from '../mcp/content';
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
  buildPage('/docs', [overviewIntroContent, overviewQuickstartContent].join('\n\n')),
  buildPage('/docs/getting-started', gettingStartedContent),
  buildPage(
    '/docs/standalone',
    [standaloneIntro, tableMarkdown(adapterHeaders, adapterRows), perAdapter].join('\n\n'),
  ),
  buildPage(
    '/docs/connector',
    [connectorIntro, tableMarkdown(flagHeaders, flagRows), behavior].join('\n\n'),
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
  buildPage(
    '/docs/mcp',
    [
      mcpIntro,
      ...mcpToolGroups.flatMap((group) => [
        `### ${group.title}\n\n${group.blurb}`,
        tableMarkdown(mcpToolHeaders, group.rows),
      ]),
      mcpOutro,
    ].join('\n\n'),
  ),
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

type ProseBlock = { lines: string[]; isProse: boolean };

function buildProseBlocks(body: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let currentLines: string[] = [];
  let currentIsProse: boolean | null = null;
  let inFence = false;

  const flush = () => {
    if (currentIsProse !== null && currentLines.length > 0) {
      blocks.push({ lines: currentLines, isProse: currentIsProse });
    }
    currentLines = [];
    currentIsProse = null;
  };

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (!trimmed) {
      flush();
      continue;
    }
    const isProse = !inFence && !trimmed.startsWith('|') && !trimmed.startsWith('$');
    if (currentIsProse !== null && currentIsProse !== isProse) {
      flush();
    }
    currentIsProse = isProse;
    currentLines.push(trimmed);
  }
  flush();
  return blocks;
}

function snapToWordStart(text: string, index: number): number {
  let i = index;
  while (i > 0 && !/\s/.test(text.charAt(i - 1))) {
    i--;
  }
  return i;
}

function snapToWordEnd(text: string, index: number): number {
  let i = index;
  while (i < text.length && !/\s/.test(text.charAt(i))) {
    i++;
  }
  return i;
}

function snippetAroundMatch(plainText: string, matchIndex: number, matchLength: number): string {
  const start = snapToWordStart(plainText, Math.max(0, matchIndex - SNIPPET_RADIUS));
  const end = snapToWordEnd(
    plainText,
    Math.min(plainText.length, matchIndex + matchLength + SNIPPET_RADIUS),
  );
  const prefix = start > 0 ? '…' : '';
  const suffix = end < plainText.length ? '…' : '';
  return `${prefix}${plainText.slice(start, end).trim()}${suffix}`;
}

function findBlockMatch(
  blocks: ProseBlock[],
  query: string,
): { plainText: string; matchIndex: number } | null {
  for (const block of blocks) {
    if (!block.isProse) {
      continue;
    }
    const plainText = stripMarkdown(block.lines.join(' '));
    const matchIndex = plainText.toLowerCase().indexOf(query);
    if (matchIndex !== -1) {
      return { plainText, matchIndex };
    }
  }
  return null;
}

function stripCodeLine(line: string): string {
  return stripMarkdown(line.replace(/^\$\s*/, ''));
}

function findCodeLineMatch(
  blocks: ProseBlock[],
  query: string,
): { plainText: string; matchIndex: number } | null {
  for (const block of blocks) {
    if (block.isProse) {
      continue;
    }
    for (const line of block.lines) {
      const plainText = stripCodeLine(line);
      const matchIndex = plainText.toLowerCase().indexOf(query);
      if (matchIndex !== -1) {
        return { plainText, matchIndex };
      }
    }
  }
  return null;
}

function firstProseBlock(blocks: ProseBlock[]): string | null {
  for (const block of blocks) {
    if (!block.isProse) {
      continue;
    }
    const plainText = stripMarkdown(block.lines.join(' '));
    if (plainText) {
      return plainText;
    }
  }
  return null;
}

function representativeSnippet(blocks: ProseBlock[]): string | null {
  const fallback = firstProseBlock(blocks);
  if (!fallback) {
    return null;
  }
  if (fallback.length <= SNIPPET_MAX_LENGTH) {
    return fallback;
  }
  const end = snapToWordEnd(fallback, SNIPPET_MAX_LENGTH);
  return `${fallback.slice(0, end).trim()}…`;
}

type RankedSectionMatch = { rank: number; match: DocsSearchMatch };

function rankSectionMatch(section: DocsSearchSection, query: string): RankedSectionMatch | null {
  const headingText = section.heading;
  const headingId = section.headingId;
  const blocks = buildProseBlocks(section.body);

  const proseMatch = findBlockMatch(blocks, query);
  if (proseMatch) {
    return {
      rank: 0,
      match: {
        headingText,
        headingId,
        snippet: snippetAroundMatch(proseMatch.plainText, proseMatch.matchIndex, query.length),
      },
    };
  }

  const headingMatches = headingText?.toLowerCase().includes(query) ?? false;
  if (headingMatches) {
    return { rank: 1, match: { headingText, headingId, snippet: representativeSnippet(blocks) } };
  }

  const codeMatch = findCodeLineMatch(blocks, query);
  if (codeMatch) {
    return {
      rank: 2,
      match: {
        headingText,
        headingId,
        snippet: snippetAroundMatch(codeMatch.plainText, codeMatch.matchIndex, query.length),
      },
    };
  }

  return null;
}

export function findMatch(page: DocsSearchPage, query: string): DocsSearchMatch | null {
  let best: RankedSectionMatch | null = null;
  for (const section of page.sections) {
    const ranked = rankSectionMatch(section, query);
    if (!ranked) {
      continue;
    }
    if (!best || ranked.rank < best.rank) {
      best = ranked;
    }
    if (best.rank === 0) {
      break;
    }
  }
  return best?.match ?? null;
}

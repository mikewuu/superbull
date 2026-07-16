export type DocsNavItem = {
  href: string;
  label: string;
};

export type DocsNavGroup = {
  label: string;
  items: DocsNavItem[];
};

export const docsNav: DocsNavGroup[] = [
  {
    label: 'Introduction',
    items: [
      { href: '/docs', label: 'Overview' },
      { href: '/docs/getting-started', label: 'Getting started' },
    ],
  },
  {
    label: 'Modes',
    items: [
      { href: '/docs/standalone', label: 'Standalone' },
      { href: '/docs/connector', label: 'Connector' },
      { href: '/docs/hub', label: 'Hosted app' },
    ],
  },
  {
    label: 'Hosted features',
    items: [
      { href: '/docs/alerts', label: 'Alerts' },
      { href: '/docs/status-pages', label: 'Status pages' },
      { href: '/docs/dashboards', label: 'Dashboards' },
      { href: '/docs/analytics', label: 'Analytics' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/docs/api', label: 'REST API' },
      { href: '/docs/mcp', label: 'MCP' },
      { href: '/docs/configuration', label: 'Configuration' },
    ],
  },
];

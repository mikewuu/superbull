export interface RenderSpaEntryArgs {
  template: string;
  basePath: string;
  title: string;
  uiConfig: string;
}

export function renderSpaEntry(args: RenderSpaEntryArgs): string {
  const { template, basePath, title, uiConfig } = args;
  return template
    .replaceAll('<%= basePath %>', basePath)
    .replace('<%= title %>', title)
    .replace('<%- uiConfig %>', uiConfig);
}

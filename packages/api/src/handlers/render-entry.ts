import type { UIConfig, ViewResponse } from '../types';

export function renderEntry(params: { basePath: string; uiConfig: UIConfig }): ViewResponse {
  const basePath = params.basePath.endsWith('/') ? params.basePath : `${params.basePath}/`;
  const uiConfig = JSON.stringify(params.uiConfig)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return {
    name: 'index.ejs',
    params: {
      basePath,
      uiConfig,
      title: params.uiConfig.board_title ?? 'SuperBull',
    },
  };
}

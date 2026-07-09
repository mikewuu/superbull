import type { UIConfig } from './api-types';

export function readUIConfig(): UIConfig {
  const element = document.getElementById('__UI_CONFIG__');
  if (!element?.textContent) {
    return {};
  }
  return JSON.parse(element.textContent) as UIConfig;
}

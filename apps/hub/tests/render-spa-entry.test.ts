import { describe, expect, it } from 'vitest';
import { renderSpaEntry } from '../src/lib/forwarding/render-spa-entry';

describe('renderSpaEntry', () => {
  it('substitutes all placeholders', () => {
    const template =
      '<base href="<%= basePath %>" /><title><%= title %></title>' +
      '<script id="__BASE_PATH__"><%= basePath %></script>' +
      '<script id="__UI_CONFIG__"><%- uiConfig %></script>';

    const result = renderSpaEntry({
      template,
      basePath: '/s/abc-123/',
      title: 'proxy-a — superbull',
      uiConfig: '{"board_title":"proxy-a"}',
    });

    expect(result).toContain('href="/s/abc-123/"');
    expect(result).toContain('<title>proxy-a — superbull</title>');
    expect(result).toContain('>{"board_title":"proxy-a"}</script>');
  });

  it('replaces every occurrence of basePath', () => {
    const template = '<%= basePath %>-<%= basePath %>-<%= title %>-<%- uiConfig %>';

    const result = renderSpaEntry({
      template,
      basePath: '/s/x/',
      title: 't',
      uiConfig: '{}',
    });

    expect(result).toBe('/s/x/-/s/x/-t-{}');
  });

  it('injects uiConfig raw without escaping', () => {
    const template = '<%- uiConfig %>';

    const result = renderSpaEntry({
      template,
      basePath: '/',
      title: 't',
      uiConfig: '{"a":"<b>"}',
    });

    expect(result).toBe('{"a":"<b>"}');
  });
});

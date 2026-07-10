import { describe, expect, it } from 'vitest';
import { renderEntry } from '../../src/handlers/render-entry';

describe('renderEntry', () => {
  it('renders the index view', () => {
    const result = renderEntry({ basePath: '/ui', uiConfig: {} });
    expect(result.name).toBe('index.ejs');
  });

  it('appends a trailing slash to a basePath that lacks one', () => {
    const result = renderEntry({ basePath: '/ui', uiConfig: {} });
    expect(result.params.basePath).toBe('/ui/');
  });

  it('leaves an already-trailing-slash basePath unchanged', () => {
    const result = renderEntry({ basePath: '/ui/', uiConfig: {} });
    expect(result.params.basePath).toBe('/ui/');
  });

  it('escapes angle brackets in the serialized ui config', () => {
    const result = renderEntry({
      basePath: '/',
      uiConfig: { board_title: '</script><script>alert(1)</script>' },
    });
    expect(result.params.uiConfig).not.toContain('<');
    expect(result.params.uiConfig).not.toContain('>');
  });

  it('uses the board title for the page title', () => {
    const result = renderEntry({ basePath: '/', uiConfig: { board_title: 'My Queues' } });
    expect(result.params.title).toBe('My Queues');
  });

  it('falls back to a default title', () => {
    const result = renderEntry({ basePath: '/', uiConfig: {} });
    expect(result.params.title).toBe('superbull');
  });
});

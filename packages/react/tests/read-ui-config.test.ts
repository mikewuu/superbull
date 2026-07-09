import { afterEach, describe, expect, it } from 'vitest';
import { readUIConfig } from '../src/lib/read-ui-config';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('readUIConfig', () => {
  it('returns an empty object when the element is absent', () => {
    expect(readUIConfig()).toEqual({});
  });

  it('parses the serialized config', () => {
    document.body.innerHTML =
      '<script id="__UI_CONFIG__" type="application/json">{"polling_interval_ms":2000}</script>';
    expect(readUIConfig()).toEqual({ polling_interval_ms: 2000 });
  });
});

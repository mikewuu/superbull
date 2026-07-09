import { afterEach, describe, expect, it } from 'vitest';
import { readBasePath } from '../src/lib/read-base-path';

afterEach(() => {
  document.body.innerHTML = '';
});

function setBasePathElement(value: string) {
  document.body.innerHTML = `<script id="__BASE_PATH__" type="text/plain">${value}</script>`;
}

describe('readBasePath', () => {
  it('returns "/" when the element is absent', () => {
    expect(readBasePath()).toBe('/');
  });

  it('returns "/" when the element is empty', () => {
    setBasePathElement('');
    expect(readBasePath()).toBe('/');
  });

  it('appends a trailing slash when missing', () => {
    setBasePathElement('/admin/queues');
    expect(readBasePath()).toBe('/admin/queues/');
  });

  it('keeps an existing trailing slash', () => {
    setBasePathElement('/admin/queues/');
    expect(readBasePath()).toBe('/admin/queues/');
  });
});

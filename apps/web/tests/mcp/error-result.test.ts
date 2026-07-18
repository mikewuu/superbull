import { describe, expect, it, vi } from 'vitest';
import { errorResult } from '../../src/lib/mcp/error-result';

describe('errorResult', () => {
  it('passes through deliberate tool errors', () => {
    expect(errorResult('connector not found').content[0]?.text).toBe('Error: connector not found');
  });

  it('hides unexpected error details and logs the original', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(errorResult(new Error('redis password leaked')).content[0]?.text).toBe(
      'Error: internal error',
    );
    expect(log).toHaveBeenCalledWith('MCP tool failed', expect.any(Error));
    log.mockRestore();
  });
});

export function errorResult(error: unknown) {
  if (typeof error === 'string') {
    return getErrorResult(error);
  }
  if (error instanceof Error && error.message === 'Connector not found') {
    return getErrorResult(error.message);
  }
  console.error('MCP tool failed', error);
  return getErrorResult('internal error');
}

function getErrorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}

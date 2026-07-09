import type { HTTPStatus, HandlerResponse } from '../types';

export function handleError(error: Error & { statusCode?: HTTPStatus }): HandlerResponse {
  return {
    status: error.statusCode || 500,
    body: {
      error: 'internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  };
}

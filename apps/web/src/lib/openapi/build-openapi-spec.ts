import { z } from 'zod';
import {
  annotationSchema,
  getQuerySchema,
  getResponseSchema,
  postBodySchema,
} from '../../app/api/annotations/route';

type HttpMethod = 'get' | 'post';

interface Endpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  query?: z.ZodType;
  body?: z.ZodType;
  response: z.ZodType;
  successStatus?: number;
  authFree?: boolean;
}

const endpoints: Endpoint[] = [
  {
    method: 'get',
    path: '/api/health',
    summary: 'Check whether the hosted API is running',
    response: z.object({ ok: z.literal(true) }),
    authFree: true,
  },
  {
    method: 'get',
    path: '/api/annotations',
    summary: 'List deploy annotations for a connector',
    query: getQuerySchema,
    response: getResponseSchema,
  },
  {
    method: 'post',
    path: '/api/annotations',
    summary: 'Create a deploy annotation for a connector',
    body: postBodySchema,
    response: annotationSchema,
    successStatus: 201,
  },
];

const oauthErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    error_description: { type: 'string' },
  },
  required: ['error'],
};

export function buildOpenApiSpec(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of endpoints) {
    paths[endpoint.path] = {
      ...paths[endpoint.path],
      [endpoint.method]: getOperation(endpoint),
    };
  }
  addOAuthPaths(paths);

  return {
    openapi: '3.1.0',
    info: {
      title: 'SuperBull hosted API',
      version: '1',
      description:
        'Manage deploy annotations and connect MCP clients. Use a named per-user sbh_ API key or a project-bound sbho_ OAuth access token for authenticated routes.',
    },
    servers: [{ url: 'https://superbull.com' }],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'A named sbh_ API key or an sbho_ OAuth access token.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['type', 'message'],
        },
      },
    },
  };
}

function getOperation(endpoint: Endpoint): Record<string, unknown> {
  const parameters = endpoint.query ? getQueryParameters(endpoint.query) : [];
  return {
    summary: endpoint.summary,
    ...(endpoint.authFree ? { security: [] } : {}),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(endpoint.body
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: getJsonSchema(endpoint.body, 'input') },
            },
          },
        }
      : {}),
    responses: getResponses(endpoint),
  };
}

function getResponses(endpoint: Endpoint): Record<string, unknown> {
  const successStatus = endpoint.successStatus ?? 200;
  const responses: Record<string, unknown> = {
    [String(successStatus)]: {
      description: 'OK',
      content: {
        'application/json': { schema: getJsonSchema(endpoint.response, 'output') },
      },
    },
  };
  if (endpoint.authFree) {
    return responses;
  }

  const errorSchema = { $ref: '#/components/schemas/Error' };
  return {
    ...responses,
    '400': {
      description: 'Invalid query or request body',
      content: { 'application/json': { schema: errorSchema } },
    },
    '401': {
      description: 'Missing or invalid bearer credential',
      content: { 'application/json': { schema: errorSchema } },
    },
    '404': {
      description: 'Connector not found or outside the caller’s projects',
      content: { 'application/json': { schema: errorSchema } },
    },
    '429': {
      description: 'Per-user rate limit exceeded; retry-after is returned in seconds',
      content: { 'application/json': { schema: errorSchema } },
    },
  };
}

function getQueryParameters(query: z.ZodType): Record<string, unknown>[] {
  const schema = getJsonSchema(query, 'input');
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required ?? []) as string[];
  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: propertySchema,
  }));
}

function getJsonSchema(schema: z.ZodType, io: 'input' | 'output'): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { io }) as Record<string, unknown>;
  const { $schema: _schema, ...openApiSchema } = jsonSchema;
  return openApiSchema;
}

function addOAuthPaths(paths: Record<string, Record<string, unknown>>): void {
  paths['/.well-known/oauth-authorization-server'] = {
    get: {
      summary: 'Read OAuth authorization server metadata',
      security: [],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  issuer: { type: 'string' },
                  authorization_endpoint: { type: 'string' },
                  token_endpoint: { type: 'string' },
                  registration_endpoint: { type: 'string' },
                  revocation_endpoint: { type: 'string' },
                  response_types_supported: { type: 'array', items: { type: 'string' } },
                  grant_types_supported: { type: 'array', items: { type: 'string' } },
                  code_challenge_methods_supported: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  token_endpoint_auth_methods_supported: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  scopes_supported: { type: 'array', items: { type: 'string' } },
                },
                required: [
                  'issuer',
                  'authorization_endpoint',
                  'token_endpoint',
                  'registration_endpoint',
                  'revocation_endpoint',
                  'response_types_supported',
                  'grant_types_supported',
                  'code_challenge_methods_supported',
                  'token_endpoint_auth_methods_supported',
                  'scopes_supported',
                ],
              },
            },
          },
        },
      },
    },
  };

  paths['/.well-known/oauth-protected-resource'] = {
    get: {
      summary: 'Read OAuth metadata for the MCP protected resource',
      security: [],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  resource: { type: 'string' },
                  authorization_servers: { type: 'array', items: { type: 'string' } },
                  scopes_supported: { type: 'array', items: { type: 'string' } },
                  bearer_methods_supported: { type: 'array', items: { type: 'string' } },
                },
                required: [
                  'resource',
                  'authorization_servers',
                  'scopes_supported',
                  'bearer_methods_supported',
                ],
              },
            },
          },
        },
      },
    },
  };

  paths['/api/oauth/register'] = {
    post: {
      summary: 'Register a public OAuth client for the PKCE flow',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                client_name: { type: 'string' },
                redirect_uris: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'HTTPS, or HTTP on localhost, 127.0.0.1, or [::1].',
                },
              },
              required: ['redirect_uris'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Registered',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  client_id: { type: 'string' },
                  client_name: { type: 'string' },
                  redirect_uris: { type: 'array', items: { type: 'string' } },
                  token_endpoint_auth_method: { type: 'string', const: 'none' },
                  grant_types: { type: 'array', items: { type: 'string' } },
                  response_types: { type: 'array', items: { type: 'string' } },
                },
                required: [
                  'client_id',
                  'client_name',
                  'redirect_uris',
                  'token_endpoint_auth_method',
                  'grant_types',
                  'response_types',
                ],
              },
            },
          },
        },
        '400': {
          description: 'Invalid client metadata or redirect URI',
          content: { 'application/json': { schema: oauthErrorSchema } },
        },
        '429': {
          description: 'Per-IP rate limit exceeded',
          content: { 'application/json': { schema: oauthErrorSchema } },
        },
      },
    },
  };

  paths['/api/oauth/token'] = {
    post: {
      summary: 'Exchange a PKCE authorization code or rotate a refresh token',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/x-www-form-urlencoded': { schema: getOAuthTokenRequestSchema() },
          'application/json': { schema: getOAuthTokenRequestSchema() },
        },
      },
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  access_token: { type: 'string', description: 'sbho_ access token' },
                  token_type: { type: 'string', const: 'bearer' },
                  expires_in: { type: 'number' },
                  refresh_token: { type: 'string', description: 'sbhr_ refresh token' },
                  scope: { type: 'string', const: 'mcp' },
                },
                required: ['access_token', 'token_type', 'expires_in', 'refresh_token', 'scope'],
              },
            },
          },
        },
        '400': {
          description: 'Invalid request, grant, or grant type',
          content: { 'application/json': { schema: oauthErrorSchema } },
        },
        '429': {
          description: 'Per-IP rate limit exceeded',
          content: { 'application/json': { schema: oauthErrorSchema } },
        },
      },
    },
  };

  paths['/api/oauth/revoke'] = {
    post: {
      summary: 'Revoke an OAuth access or refresh token',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                client_id: { type: 'string' },
              },
              required: ['token', 'client_id'],
            },
          },
        },
      },
      responses: {
        '200': { description: 'Revoked' },
        '400': {
          description: 'token and client_id are required',
          content: { 'application/json': { schema: oauthErrorSchema } },
        },
        '429': {
          description: 'Per-IP rate limit exceeded',
          content: { 'application/json': { schema: oauthErrorSchema } },
        },
      },
    },
  };
}

function getOAuthTokenRequestSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      grant_type: { type: 'string', enum: ['authorization_code', 'refresh_token'] },
      code: { type: 'string' },
      client_id: { type: 'string' },
      redirect_uri: { type: 'string' },
      code_verifier: { type: 'string' },
      refresh_token: { type: 'string' },
    },
    required: ['grant_type', 'client_id'],
  };
}

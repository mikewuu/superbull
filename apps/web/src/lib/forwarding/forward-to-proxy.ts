export interface ForwardToProxyArgs {
  source: { url: string; token: string };
  method: string;
  path: string[];
  search: string;
  body: string | undefined;
  contentType: string | null;
}

export interface ForwardToProxyResult {
  status: number;
  body: string;
  contentType: string | null;
}

export async function forwardToProxy(args: ForwardToProxyArgs): Promise<ForwardToProxyResult> {
  const { source, method, path, search, body, contentType } = args;
  const url = `${source.url}/api/${path.join('/')}${search}`;
  const headers: Record<string, string> = { authorization: `Bearer ${source.token}` };
  if (contentType) {
    headers['content-type'] = contentType;
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body });
  } catch {
    return {
      status: 502,
      body: JSON.stringify({ error: 'proxy unreachable' }),
      contentType: 'application/json',
    };
  }

  return {
    status: response.status,
    body: await response.text(),
    contentType: response.headers.get('content-type'),
  };
}

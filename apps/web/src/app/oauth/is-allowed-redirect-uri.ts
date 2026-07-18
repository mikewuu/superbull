const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isAllowedRedirectUri(redirectUri: string): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }

  if (redirectUri.includes('#') || url.username || url.password) {
    return false;
  }

  if (url.protocol === 'https:') {
    return true;
  }

  return url.protocol === 'http:' && loopbackHosts.has(url.hostname);
}

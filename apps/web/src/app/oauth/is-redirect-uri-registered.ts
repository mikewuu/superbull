const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isRedirectUriRegistered(
  registeredRedirectUris: string[],
  presentedRedirectUri: string,
): boolean {
  return registeredRedirectUris.some((registeredRedirectUri) =>
    redirectUriMatches(registeredRedirectUri, presentedRedirectUri),
  );
}

function redirectUriMatches(firstRedirectUri: string, secondRedirectUri: string): boolean {
  if (firstRedirectUri === secondRedirectUri) {
    return true;
  }

  let firstUrl: URL;
  let secondUrl: URL;
  try {
    firstUrl = new URL(firstRedirectUri);
    secondUrl = new URL(secondRedirectUri);
  } catch {
    return false;
  }

  if (!isLoopbackHttp(firstUrl) || !isLoopbackHttp(secondUrl)) {
    return false;
  }

  return firstUrl.hostname === secondUrl.hostname && firstUrl.pathname === secondUrl.pathname;
}

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === 'http:' && loopbackHosts.has(url.hostname);
}

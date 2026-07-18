export function getClientIp(headers: Headers): string {
  const platformIp = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (platformIp) {
    return platformIp;
  }

  const forwardedIps = headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  const forwardedIp = forwardedIps?.at(-1);
  if (forwardedIp) {
    return forwardedIp;
  }

  return headers.get('x-real-ip')?.trim() || 'anonymous';
}

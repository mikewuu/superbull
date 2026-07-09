export function readBasePath(): string {
  const element = document.getElementById('__BASE_PATH__');
  const basePath = element?.textContent?.trim() ?? '';
  if (!basePath) {
    return '/';
  }
  return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

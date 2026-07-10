export interface RegisterWithHubArgs {
  hubUrl: string;
  hubToken: string;
  name: string;
  url: string;
  token: string;
  fetchImpl?: typeof fetch;
  retryDelayMs?: number;
}

export interface RegisterWithHubResult {
  sourceId: string;
}

export async function registerWithHub(
  args: RegisterWithHubArgs,
): Promise<RegisterWithHubResult | null> {
  const { hubUrl, hubToken, name, url, token, fetchImpl = fetch, retryDelayMs = 1000 } = args;
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(`${hubUrl}/api/sources/register`, {
        method: 'POST',
        headers: { authorization: `Bearer ${hubToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name, url, token }),
      });
      if (!response.ok) {
        throw new Error(`hub register failed with status ${response.status}`);
      }
      const body = (await response.json()) as { source_id: string };
      return { sourceId: body.source_id };
    } catch (error) {
      if (attempt === attempts) {
        console.warn(
          `superbull-proxy: failed to register with hub after ${attempts} attempts:`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
      await sleep(retryDelayMs * attempt);
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

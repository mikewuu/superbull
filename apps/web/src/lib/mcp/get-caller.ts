import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

export function getCaller(authInfo?: AuthInfo): {
  userId: string;
  projectId: string | null;
} {
  const userId = authInfo?.extra?.userId;
  const projectId = authInfo?.extra?.projectId;
  if (typeof userId !== 'string') {
    throw new Error('unauthorized');
  }
  if (projectId !== undefined && projectId !== null && typeof projectId !== 'string') {
    throw new Error('unauthorized');
  }
  return { userId, projectId: projectId ?? null };
}

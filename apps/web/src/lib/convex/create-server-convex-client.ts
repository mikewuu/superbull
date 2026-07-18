import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference, FunctionReturnType } from 'convex/server';
import { env } from '../config/env';

type QueryArgs<T extends FunctionReference<'query'>> = Omit<T['_args'], 'internalToken'>;
type MutationArgs<T extends FunctionReference<'mutation'>> = Omit<T['_args'], 'internalToken'>;
type ActionArgs<T extends FunctionReference<'action'>> = Omit<T['_args'], 'internalToken'>;

export interface ServerConvexClient {
  query<T extends FunctionReference<'query'>>(
    ref: T,
    args: QueryArgs<T>,
  ): Promise<FunctionReturnType<T>>;
  mutation<T extends FunctionReference<'mutation'>>(
    ref: T,
    args: MutationArgs<T>,
  ): Promise<FunctionReturnType<T>>;
  action<T extends FunctionReference<'action'>>(
    ref: T,
    args: ActionArgs<T>,
  ): Promise<FunctionReturnType<T>>;
}

export function createServerConvexClient(): ServerConvexClient {
  if (!env.NEXT_PUBLIC_CONVEX_URL || !env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL and CONVEX_INTERNAL_TOKEN are required');
  }
  const http = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  const internalToken = env.CONVEX_INTERNAL_TOKEN;
  return {
    query: (ref, args) => http.query(ref, { ...args, internalToken } as never),
    mutation: (ref, args) => http.mutation(ref, { ...args, internalToken } as never),
    action: (ref, args) => http.action(ref, { ...args, internalToken } as never),
  };
}

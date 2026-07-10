import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import { env } from '../config/env';
import type { HubDatabase } from './hub-database';
import type { ProxySource } from './types';

interface ConvexProxySourceDoc {
  _id: string;
  _creationTime: number;
  name: string;
  url: string;
  token: string;
}

function getOrThrow<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

const proxySourcesModule = getOrThrow(
  anyApi.proxySources,
  'convex api module "proxySources" is missing',
);

const proxySourcesApi = {
  list: getOrThrow(proxySourcesModule.list, 'convex function "proxySources.list" is missing'),
  findById: getOrThrow(
    proxySourcesModule.findById,
    'convex function "proxySources.findById" is missing',
  ),
  create: getOrThrow(proxySourcesModule.create, 'convex function "proxySources.create" is missing'),
  remove: getOrThrow(proxySourcesModule.remove, 'convex function "proxySources.remove" is missing'),
};

export function createConvexHubDatabase(): HubDatabase {
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
  const internalToken = env.CONVEX_INTERNAL_TOKEN;
  if (!convexUrl || !internalToken) {
    throw new Error(
      'NEXT_PUBLIC_CONVEX_URL and CONVEX_INTERNAL_TOKEN are required for the convex hub database',
    );
  }

  const client = new ConvexHttpClient(convexUrl);

  return {
    async listSources() {
      const docs: ConvexProxySourceDoc[] = await client.query(proxySourcesApi.list, {
        internalToken,
      });
      return docs.map(toProxySource);
    },
    async findSourceById(id) {
      const doc: ConvexProxySourceDoc | null = await client.query(proxySourcesApi.findById, {
        internalToken,
        id,
      });
      return doc ? toProxySource(doc) : null;
    },
    async createSource(args) {
      const doc: ConvexProxySourceDoc = await client.mutation(proxySourcesApi.create, {
        internalToken,
        name: args.name,
        url: args.url,
        token: args.token,
      });
      return toProxySource(doc);
    },
    async deleteSource(id) {
      await client.mutation(proxySourcesApi.remove, { internalToken, id });
    },
  };
}

function toProxySource(doc: ConvexProxySourceDoc): ProxySource {
  return {
    id: doc._id,
    name: doc.name,
    url: doc.url,
    token: doc.token,
    created_at: new Date(doc._creationTime),
  };
}

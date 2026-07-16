/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as dashboards from "../dashboards.js";
import type * as deployAnnotations from "../deployAnnotations.js";
import type * as errors from "../errors.js";
import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as proxySources from "../proxySources.js";
import type * as statusPages from "../statusPages.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  analytics: typeof analytics;
  auth: typeof auth;
  dashboards: typeof dashboards;
  deployAnnotations: typeof deployAnnotations;
  errors: typeof errors;
  http: typeof http;
  ingest: typeof ingest;
  proxySources: typeof proxySources;
  statusPages: typeof statusPages;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

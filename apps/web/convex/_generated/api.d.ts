/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as alertNotifications from "../alertNotifications.js";
import type * as alerts from "../alerts.js";
import type * as analytics from "../analytics.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as connectors from "../connectors.js";
import type * as dashboards from "../dashboards.js";
import type * as deployAnnotations from "../deployAnnotations.js";
import type * as emails_alertEmail from "../emails/alertEmail.js";
import type * as emails_digestEmail from "../emails/digestEmail.js";
import type * as emails_digestRecipients from "../emails/digestRecipients.js";
import type * as emails_getResend from "../emails/getResend.js";
import type * as emails_sendAlertEmail from "../emails/sendAlertEmail.js";
import type * as emails_sendDigestEmail from "../emails/sendDigestEmail.js";
import type * as errors from "../errors.js";
import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as invites from "../invites.js";
import type * as oauthProvider from "../oauthProvider.js";
import type * as projects from "../projects.js";
import type * as statusPages from "../statusPages.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  alertNotifications: typeof alertNotifications;
  alerts: typeof alerts;
  analytics: typeof analytics;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  connectors: typeof connectors;
  dashboards: typeof dashboards;
  deployAnnotations: typeof deployAnnotations;
  "emails/alertEmail": typeof emails_alertEmail;
  "emails/digestEmail": typeof emails_digestEmail;
  "emails/digestRecipients": typeof emails_digestRecipients;
  "emails/getResend": typeof emails_getResend;
  "emails/sendAlertEmail": typeof emails_sendAlertEmail;
  "emails/sendDigestEmail": typeof emails_sendDigestEmail;
  errors: typeof errors;
  http: typeof http;
  ingest: typeof ingest;
  invites: typeof invites;
  oauthProvider: typeof oauthProvider;
  projects: typeof projects;
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

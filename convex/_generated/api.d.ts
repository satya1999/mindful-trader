/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as http from "../http.js";
import type * as mt5Accounts from "../mt5Accounts.js";
import type * as mt5Analytics from "../mt5Analytics.js";
import type * as mt5Journal from "../mt5Journal.js";
import type * as mt5Sync from "../mt5Sync.js";
import type * as mt5Trades from "../mt5Trades.js";
import type * as notifications from "../notifications.js";
import type * as profiles from "../profiles.js";
import type * as stats from "../stats.js";
import type * as trades from "../trades.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  crypto: typeof crypto;
  http: typeof http;
  mt5Accounts: typeof mt5Accounts;
  mt5Analytics: typeof mt5Analytics;
  mt5Journal: typeof mt5Journal;
  mt5Sync: typeof mt5Sync;
  mt5Trades: typeof mt5Trades;
  notifications: typeof notifications;
  profiles: typeof profiles;
  stats: typeof stats;
  trades: typeof trades;
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

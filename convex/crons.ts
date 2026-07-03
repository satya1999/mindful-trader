import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every minute, sync any MT5 account whose nextSyncAt has passed.
// Each account carries its own syncInterval (1/5/15 min) which controls
// how far ahead nextSyncAt is pushed after a successful sync, so this
// one-minute tick respects each account's chosen cadence.
crons.interval(
  "mt5-auto-sync",
  { minutes: 1 },
  internal.mt5Sync.syncDueAccounts,
  {}
);

export default crons;

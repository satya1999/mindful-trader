# MT5 Bridge — Setup Guide

MetaTrader 5 has **no cloud API**. The only way to read a live account is the
official `MetaTrader5` Python library talking to an **installed MT5 terminal**.
This bridge is a small FastAPI service that does exactly that: Convex calls it,
it logs into your account with the **investor (read-only) password**, and
returns account info, trades, positions and transactions.

Because Convex runs in the cloud, it must be able to reach this service over the
internet. Below is the full path to get **real trades flowing** when the bridge
runs on your own Windows PC.

---

## 1. Prerequisites

- Windows 10/11 (the `MetaTrader5` package is Windows-only).
- Your broker's **MetaTrader 5 terminal** installed and logged into your account
  at least once.
- **Python 3.8–3.12** (`python --version`).

## 2. Install the bridge

```powershell
cd mt5-bridge
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Configure

Copy the example env file and set a strong shared secret:

```powershell
copy .env.example .env
```

Edit `.env`:

```
MT5_BRIDGE_API_KEY=<generate-a-long-random-string>
PORT=8000
LOG_LEVEL=INFO
```

Keep this key — Convex needs the **same** value (step 6).

## 4. Run it

```powershell
.venv\Scripts\Activate.ps1
python main.py
```

Verify locally:

```powershell
curl http://localhost:8000/health
```

You should get `{"status":"ok","mt5_version":[...]}`. If `mt5_version` is
`null`, the MT5 terminal isn't installed/initializing — open the terminal
manually once and retry.

## 5. Expose it to Convex (tunnel)

Convex is in the cloud, so `localhost` isn't reachable. Put a tunnel in front of
the bridge. Easiest is **Cloudflare Tunnel** (free, no account needed for a quick
tunnel) or **ngrok**:

```powershell
# Option A: cloudflared
cloudflared tunnel --url http://localhost:8000

# Option B: ngrok
ngrok http 8000
```

Copy the public HTTPS URL it prints, e.g. `https://abc-123.trycloudflare.com`.

> The bridge is protected by the `X-API-Key` header (step 3), so exposing it is
> safe as long as your key stays secret. Still, prefer a VPS for always-on use.

## 6. Point Convex at the bridge

Set three environment variables on your Convex deployment (Convex dashboard →
Settings → Environment Variables, or the CLI):

```powershell
npx convex env set MT5_BRIDGE_URL https://abc-123.trycloudflare.com
npx convex env set MT5_BRIDGE_API_KEY <same-key-as-step-3>
# Encrypts broker passwords at rest (AES-256-GCM). Any long random string.
npx convex env set MT5_ENCRYPTION_KEY <a-different-long-random-string>
```

`MT5_ENCRYPTION_KEY` is **required to connect an account** — the investor
password is encrypted with a key derived from it before being stored. Set it
once and never change it, or previously connected accounts can no longer be
decrypted (they'd need to be reconnected).

The bridge switch: **with `MT5_BRIDGE_URL` set, syncing hits your real account.
Without it, the app seeds demo data instead.**

## 7. Connect your account in the app

1. Open the app → **Accounts → Connect MT5 Account**.
2. Enter broker, **server** (MT5 → File → Login to Trade Account shows it),
   account number, and your **Investor password** (read-only — *not* your master
   password).
3. Save. An initial sync runs immediately; after that the cron
   (`convex/crons.ts`) re-syncs every account on its chosen interval (1/5/15 min).

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Account shows **error**, "Login failed" | Wrong server name or investor password. Server must match exactly (e.g. `Exness-MT5Real`). |
| "Bridge /account-info returned 403" | `MT5_BRIDGE_API_KEY` in Convex ≠ the key in the bridge `.env`. |
| Sync times out / "returned 5xx" | Bridge PC asleep, tunnel down, or MT5 terminal closed. Keep the PC awake and the terminal running. |
| `mt5_version` is `null` on `/health` | MT5 terminal not installed or never logged in. Launch it once manually. |
| Data looks fake/random | `MT5_BRIDGE_URL` not set on Convex → demo mode. Set it (step 6). |

## Notes on security

- Only the **investor password** is used — it can view but never trade.
- Credentials are encrypted at rest with **AES-256-GCM** (`convex/crypto.ts`),
  using a key derived from `MT5_ENCRYPTION_KEY`. They are decrypted server-side
  only inside the sync action when calling the bridge, and are never returned to
  any client query.
- The bridge itself is guarded by the `X-API-Key` header — keep that key and the
  encryption key secret and out of version control.

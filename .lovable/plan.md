
# TradeMind Journal — Lean MVP

A discipline-focused trading journal where every trade requires a psychology check-in, screenshots validate the setup, and a 30-day streak builds the habit. No AI insights and no broker sync in v1 — the goal is to ship a polished, opinionated journaling loop that traders actually use daily.

## What we're building

### 1. Authentication
- Email/password sign up and sign in (Lovable Cloud).
- Each user owns their own trades, screenshots, and streak.
- Protected app routes; public landing + auth pages.

### 2. Landing page
- Hero explaining the "discipline over outcome" promise.
- Three-feature breakdown: structured logging, psychology tracking, 30-day challenge.
- CTA to sign up.

### 3. Add Trade flow (the core ritual)
A single guided form split into three steps so users can't skip the discipline parts:

**Step 1 — Trade details (mandatory)**
- Asset symbol (free text, works for forex / crypto / stocks / indices)
- Market type selector (Forex, Crypto, Stocks/Indices) — drives unit labels
- Direction (Buy / Sell)
- Entry, Stop Loss, Take Profit
- Position size, Risk %
- Risk:Reward auto-calculated and shown live
- Optional: strategy, timeframe, session (London / NY / Asia)

**Step 2 — Pre-trade psychology (mandatory)**
- "Why are you taking this trade?" (textarea)
- "What is your setup?" (textarea)
- Confidence slider 1–10
- Emotion before: Calm / Fear / Greed / FOMO / Revenge

**Step 3 — Screenshot + close-out**
- Drag-and-drop upload for entry chart (required)
- Optional exit chart upload
- Tag the trade: Perfect Setup / Mistake / Emotional Trade
- When closing later: exit price, P&L auto-calc, "Did you follow your plan?", post-trade emotion (Satisfaction / Regret / Frustration / Overconfidence), what went right/wrong

Trades start as **Open** and can be **Closed** later from the trades list.

### 4. Trades list
- Table/card view of all trades with filters (open/closed, market, tag, date range).
- Each row links to a trade detail page showing all fields, both screenshots, and the full psychology log.
- Edit and delete actions.

### 5. Analytics dashboard
Stats computed from closed trades:
- Win rate, profit factor, expectancy, average R:R, max drawdown, total P&L
- Equity curve (line chart)
- Calendar heatmap of trading days (green = profit, red = loss, gray = no trade)
- Breakdown by emotion: win rate when Calm vs FOMO vs Revenge etc.
- Breakdown by confidence bucket
- Plan-followed vs plan-broken win rate comparison

These are simple aggregations — no AI — but they already deliver the "Myfxbook-like" insight feel.

### 6. 30-Day Discipline Challenge
- Big streak counter on dashboard with flame icon.
- Each day requires either a logged trade OR a "No Trade Day" entry with a reason.
- Calendar view showing the 30-day grid with each day's status.
- Progress bar toward 30/30.
- On day 30 completion: a celebratory summary screen showing total trades, discipline score (% of days where plan was followed), most common emotion, and best/worst trade.

### 7. Settings
- Profile (name, default market, default risk %).
- Sign out.

## Design direction

- **Palette**: Neon Mint — deep navy `#0d1b2a` background, forest `#1b4332` surface accents, mint `#2dd4a8` primary, bright `#73ffb8` highlights. Loss/danger uses a warm red.
- **Glassmorphism**: frosted translucent cards with subtle borders, soft glow on primary actions, blurred background gradients.
- **Dark mode by default** — no light mode toggle in v1.
- **Typography**: clean modern sans (Inter/Manrope), tight numerics for prices and stats.
- **Micro-interactions**: streak flame pulses on increment, R:R updates live as user types, success toast on trade saved.

## Technical notes

- **Stack**: TanStack Start + React + Tailwind v4 + Lovable Cloud (Postgres + Storage + Auth). Your PRD specified PHP/MySQL — Lovable runs on this modern stack instead, which gives you the same capabilities (auth, DB, file storage, REST-style server functions) without managing a backend.
- **Database tables**: `profiles`, `trades` (all fields above + status open/closed + computed P&L), `trade_screenshots` (linked to trade, points to Storage), `no_trade_days`, `streaks` (current streak, longest streak, started_at).
- **Storage bucket**: private `trade-screenshots` bucket; signed URLs for display; per-user RLS so users only see their own uploads.
- **RLS**: every table scoped to `auth.uid()`.
- **Charts**: Recharts (already in shadcn ecosystem) for equity curve and breakdowns; custom CSS grid for the calendar heatmap.
- **Streak logic**: computed server-side on trade/no-trade-day insert, stored on the `streaks` row.

## Out of scope for v1 (per your "Lean MVP" choice)

- AI psychology engine (insights like "you lose 70% of trades on FOMO") — the data model captures everything needed, so this drops in cleanly later as an on-demand button.
- Downloadable PDF 30-day reports.
- Social profiles / sharing / leaderboards.
- Broker API, CSV import, mobile app, voice journaling.

## What you'll see after the build

A signed-in user can: log a trade end-to-end with psychology + screenshot in under 2 minutes, see their open positions, close them out with post-trade reflection, watch their stats update on the dashboard, and track their 30-day streak on the challenge page. That's the full discipline loop working.

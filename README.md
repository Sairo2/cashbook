# CashBook Ledger

Mobile-first personal expense and lending ledger. Next.js, Supabase/Postgres, Better Auth (Google), and a Telegram bot for quick lending entries.

**Status:** personal production app on Vercel. Private finances — treat env and DB as sensitive.

## Features

- 📚 **Multiple Ledgers** - Organize expenses into separate ledgers
- 💰 **Transaction Tracking** - Record cash in/out transactions
- 📊 **Beautiful Charts** - Visualize spending with interactive charts
- 🔐 **Google Auth** - Secure authentication with Better Auth
- 📱 **Mobile-First** - Designed for optimal mobile experience
- 🤖 **Telegram Bot** - Quick lending entries via Telegram

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in every key. `.env.example` is the full list (Supabase, `DATABASE_URL`, Better Auth, Telegram, cron).

### 3. Set up the database

Run the SQL scripts in your Supabase SQL Editor:
1. `supabase-schema.sql` - Main tables
2. Apply new files in `migrations/` in filename order when upgrading an existing database.

### 4. Run, test, build

```bash
npm run dev      # http://localhost:3000
npm test         # lending domain unit tests
npm run lint
npm run build
```

## Where things live

| Path | Role |
| --- | --- |
| `app/` | Pages and `app/api/*` routes |
| `components/` | App shell, feature UI, primitives |
| `lib/lending-domain.ts` | Pure lending parse/math (tested) |
| `lib/server/` | Postgres, lending service, session |
| `migrations/` | Incremental SQL for existing DBs |
| `docs/agent-handoff.md` | What changed recently |
| `AGENTS.md` | Notes for coding agents |

## Telegram Bot Setup

The LENDINGS feature allows you to record lending transactions via Telegram.

### Creating Your Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`
4. Set the bot username (without @) to `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`

### Setting Up the Webhook

After deploying, set your webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app-domain.com/api/telegram/webhook", "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"}'
```

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot / link account |
| `/help` | Show help message |
| `/status` | Check link status |

### Message Formats

**Lending money:**
```
500 john tomorrow
1000 mary 15jan
2000 rahul next week
```

**Recording repayment:**
```
received 500 john
got 1000 mary
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase (PostgreSQL)
- **Auth**: Better Auth with Google OAuth
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Charts**: Custom SVG charts

## Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com/new):

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables
4. Deploy!

Don't forget to set up the Telegram webhook after deployment.

The included Vercel Cron runs a small authenticated Supabase query every Monday.
Add the same `CRON_SECRET` value to the Vercel project environment variables;
Vercel automatically sends it as a bearer token when invoking the cron route.

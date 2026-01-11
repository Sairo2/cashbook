# CashBook Ledger

A modern, mobile-first expense tracking application built with Next.js, Supabase, and Telegram integration.

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

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Better Auth Configuration
BETTER_AUTH_SECRET=your_random_secret_here
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Telegram Bot Configuration (for LENDINGS feature)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=YourBotUsername
```

### 3. Set up the database

Run the SQL scripts in your Supabase SQL Editor:
1. `supabase-schema.sql` - Main tables
2. `supabase-schema-lendings.sql` - Telegram/Lendings tables

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

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
  -d '{"url": "https://your-app-domain.com/api/telegram/webhook"}'
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


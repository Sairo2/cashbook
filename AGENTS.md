# CashBook — agent notes

## What this is

Mobile-first personal expense and lending ledger. Next.js App Router, Supabase/Postgres, Better Auth (Google), Telegram bot for quick lending entries. Deployed on Vercel.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # node:test in tests/
npm run lint
npm run build
```

Copy `.env.example` → `.env.local` (and optionally `.env`) before running. Never commit real env files (`.env*` is gitignored).

## Layout

| Path | Role |
| --- | --- |
| `app/` | Routes and API (`app/api/*`) |
| `components/app/` | Shell, routing frames |
| `components/features/` | Ledgers, lendings, auth UI |
| `components/ui/` | shadcn-style primitives |
| `lib/` | Client store, auth, telegram parse helpers |
| `lib/server/` | DB access, lending service, session |
| `lib/lending-domain.ts` | Pure lending math/parsing (unit-tested) |
| `migrations/` | Ordered SQL upgrades for existing DBs |
| `supabase-schema.sql` | Full schema for new setups |
| `tests/` | `node --test` suites |
| `docs/agent-handoff.md` | Session timeline |

## Conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, …).
- Lending domain logic stays pure in `lib/lending-domain.ts`; HTTP and DB live in `lib/server/` and `app/api/`.
- Prefer editing schema via `migrations/` plus updating `supabase-schema.sql` so greenfield stays in sync.
- Do not commit secrets, `.vercel`, or `node_modules`.

## Do / don't

- **Do** run `npm test` before committing lending or telegram changes.
- **Do** keep Telegram message formats documented in the README when they change.
- **Don't** log tokens, webhook secrets, or full `DATABASE_URL`.
- **Don't** add a second state store alongside `lib/store.ts` without a migration plan.

## Env

All keys are listed in `.env.example`. Production also needs the same keys in Vercel, including `CRON_SECRET` for the weekly keep-alive route.

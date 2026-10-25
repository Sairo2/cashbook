# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Server-side lending service and `/api/lendings/entries` route.
- Pure lending domain module with unit tests (`tests/lending-domain.test.mjs`).
- SQL migration `migrations/20260903_unify_lendings.sql`.
- Repo agent docs (`AGENTS.md`, hand-off log) and `.env.example`.

### Changed

- Lending UI dialogs and dashboard wired through the unified domain/store path.
- Telegram webhook/helpers slimmed to use shared lending parsing.
- Schema and Supabase helpers updated for the unified lending model.

## [0.1.0] - 2026-08-17

### Added

- Weekly Supabase keep-alive cron.
- Core ledgers, transactions, charts, Google auth, Telegram lending entry.

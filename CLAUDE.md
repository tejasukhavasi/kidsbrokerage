# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kids Brokerage is a Next.js 14 (App Router) full-stack application for managing children's brokerage accounts. Built with TypeScript, Prisma ORM, and PostgreSQL. Deployed on Vercel.

## Commands

- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint with Next.js rules
- `npm run prisma:generate` — Generate Prisma client types
- `npm run prisma:migrate` — Run database migrations
- `npx prisma db push` — Push schema changes without migration files (useful in dev)

No test framework is currently configured.

## Architecture

**Routing:** Two pages only — home (`/`) lists all kids/accounts, detail (`/accounts/[id]`) shows account transactions and ticker history.

**Data flow:** Server Components fetch data directly via Prisma. Mutations use Next.js Server Actions defined in `app/actions.ts`, which call `revalidatePath()` after writes. No API routes, no client-side state management.

**Server Actions:** `createKid`, `createAccount`, `addTransaction`, `setMarketTicker` — all accept `FormData`.

**Database models:** `Kid` → has many `Account` → has many `Transaction` and `MarketTickerEvent`. Cascading deletes configured. Amounts stored in cents (integers). Ticker history is append-only with effective dates.

**Utilities:** `lib/money.ts` has `dollarsToCents()`/`centsToDollars()` for currency conversion. `lib/prisma.ts` exports the Prisma singleton.

**Path aliases:** `@/*` maps to project root.

## Environment

Requires `DATABASE_URL` in `.env` pointing to a PostgreSQL instance. See `.env.example`.

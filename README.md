# Kid Brokerage App

A Next.js app for managing brokerage-like accounts for multiple kids with:

- Separate kid profiles
- Account types: Checking, Savings, Market
- Deposits + withdrawals (including backdated entries)
- Market ticker assignment/history for Market accounts
- Persistent database via PostgreSQL + Prisma (Vercel friendly)

## Tech

- Next.js (App Router)
- Prisma ORM
- PostgreSQL database (Neon/Supabase/RDS all work)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   ```

   Then set `DATABASE_URL`.

3. Push schema to your DB:

   ```bash
   npx prisma db push
   ```

4. Start development server:

   ```bash
   npm run dev
   ```

## Deploying to Vercel

1. Create a managed Postgres instance (Neon or Vercel Postgres).
2. Add `DATABASE_URL` in Vercel project environment variables.
3. Deploy this repo.
4. After first deploy, run:

   ```bash
   npx prisma db push
   ```

   (or use migrations if you prefer that workflow)

## Notes

- Account balances are computed from all transactions (`deposit - withdrawal`).
- Ticker history is append-only and supports backdating with an effective date.

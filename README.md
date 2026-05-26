This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend (Supabase)

The app works fully offline — without any backend it falls back to IndexedDB —
but to enable accounts and cross-device sync you'll want Supabase.

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
3. Apply the schema:
   - **CLI:** `supabase db push` (with the Supabase CLI linked to your project), or
   - **Dashboard:** SQL Editor → paste `supabase/migrations/20260526120000_init.sql`
     → Run.
4. (Dev convenience) Auth → Providers → Email → toggle off "Confirm email" so
   signups log in immediately. Re-enable for production.

When the env vars are present, the app gates `(app)` routes behind sign-in and
reads/writes user data through Supabase. When they're absent, every storage
operation falls back to IndexedDB on the device — useful for offline demos.

## Testing

Two layers of tests live in the repo:

- **Unit tests** (Vitest) under `lib/__tests__/` — pure utility functions
  (PRs, 1RM math, SMA-7, mappers between camelCase records and the snake_case
  Supabase schema). Fast, no browser, no network.
- **End-to-end smoke** (Playwright) under `e2e/` — boots `next dev` against the
  unconfigured-Supabase fallback path and walks every public route to make sure
  it returns 200 and doesn't crash the client.

```bash
npm test              # unit tests, single run
npm run test:watch    # unit tests, watch mode
npm run test:e2e      # browser smoke (requires `npx playwright install chromium` once)
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

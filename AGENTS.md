<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. If `node_modules/next/dist/docs/` exists, read the relevant guide there before writing any code; if it is not present in this install, rely on the official Next 16 documentation and the conventions already used in this repo instead. Do not reach for Next/React APIs from model memory alone, and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FitFlow / GymApplication Agent Rules

These instructions are mandatory for Codex and every AI coding agent working in this repository.

The goal is to preserve and extend the architecture that already exists in this app. Do not invent a new architecture unless the requested task explicitly requires a migration.

## Project Snapshot

This is a Polish fitness application named FitFlow/GymApplication.

Current stack and conventions:

- Next.js App Router, currently Next `16.2.6`.
- React `19.2.4`.
- TypeScript with `strict: true`.
- Tailwind CSS v4 with CSS variables in `app/globals.css`.
- shadcn/radix-nova UI configured through `components.json`.
- lucide-react icons.
- Zustand for client-side application state.
- React Hook Form + Zod (`@hookform/resolvers/zod`) for structured profile/settings/onboarding forms; Zustand-driven drafts for the workout editor. See "Forms and Mutations".
- Supabase integration through dedicated `lib/supabase-*` modules and `supabase/migrations`.
- Polish UI copy through `lib/i18n/pl.ts` and `useDictionary`.
- Root-level `@/*` import alias. There is no `src/` directory.

## Repository Shape

Respect the existing root-level structure:

- `app/` — Next App Router routes, route groups, layouts, metadata, API routes.
- `features/` — feature-level views and feature-specific components.
- `components/ui/` — reusable shadcn/radix-style primitives.
- `components/shared/` — app-level shared UI components.
- `components/layout/` — shell, sidebar, mobile navigation, nav config.
- `hooks/` — reusable client hooks.
- `lib/` — utilities, i18n, constants, Supabase seams, domain helpers, Garmin/progress/session helpers.
- `store/` — Zustand stores and selectors.
- `types/` — domain types and re-exports.
- `data/` — seed/mock/static data and current in-memory app data.
- `supabase/migrations/` — SQL migrations.
- `lib/__tests__/`, `tests/integration/`, `e2e/` — test coverage locations.

Do not move the project into `src/`.

## App Router Rules

- Route files in `app/` should stay thin.
- Pages should usually import and render a feature view, for example `app/(app)/plan/page.tsx` rendering `PlanView`.
- Put feature logic in `features/<feature>/`, not directly inside `page.tsx`.
- Add `metadata` where appropriate and use the existing dictionary/brand patterns.
- Preserve route groups such as `(app)` and `(auth)`.

## Client and Server Boundaries

- Use `"use client"` only when a file uses hooks, browser APIs, local state, Zustand, event handlers, or client-only UI.
- Keep server-compatible files server-compatible by default.
- Do not import client-only stores/hooks into server-only modules.
- Do not move client state into server components.
- Before using a Next API, consult the Next docs as described at the top of this file rather than relying on model memory.

## Feature Structure

Follow the existing feature-first pattern:

- `features/<feature>/<feature>-view.tsx` for the main feature view.
- `features/<feature>/components/*` for feature-specific pieces.
- Reusable primitives belong in `components/ui/`.
- Shared app-level components belong in `components/shared/`.
- Layout pieces belong in `components/layout/`.

Prefer small composed components over one large component, but avoid extracting abstractions that are used only once and do not improve clarity.

A few older features (`auth/`, `history/`, `metrics/`) predate the `components/` subfolder convention and keep their pieces in the feature root. This is the legacy shape, not the target. Use the canonical `features/<feature>/components/*` layout for new code, and when you add new components to those older features, place them under `components/`. Do not do a wholesale reorganization as part of an unrelated task.

## UI and Styling

- Use existing `components/ui/*` primitives before adding new UI.
- Use `cn` from `@/lib/utils` for conditional classes.
- Preserve Tailwind v4 and CSS variable tokens from `app/globals.css`.
- Use tokens such as `bg-background`, `text-foreground`, `card`, `primary`, `muted`, `border`, and `sidebar`.
- Do not hardcode colors when a token or existing constant exists.
- Keep class strings literal when Tailwind must detect them, especially for dynamic badge maps.
- Use lucide-react icons consistently.
- Keep mobile-first responsive behavior consistent with the existing app shell.
- Use semantic HTML and accessible labels for interactive elements.

## State Management

Zustand is the current state strategy.

- Put global/client app state in `store/`.
- Export public stores/selectors through `store/index.ts` when they are intended for broad use.
- Keep selectors pure and deterministic.
- Use immutable updates.
- Reuse existing stores before creating new ones.
- Do not add TanStack Query, Redux, Jotai, or another state library unless the task explicitly requests it.

Current examples to follow:

- `usePlanStore` for weekly plan state and selectors.
- `useWorkoutDraftStore` for workout draft/edit state.
- Session/profile/progress-related stores should follow the same style when present.

## Data and Supabase

The app uses both seed/static data and Supabase integration seams.

- Use `data/` for seed/mock/static data that powers current UI flows.
- Use `lib/supabase/client.ts`, `lib/supabase/server.ts`, and dedicated `lib/supabase-*` files for Supabase access.
- Do not call Supabase directly from visual components if a `lib/supabase-*` helper exists or should exist.
- Keep database row mapping isolated in `lib/` helpers.
- Keep TypeScript domain models in `types/` and map database rows to those models explicitly.
- Do not assume Supabase is configured unless an existing configuration check confirms it.
- When changing schema, add or update SQL migrations in `supabase/migrations/`.
- Do not place private runtime values in committed files.

## Types

- Use strict TypeScript.
- Do not use `any` unless there is no practical alternative and it is justified with a local comment.
- Prefer domain types from `@/types`.
- Add new domain types beside related types in `types/`, then re-export from `types/index.ts` if shared.
- Keep union types explicit for domain concepts such as weekdays, workout types, muscle groups, categories, statuses, and units.
- Avoid duplicating type definitions across files.

## i18n and Copy

The UI is Polish-first.

- Do not hardcode user-facing copy in components when it belongs in `lib/i18n/pl.ts`.
- Use `useDictionary()` inside client components.
- Use `getDictionary()` in server-compatible files such as route metadata.
- Keep dictionary keys grouped by feature.
- When adding a feature, add dictionary entries in the same style as the existing `pl` object.

## Domain Logic

- Put reusable calculations and transformations in `lib/*-utils.ts`.
- Keep utility functions pure where possible.
- Add or update tests for non-trivial domain utilities.
- Reuse helpers such as workout/session/history/stats utilities before writing new logic.
- Do not duplicate calculations like workout volume, duration estimates, week/day mapping, session totals, or history mapping.

## Forms and Mutations

The app has two established, sanctioned form patterns. Pick the one that matches the area you are working in — do not introduce a third form library.

1. React Hook Form + Zod — for structured input forms such as profile, settings, and onboarding.
   - Use `useForm` with `zodResolver` from `@hookform/resolvers/zod`.
   - Keep the Zod schema in a `lib/**/schema.ts` module (for example `lib/profile/schema.ts`, `lib/progress-photos/schema.ts`) and reuse it for both validation and inferred types.
   - Follow the existing examples in `features/settings/components/*` (`profile-section.tsx`, `training-section.tsx`, `weight-goal-section.tsx`) and `features/onboarding/onboarding-flow.tsx`.
   - Use `components/shared/form-field.tsx` for the label/control/error wrapper.

2. Store-driven drafts — for the workout editor.
   - Follow `features/workout-form` backed by `useWorkoutDraftStore`. Commit logic stays close to the store.

For new forms, default to React Hook Form + Zod unless the work belongs to the workout-draft flow, which stays store-driven.

In both patterns:

- Validate before committing state or persisting data.
- Show feedback with existing `sonner` toast patterns where appropriate.
- Keep save/commit logic close to the relevant store or domain helper, not scattered across many components.

## Routing and Navigation

- Use `next/link` for navigation links.
- Use `useRouter` only inside client components and only when imperative navigation is needed.
- Keep nav items centralized in `components/layout/nav-items.ts` or the existing layout config.
- Preserve the app shell pattern: route layout renders `AppShell`, feature pages render feature views.

## Testing

Before considering a task complete, run the most relevant available checks.

Required baseline:

- `npm run lint`
- `npm run build` when the change touches routing, Next config, server/client boundaries, metadata, or shared UI.

When relevant, also run or update:

- unit tests in `lib/__tests__/`
- integration tests in `tests/integration/`
- e2e tests in `e2e/`

If a test script is missing from `package.json`, do not invent results. State that the repository currently exposes only the available scripts.

## Coding Standards

- Use `@/` imports for internal modules.
- Keep import groups clean: external packages, internal aliases, relative imports.
- Prefer named exports for app components, hooks, stores, and utilities.
- Keep component props typed inline for small components, or with named interfaces/types for larger/reused components.
- Keep files focused.
- Avoid overengineering abstractions for one-off UI.
- Prefer clarity over cleverness.
- Preserve existing naming conventions.

## Forbidden Patterns

Do not:

- rewrite unrelated files
- perform broad refactors while implementing a small task
- introduce a new state library without explicit request
- introduce another form library beyond the adopted React Hook Form + Zod and store-driven patterns without explicit request
- introduce a new UI library without explicit request
- move the project into `src/`
- bypass strict TypeScript
- silence ESLint without fixing the cause
- add `any` as a shortcut
- hardcode user-facing Polish copy in components when it belongs in the dictionary
- duplicate domain calculations already present in `lib/`
- access Supabase directly from feature UI when a lib/service layer should be used
- remove existing mock/seed flows unless replacing them deliberately with working persistence
- change global design tokens casually
- change Next/React APIs based only on model memory

## Before Editing

For every task:

1. Inspect the relevant route, feature, store, types, data, and lib helpers.
2. Identify the existing pattern in nearby files.
3. Reuse existing components and utilities first.
4. Make the smallest coherent change.
5. Preserve current architecture and Polish UX.
6. Check TypeScript and lint impact.

## Feature Implementation Order

Use this order when implementing a feature:

1. Add/update domain types in `types/` if needed.
2. Add/update data or Supabase helper in `data/` or `lib/` if needed.
3. Add/update Zustand store/selectors in `store/` if client state is needed.
4. Add/update dictionary copy in `lib/i18n/pl.ts`.
5. Add feature view/components in `features/<feature>/`.
6. Add/adjust route file in `app/`.
7. Add/update tests for non-trivial logic.

## Definition of Done

A change is complete only when:

- it follows this `AGENTS.md`
- it preserves the current project structure
- TypeScript remains strict and clean
- lint/build impact has been checked
- user-facing text is Polish and dictionary-backed where appropriate
- UI remains responsive and consistent with the existing design system
- no unrelated files were modified
- domain logic is not duplicated
- tests are added or updated when logic changes

## If Unsure

- Prefer existing architecture over new abstractions.
- Search for similar code in `features/`, `store/`, `lib/`, and `types/`.
- Follow the closest existing pattern.
- If a requested change conflicts with this architecture, explain the conflict and propose the smallest safe migration path.

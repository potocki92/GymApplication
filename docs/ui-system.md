# UI system

The app has one visual language: **premium dark**. Black canvas, graphite
surfaces, near-white for anything active, and a single green for data. It is
calm on purpose — colour carries meaning, never decoration.

This document is the contract. If you are about to write `rounded-xl bg-[#161616]
border border-[#2b2b2b]` by hand, or to open a form in a centered dialog, read
the relevant section first.

---

## 1. Tokens

All tokens live in `app/globals.css`. There is exactly one theme: `:root` carries
it and `.dark` overrides nothing — the `dark` class on `<html>` only exists to
activate the `dark:` variants baked into the shadcn primitives. **Never re-add a
mirrored `.dark` palette block**; it only drifts.

### Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#050505` | The page canvas. |
| `--card` (`bg-card`, `bg-surface`) | `#161616` | Every panel. This is `Card`. |
| `--surface-raised` | `#1B1B1B` | Inputs, sheets, popovers, one step up from a card. |
| `--surface-interactive` | `#202020` | Resting state of a graphite control. |
| `--surface-hover` | `#2B2B2B` | The hover step. Opaque, so a control hovers to the same colour on `--background` and inside a card. |
| `--border` | white @ 9% | The only edge treatment. No shadows for elevation. |

### Meaning

| Token | Use |
| --- | --- |
| `--primary` / `--primary-foreground` | Near-white on near-black. **Active, selected, confirm.** The only high-contrast control. |
| `--data` (`text-data`, `bg-data`) | `#6ABC7E`. **Data, success, achieved, on track, live.** `--success` is an alias of it by definition. |
| `--data-muted` | Dimmer green for a supporting series. |
| `--muted-foreground` | `#8E939A`. Secondary text. |
| `--destructive` | Semantic red. Destructive actions and real errors only. |
| `--warning` | Semantic amber. Real warnings only — **not** achievements, not "highlight this". |
| `--info` | Semantic blue. Rarely needed. |
| `--accent` | **Not a brand colour.** This is shadcn's hover/focus surface for dropdown/select/command. It is graphite and should stay graphite. |

**Rule of thumb:** if you cannot say what a colour *means*, use graphite and let
the icon or the label do the work.

### Radius

`--radius` is `0.75rem` (12px). Cards land at `rounded-xl` (15px), controls at
`rounded-lg` (12px), sheets at `rounded-t-3xl`, chips and segments at
`rounded-full`.

### Motion

`--duration-fast` (140ms) for hover/fade/colour, `--duration-med` (240ms) for
reveals. Spring is reserved for `AppSheet`, where a physical drag exists.
Everything honours `prefers-reduced-motion`. Do not animate something just
because you can.

---

## 2. Typography

| Level | Style |
| --- | --- |
| Eyebrow | `SectionLabel` — 10px, uppercase, `tracking-[0.14em]`, muted. |
| Page title | `PageHeader` — 22–24px, semibold, white, sentence case. |
| Section title | `SectionHeader` — 16px semibold. |
| Body | 14px; secondary text is `text-muted-foreground`. |
| Metrics | `StatValue` — `font-numeric`, tabular, semibold. |

`SectionLabel` is the **only** place uppercase type is allowed. Titles are never
uppercase, never `font-black`, and never colour a single word.

---

## 3. Surfaces: `Card`

`Card` is the base surface. Use it for every panel.

```tsx
<Card>…</Card>                 // static panel
<Card size="sm">…</Card>       // tighter padding
<Card interactive>…</Card>     // the whole card is a link/button
```

Only `interactive` cards get a hover response — that is what keeps static panels
visually inert. Do not hand-roll `bg-card ring-1 ring-border rounded-xl`.

---

## 4. Overlays — the important one

The app has **one** overlay for working interactions. Getting this wrong is what
produced the inconsistency this system replaced.

### `AppSheet` (`components/ui/app-sheet.tsx`)

Bottom-anchored at **every** breakpoint. On desktop it stays pinned to the bottom
edge and caps its width (`sm` 480 / `default` 600 / `lg` 680) instead of
re-centering — the same interaction must not change its mental model between
phone and laptop.

```tsx
<AppSheet
  open={open}
  onOpenChange={setOpen}
  title={t.…}
  description={t.…}   // optional
  size="default"      // "sm" | "default" | "lg"
  locked={saving}     // blocks swipe + ESC + outside click, hides close
  loading={busy}      // spinner overlay, implies locked
>
  <AppSheetBody>…</AppSheetBody>
  <AppSheetFooter>
    <Button variant="ghost" …>{t.common.cancel}</Button>
    <Button …>{t.common.save}</Button>
  </AppSheetFooter>
</AppSheet>
```

Layout is three flex rows — header / body / footer — and **only the body
scrolls**. The footer is a flex sibling, not `position: sticky`, so the action bar
survives the soft keyboard. Never nest a second scroll container (a fixed-height
`ScrollArea`) inside the body.

For a form, wrap body + footer in `<form className="contents">` so they stay
direct flex children.

**Use `AppSheet` for:** filters, create/edit forms, pickers, exercise/template
selection, settings, calculators, short detail panels, goal editing, metric
entry, workout actions, photo upload and editing.

### `ConfirmDialog` (`components/shared/confirm-dialog.tsx`)

The only centered dialog in product code, and only for short destructive
confirmations — "Usunąć trening?", "Zakończyć trening?".

Confirming does **not** auto-close: close it from `onConfirm`. That is deliberate,
so callers whose dismissal has its own meaning (discarding a recovered session)
do not fire both paths on one click.

### Sanctioned exceptions

| Surface | Why |
| --- | --- |
| Command palette (`components/ui/command.tsx`) | A distinct global pattern; keeps its own centered dialog. |
| Rest timer (`rest-timer-modal.tsx`) | Full-screen immersive takeover during a set. |
| Camera capture, fullscreen photo viewer | Full-bleed media UI. |
| Active workout, workout editor, onboarding | Long workflows — these are pages, not overlays. |

Everything else is an `AppSheet`. `components/ui/sheet.tsx` and
`components/ui/bottom-sheet.tsx` were deleted; do not reintroduce them.

---

## 5. Filters

Filtering looks and behaves identically everywhere.

```tsx
<FilterTrigger onClick={open} activeCount={n} />

<FilterSheet open={…} onOpenChange={…} onReset={reset} activeCount={n}>
  <FilterSection label={t.…}>
    <SegmentedControl … />      {/* 2–4 exclusive options */}
  </FilterSection>
  <FilterSection label={t.…}>
    <ChipFilter … />            {/* many options, one choice */}
  </FilterSection>
</FilterSheet>
```

`FilterTrigger` is a large graphite control with a `SlidersHorizontal` icon, the
label "Filtry" and an active-filter counter. Reset is always bottom-left, Zastosuj
always bottom-right. Do not build inline filter bars, filter popovers or
per-feature filter dropdowns.

---

## 6. Controls

| Component | Use |
| --- | --- |
| `SegmentedControl` | One of 2–4 **views or modes**. Graphite track, near-white capsule, sliding indicator. Radiogroup semantics with arrow-key roving focus. |
| `Tabs` | Only when you genuinely need tab panels with many sections (e.g. Settings). Styled to match `SegmentedControl`. |
| `ChipFilter` / `ToggleChip` | One choice out of many (muscle group, category, pose). Selected chip is a near-white capsule. |
| `ListRow` | The standard row: leading thumb, title, meta badges, trailing value, chevron. |
| `MetricCard` + `StatValue` | Every KPI. Uppercase label, one large value, optional hint, optional muted icon on the right. |

`SegmentedControl` is **not** navigation — moving between full pages stays
`Link` + the nav config.

### Buttons

| Variant | Look | Use |
| --- | --- | --- |
| `default` | Near-white on near-black | The one primary action. |
| `outline` | Card surface + hairline border | The default quiet control. |
| `secondary` | Graphite fill | Alternative quiet control. |
| `ghost` | No fill, graphite hover | Cancel, icon buttons, toolbars. |
| `destructive` | Tinted red | Delete, discard. |

Heights: `sm` 32, `default` 36, `lg` 40, `icon-lg` 40. Inputs and selects share
one ladder (`sm` 36 / `default` 40 / `lg` 44) and one graphite surface. Field text
stays `text-base` below `md` — under 16px iOS Safari zooms on focus.

---

## 7. Charts

Charts consume `components/shared/chart/chart-theme.ts`. Never inline hex.

- **One green series** carries the data (`CHART_COLORS.primary`).
- Add `CHART_COLORS.neutral` only for a genuine comparison (a dual-axis chart).
- `warning` / `destructive` only when the colour means something.
- Grid is `--border` at 3-3 dash; axis labels are `--muted-foreground`; the
  tooltip is a graphite mini-card with the system border and radius.

Heart-rate zone bands are a deliberate exception: the blue→green→amber→orange→red
ramp is domain meaning, not decoration.

---

## 8. Navigation

`components/layout/nav-items.ts` is the single source of truth. `NAV_ITEMS` and
`NAV_SECTIONS` drive every surface; the mobile lists are **derived**, never
hand-written.

- **Mobile** — `MobileBottomNav`: four pinned destinations
  (`MOBILE_PRIMARY_NAV_KEYS`: Pulpit, Plan, Kalendarz, Postęp) plus "Więcej",
  which is not a route — it opens an `AppSheet` listing
  `MOBILE_MORE_NAV_SECTIONS`. Respects `env(safe-area-inset-bottom)`.
- **Desktop** — `Sidebar`, collapsible, same white-active language.
- **Header** — thin bar: brand (mobile), search-as-command, notifications, live
  session timer. It carries no navigation.

Active is white/foreground; inactive is muted. No large coloured highlights.

The two nav landmarks must keep **distinct** accessible names
(`nav.primaryLabel` / `nav.sidebarLabel`) — two `<nav>`s called "REPIFY" are
indistinguishable to a screen reader.

**Full-screen routes** (`isFullscreenRoute`, currently `/workout/active` and
`/plan/new`) hide the bottom bar: they run a long workflow and carry their own
bottom action bar, so two bars would stack at the same edge, and leaving
mid-workflow should be deliberate. Add a route there whenever you build a screen
with its own fixed/sticky bottom bar.

To add a destination, add it to `NAV_ITEMS` with a `section` and a `t.nav` key.
It appears in the sidebar and in "Więcej" automatically.

---

## 9. Copy

Every user-visible string lives in `lib/i18n/pl.ts` and is read through
`useDictionary()` (or `getDictionary()` in server files). That includes
`aria-label`, `sr-only` text and placeholders. Shared UI words live under
`common` (`close`, `apply`, `reset`, `filters`, `more`, …).

---

## 10. When to create a new reusable component

Create one when **all** of these hold:

1. The same visual pattern exists in **three or more** places, or in two places
   that must stay identical by design (filters, overlays, nav).
2. It is a *presentation* concern — no feature-specific business logic.
3. You can name it after what it **is**, not where it is used.

Then place it:

- `components/ui/` — style-only primitives with no app knowledge
  (`Card`, `Button`, `AppSheet`, `SegmentedControl`, `SectionLabel`).
- `components/shared/` — app-level compositions that may use the dictionary and
  domain types (`MetricCard`, `FilterSheet`, `ListRow`, `ConfirmDialog`).
- `features/<feature>/components/` — everything tied to one feature.

Do **not** abstract something used once. Do **not** solve a consistency problem
by repeating the same Tailwind string in a dozen files — fix the primitive.

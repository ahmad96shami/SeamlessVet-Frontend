# CLAUDE.md — Field Mobile App

React Native + Expo (Expo Router) client for **field doctors**: offline-first via
PowerSync (local SQLite mirror) + a REST-intent offline queue for money writes.
Arabic-first; RTL is **forced** at startup (`src/lib/rtl.ts`).

## Design system (MoD milestone — follow it, don't drift)

- **Single token source: `src/theme/tokens.js`.** It feeds BOTH `tailwind.config.js`
  (every colour/radius/shadow class) and runtime code (`import { colors, shadow } from "@/theme"`).
  **Never hardcode a hex anywhere else** — react-native-svg icons take `color={colors.teal[600]}`,
  not a literal. The one sanctioned exception is the illustration ART palette inside
  `src/components/icons/Icon3D.tsx`. Tuning a colour (e.g. the muted amber/rose) is a
  one-line change in tokens.js.
- **Palette**: navy 900 `#223D69` (primary/CTA/headings), teal 500 `#1A8FA1` (accent/confirm),
  ink greyscale (text/borders/canvas `ink-50`), paper white, DUSTY semantics
  (amber `#B5915A`, emerald `#2BB673`, rose `#A96A6F` + `soft`/`ink` variants — `ink` carries
  text, DEFAULT is icon/accent duty). Semantic colour is for MEANING only (warning/overdue/
  destructive/debit) — never decorative highlights. Locked: no runtime theme switching.
- **Typography**: Tajawal only — classes `font-tajawal` / `font-tajawal-bold` / `font-tajawal-extrabold`.
  Scale: 11 tab · 12 meta/pill · 13 sub/labels · 14 body · 15 row-title/button · 16 greeting ·
  18 TopBar/headline · 22 stat/state-hero · 26 login · 32 amount entry. Every `Text` carries a font class.
- **Numerals**: **Latin digits APPWIDE, in both languages — no Arabic-Indic (٠-٩) anywhere**
  (money, counts, quantities, times, dates). Money-ish amounts via `formatAmount`
  (`src/lib/numerals.ts` → shared `formatNumber`), quantities via shared `formatQuantity`,
  dates via shared `formatDate`/`formatDateTime` (already `-u-nu-latn`-pinned); plain counts
  render the number directly.
- **Primitives** (`src/components/ui` + `src/components/layout`) — compose these, don't hand-roll:
  - Rows/cards: `Card`, `ListRow` (leading `IconTile`/`Photo` → title 15/800 → sub 13 ink-500 →
    meta `Pill compact` row → trailing slot; `selected` = teal ring), `Voucher` (ticket cutouts).
  - Controls: `Button` (primary navy / teal / soft / ghost / destructive rose), `Chip` (filter; navy/teal active),
    `SegmentedTabs`, `Stepper`+`AddButton`, `Input` (label/error built in), `AmountEntry`, `FieldLabel`.
  - Display: `Pill` (+`compact`), `Stat`, `IconTile` (sm 36 / md 44 / lg 64, tinted, optional warn `badge`),
    `Money`, `Divider` (+`dashed`), `InfoBanner` (teal/neutral), `StateHero` (success/pending/empty),
    `QuickAction`, `TimeBox`, `Photo`/`Icon3D` (clay avatars via `photoKindForCustomerType`/`photoKindForFarmKind`).
  - Layout: `ScreenShell` (bg + safe area + header/footer slots), `TopBar`, `StepHeader` (wizard),
    `Footer` (row INSIDE ScreenShell's footer slot — the shell owns bg/border/insets), `NavBottomBar`,
    `Sheet` (bottom-sheet shell: backdrop FADES in place, panel SLIDES — never use
    `Modal animationType="slide"`, it slides the whole subtree including the scrim).
  - Animations: **react-native-reanimated only** (shared value + `useAnimatedStyle` worklets,
    `runOnJS` for post-animation state) — never RN `Animated`. Reanimated `Animated.View`s stay
    className-free (style-only); plain inner Views carry the design classes. Navigation stacks
    use `animation: "fade"` + `freezeOnBlur: true` (blurred watched-query screens must not
    re-render on sync ticks).
  - Popups: **never `Alert.alert`** (native chrome breaks the design + differs per platform) —
    use the `dialog` service (`@/stores/dialogStore`, plain TS, works outside components):
    `dialog.alert(title, msg?)`, `await dialog.confirm({ title, msg, confirmLabel, destructive? })`,
    `dialog.choose(title, options)`. `DialogHost` is mounted once in the root layout.
- **NativeWind rules**: className-first; **never interpolate class names** (purge!) — tone maps are
  `Record`s of full literal strings (see `Button`/`Pill`). **Shadows via the token STYLE objects
  (`style={shadow.card}`), NEVER the `shadow-card`/`shadow-pop` classes**: Tailwind shadow classes
  carry CSS variables, and a component whose class set flips across re-renders (flat↔shadowed Card,
  selected ListRow) makes css-interop "upgrade" it after first render — its dev warning then crashes
  with "Couldn't find a navigation context". The token objects carry iOS shadow* + Android elevation
  together. A styled component whose class set FLIPS across a conditional at the same tree
  position (e.g. empty `Card flat` ↔ shadowed data `Card`) must carry distinct `key`s so React
  REMOUNTS it — an in-place css-interop restyle can drop the background's border radius (and
  once crashed dev). Logical utilities only (`start`/`end`, `ps`/`pe`) — and since RTL is
  forced, use `flex-row` (never `flex-row-reverse`; that double-reverses).
- **Audit gates** (keep green): `grep -rn '#[0-9A-Fa-f]\{6\}' app src` must hit only
  `theme/tokens.js` + `Icon3D.tsx`; `grep -rnP '[٠-٩]' app src` must return nothing;
  no `row-reverse`; every `Text` has a `font-tajawal*` class.

## Data & writes (don't bypass)

- Reads: `useQuery` from `@/sync/hooks` over the local SQLite mirror (`src/sync/schema.ts`).
- Row CRUD: `syncInsert/syncUpdate/syncDelete` (`src/sync/writes.ts`) → PowerSync drains to `/sync/{table}`.
- Money/inventory: shared `build*Request` descriptors via `sendOrQueue` (`src/services/sendOrQueue.ts`) —
  stable idempotency keys, business 4xx conflicts re-throw (surface them). The server assembles +
  prices field invoices (`items: []`); on-device totals are estimates ("تقديري").
- The new-visit wizard (`app/visits/new/`, `visitWizardStore`) composes those writers only. Its
  confirm DRAINS PowerSync's upload queue before issuing invoices (or parks the descriptor in the
  REST queue, which the engine replays PowerSync-first) — clinical rows must reach the server before
  the invoice endpoint auto-assembles them, or it answers "nothing to bill".

## Gotchas

- `@vet/shared` is consumed from `dist` — after editing shared (i18n/schemas), run
  `pnpm --filter @vet/shared build` or the app won't see it. New strings go in BOTH `ar.json` + `en.json`.
- Typed routes (`experiments.typedRoutes`): new route files aren't in the generated manifest until the
  dev server runs — use the existing `router.push("…" as never)` cast, or hand-patch
  `.expo/types/router.d.ts` for local `tsc`.
- QA per change: `pnpm --filter mobile exec tsc --noEmit` + `pnpm --filter mobile exec eslint .`.
  Metro hot-reload covers JS-only changes; `expo run:android` only when native deps change
  (`adb reverse tcp:5180` + `tcp:8080` for API + PowerSync). RN `Pressable` on-device taps via
  `adb shell input swipe x y x y 100`, not `input tap`.
- Bracket paths (`[id]`) in git commands need `GIT_LITERAL_PATHSPECS=1` or quoting.

# Mobile Field App — design source

The `seamlessvet-v3/` subdirectory is the **SeamlessVet v3** Anthropic Design
handoff bundle — the HTML/CSS/JSX prototype that the mobile app's design
foundation was ported from in commits `f57e8d7..cc0a439` (DF.1–DF.6).

Why this lives in the repo: the source is what a future Mo2+ chat reads to port
each screen (`screen-visit.jsx`, `screen-inventory.jsx`, `screen-finance.jsx`,
…) into RN with the primitives already in `apps/mobile/src/components/`. Without
it the porting target is gone — `/tmp` doesn't survive a reboot, and the
WebFetch cache is 15-minute TTL.

## What's here

- `seamlessvet-v3/README.md` — the design tool's own "agents read this first"
  notes. Tells you to read the chat first and to follow the JSX top-to-bottom.
- `seamlessvet-v3/chats/chat1.md` — the user-↔-design-assistant transcript.
  Captures *why* each screen looks the way it does. Read before porting.
- `seamlessvet-v3/project/*.jsx` — the per-screen sources
  (`screen-auth / screen-home / screen-visit / screen-inventory / screen-finance`)
  + the shared `primitives.jsx` icon set and the `app.jsx` flow router.
- `seamlessvet-v3/project/styles.css` — the design-token source. Mirrored into
  `apps/mobile/tailwind.config.js` in commit `f57e8d7`; keep it here as a
  cross-reference so a token tweak is one diff away.
- `seamlessvet-v3/project/SeamlessVet.html` / `…-print.html` — the rendered
  prototypes. Open in a browser if you want to see the design exactly as the
  designer saw it; otherwise the JSX + CSS spell out everything you need.

## What was deliberately not copied

The full archive is ~7 MB; the slim subset above is ~260 KB. The skipped
content lives in the original archive only:

- `project/uploads/` — the user's scope-of-work PDF + reference photos. Not
  needed for porting.
- `project/vet-hero.png` + `project/uploads/vet-pet.png` etc. — large hero
  images used inside the rendered prototype. Their *placement* and *intent* are
  visible in the JSX/HTML; the actual bytes aren't needed for the RN port.
- `project/.design-canvas.state.json` / `.thumbnail` — design-tool metadata.

If you ever need the full archive, the source URL is recorded in the
`mobile-design-foundation` memory note.

## How to use this in Mo2+

1. Read [`seamlessvet-v3/chats/chat1.md`](./seamlessvet-v3/chats/chat1.md) for
   intent.
2. Open the screen file you're porting (e.g.
   [`seamlessvet-v3/project/screen-visit.jsx`](./seamlessvet-v3/project/screen-visit.jsx)).
3. Re-implement in RN using `@/components/ui`, `@/components/layout`,
   `@/components/icons`, and the tokens in `tailwind.config.js`. Don't copy the
   JSX 1:1 — match the visual output (the design archive README is explicit
   about this).
4. Vanilla CSS classes in the source (`.btn`, `.card`, `.pill`, `.sv-screen`,
   …) map 1:1 to the primitives in `@/components/ui` and `@/components/layout`
   — see [`mobile-design-foundation`](../../../../home/ahmadshami/.claude/projects/-home-ahmadshami-projects-SeamlessVet/memory/mobile-design-foundation.md)
   for the mapping.

# SPLITDEV — Agent Instructions

> SPLITDEV is "The Writer's Atelier": a screenplay editor with AI-agent
> collaboration. This repo is the V1 implementation, ported from the
> `SPLITDEV Redesign.html` prototype (in `docs/handoff/` if archived locally).

## What this app is

- **Domain**: Screenwriting tool. Manuscript editor + index cards + side notes
  + chat panel where the writer corresponds with named AI "agents" (Dialogue,
  Structure, Character, Horror, Conflict, Theme) and with the characters
  themselves (via a Character Bible).
- **Aesthetic**: Warm parchment + ink, editorial serif display type, Courier
  Prime for the screenplay body. The visual language is tactile paper-craft:
  sticky notes, ink stamps, clapboard accents, draft stamps. **Don't drift
  toward the generic SaaS look.** When in doubt, lean editorial.

## Stack

- **Vite 5** + **React 18.3** + **TypeScript 5.6** (strict mode on)
- No CSS framework. Inline styles via the shared `RD` token object at
  [`src/tokens.ts`](src/tokens.ts). Always pull colors/spacing from `RD`, not
  raw hex. If you need a new token, add it there.
- Fonts loaded via Google Fonts in [`index.html`](index.html): Cormorant
  Garamond, DM Sans, Courier Prime.
- All data is currently mocked in `src/data/`. There is no backend yet.

## Layout

```
src/
├── main.tsx           # React root
├── App.tsx            # Top-level shell + resizable panes + global state
├── tokens.ts          # RD design tokens — SINGLE SOURCE OF TRUTH for visuals
├── types.ts           # Shared TypeScript types
├── data/              # Mock fixtures: agents, screenplay, notes, characters
└── components/        # One file per major panel
```

## Conventions

- **TypeScript strict; no `any`.** Use the shared types in `src/types.ts`. When
  modeling new data, add the type there first.
- **One component per file**, named after the file. Co-locate small helpers
  (button styles, page-break, line-context-menu) inside the component file
  they serve — don't proliferate tiny modules.
- **State lives in `App.tsx`** for cross-pane concerns (active scene/note/agent,
  pane sizes, revision color, view mode, bible-open). Component-local UI state
  (dropdowns, hover, drag-idx) stays in the component.
- **Resizable panes** use the `Divider` component; widths are clamped in App.
- **No comments that just restate code.** Comments only for non-obvious *why*.
- **Match the prototype's visuals exactly** unless explicitly told otherwise.
  The `RD` palette and the prototype's spacing/rotation/shadow choices are
  intentional — don't "clean them up."

## Common tasks

- **Run dev server**: `npm run dev`
- **Type-check + production build**: `npm run build`
- **Preview the production bundle**: `npm run preview`
- **Add a new agent**: append to `src/data/agents.ts` (color + desc) and add a
  response pool entry in `src/data/responses.ts`. The chat panel auto-renders.
- **Add a new character to the Bible**: append to `src/data/characters.ts`
  (`CHARACTER_BIBLE`). The chat target picker, voice cast, and bible drawer
  all read from this array.
- **Add a new note**: append to `NOTES_V2` in `src/data/notes.ts`. Notes index
  into `scenes` (which scenes the note applies to) and `origin` (who gave it).

## Things to avoid

- **Don't pull in a CSS framework** (Tailwind, MUI, etc.) without asking.
  The inline-style + tokens approach is deliberate — the prototype was inline,
  the port is inline, and it keeps the visual contract tight.
- **Don't replace the prototype's tactile choices** (rotations on sticky notes,
  paper texture backgrounds, clapboard stripes) with "modern" minimalism.
  Those are load-bearing for the brand.
- **Don't add Redux/Zustand/etc.** App-level `useState` is fine for this scale.
- **Don't ship code without running `npm run build`** — strict TS will catch
  things `npm run dev` won't.

## When in doubt

The prototype source lives in the design handoff bundle. If you need to check
the original visual intent for a component, the JSX prototype is the ground
truth — match it, don't reinterpret it.

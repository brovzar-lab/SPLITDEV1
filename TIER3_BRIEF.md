# SPLITDEV — Tier 3 Explorations (Audit Round 1)

**Single-session task brief for Claude Code.** Paste this whole file into a fresh Claude Code session pointed at `brovzar-lab/SPLITDEV1`, on a fresh `tier3` branch off of `main` (which now contains Tier 1 + Tier 2). Execute in order. One PR per item.

---

## Mission

Tier 3 reframes the app from "doc editor" to "story tool". Four items — each opens a new surface or replaces a dead one. All have been mocked on `docs/tier2-mockups.html`'s companion canvas (`docs/tier3-mockups.html` — commit alongside this brief) and the human reviewer has locked specific variants below.

## ✅ Mock review status — all four items APPROVED

Approved by the human reviewer on **May 16 2026**. The variants below ARE the approved variants; do not deviate without asking.

- **T3.1** — A (always-on Beat Sheet strip) + B (⌘O Three-Act Poster drawer). Variant C archived.
- **T3.2** — A primary (location-grouped tree, replaces sidebar) + B as inspector view (character presence grid, `i` keybind).
- **T3.3** — A only (Full-bleed paper). Variant B (Teleprompter) deferred to `backlog.md` → B-1.
- **T3.4** — A only (Inline diff). Variant B (Split-pane) deferred to `backlog.md` → B-2.

## ⚠ Prerequisites

This brief assumes Tier 1 and Tier 2 are merged into `main`. Specifically:
- T2.1 (right-click menu reorg) — Tier 3 doesn't change the menu, but expects it
- T2.2 (agent gutter graduation) — Tier 3 reading mode hides gutter pins; expects the pin component
- T2.3 (notes triage) — Tier 3 timeline reads from the same note model
- T2.4 (table view) — no direct dependency

Branch off `main`, name it `tier3`, merge each `audit/T3-*` branch into it.

## House rules

1. Read `CLAUDE.md` before touching anything.
2. TypeScript **strict**. No `any`. New types into `src/types.ts` first.
3. Inline styles via `RD` tokens (`src/tokens.ts`). No raw hex.
4. No new dependencies. No CSS framework. No state-management lib.
5. After every item, `npm run build` must pass.
6. **One PR per item**, branch + title format: `audit/T3-<num>-<short-slug>`.
7. If a change feels bigger than the spec suggests, **stop and ask**.
8. Match the prototype's tactile choices — clapboard, ink stamps, paper texture, sticky-note rotations. Lean editorial, never minimalism-SaaS.

---

# The four items

## T3.1 — Act-aware timeline ribbon  ✅ APPROVED (A + B)

**Problem.** The current sidebar contains a 3px decorative sparkline labeled "Notes per scene." It's too thin to click, has no axis or scale, no act-awareness, no beat-awareness. The app has no story-shape signal at all.

**APPROVED DIRECTION.** Ship **two** surfaces:

### Surface A — Beat Sheet (always-on horizontal strip)

A 76px ribbon that lives **directly under the topbar**, above the script. Always visible. Never closes.

**Anatomy** (top to bottom):
1. **Beat names row** (28px) — Save-the-Cat beats positioned above their anchor scene. Major beats in `RD.copperSoft` 9.5px bold. Minor beats in `rgba(244,237,224,0.55)` 8.5px. All `RD.display` italic, letter-spacing 1.2px, uppercase. A 4px vertical tick below each name connects to the rail.
2. **Act zones rail** (18px) — three colored bands across the width. Act I `${RD.blue}30`. Act II `${RD.copper}30`. Act III `${RD.forest}30`. Each shows "ACT I/II/III" centered in `RD.display` italic 9px 700 letter-spacing 3 `rgba(244,237,224,0.65)`.
3. **Tick + note-density layer** (24px) — every scene gets a 1px vertical tick. Active scene's tick is `RD.copper`, 18px tall, with a copper "SC {N}" pill 16px above. Inactive ticks `rgba(244,237,224,0.4)`, 8px. Notes per scene render as gold bars rising from the bottom rail, max height proportional to the max note count.
4. **Bottom readout** (28px) — left "SC 1", center "SC {active} · p. {page}" in `RD.copperSoft` bold, right "SC {total}". `RD.script` 9px `rgba(244,237,224,0.5)`.

Click anywhere on the ribbon → jump script to that scene.

**Background** — `RD.ink` with `RD.lineDeep` border. Lives at the very top of the editor below the topbar; topbar bottom border (the copper 3px) sits flush against it.

**Beat data.** Save-the-Cat beats anchored to scene IDs:
- Opening Image (1, minor) · Theme Stated (3, minor) · Catalyst (6, major) · Debate (9, minor) · Break Into Two (11, major) · Fun & Games (14, minor) · Midpoint (21, major) · Bad Guys Close In (26, minor) · All Is Lost (30, major) · Dark Night of Soul (32, minor) · Break Into Three (34, major) · Finale (38, major) · Final Image (42, minor)

Until the user defines beats explicitly, **infer beat positions proportionally**: for a script with N scenes, anchor each Save-the-Cat beat at `round(beatPctOfStandardScript * N)`. Hardcode the 13-beat structure as a default; later make user-editable.

**Density-aware rendering.** When more than 60 scenes are visible, hide minor beats (only show majors). Show all on hover.

### Surface B — Three-Act Poster (⌘O outlining drawer)

A vertical-column outline view that toggles with **`⌘O`** (Mac) / **`Ctrl+O`** (Win). Replaces the **sidebar** column when open; the regular scene-list reappears when closed.

**Anatomy.**
- 3 equal-width columns (Act I, II, III). Card per column: `RD.card` with 3px top border in act color (`RD.blue` / `RD.copper` / `RD.forest`).
- Column header (10px 12px 8px padding):
  - `RD.display` italic 16px 600 `RD.ink` — "Act I"
  - 9px `RD.inkFade` letter-spacing 1.5px uppercase — "{count} scenes · pp. {pageRange}"
  - Dashed `RD.line` rule below
- Scene slats:
  - 5px 10px 5px 12px padding, border-bottom `${RD.line}80`
  - Active scene: `${RD.copper}1c` background, 2px copper left-border
  - Three columns inside each slat: scene number (20px Courier 9px 700, tabular nums), label (1fr; Courier 10px uppercase — sub-location + time), note-count badge (16px gold circle if notes > 0)
  - Below the label: if a beat anchors this scene, render the beat name in `RD.display` italic 9px, copper for major beats, `RD.inkFade` for minor, letter-spacing 1px uppercase 600

**Keybind handler.** Global `keydown` listener on the editor root. `Cmd+O` (or `Ctrl+O`) → toggle drawer open/closed. Persist state to `localStorage` key `splitdev.outline.open` so it remembers across reloads.

**Where (T3.1)**
- New: `src/components/TimelineRibbon.tsx` (Surface A)
- New: `src/components/OutlineDrawer.tsx` (Surface B)
- New: `src/data/beats.ts` (Save-the-Cat beat fixtures, default 13)
- New: `src/lib/inferBeats.ts` (proportional anchoring helper)
- `src/App.tsx` — mount `<TimelineRibbon>` between topbar and main content; toggle `<OutlineDrawer>` from sidebar slot
- `src/components/Sidebar.tsx` — strip the old "Notes per scene" sparkline; that surface dies with this change
- `src/types.ts` — add `Beat` and `BeatKind = 'major' | 'minor'`

**Acceptance (T3.1)**
- Timeline strip is visible at all times, sits under topbar.
- Clicking any scene tick jumps the script viewport to that scene.
- The active scene's tick + "SC {N}" pill follow scroll position.
- ⌘O toggles the outline drawer. State persists across reload.
- The old sparkline is gone from the sidebar.
- Beat names hide minor entries when scene count > 60.

**Constraints**
- The ribbon must not interfere with print stylesheets — `@media print` should hide it.
- Reference `docs/tier3-mockups.html` → section T3.1 → "A · Beat Sheet" and "B · Three-Act Poster" for exact visual spec.

---

## T3.2 — Scene list roll-up  ✅ APPROVED (A primary + B as inspector)

**Problem.** The current sidebar shows `SUPERMERCADO` 18 times in a row, with sluglines truncated to "…" that destroy the sub-location signal. Pro screenwriters can't scan their location pile this way.

**APPROVED DIRECTION.** Two coordinated views:

### View A — Location-grouped tree (primary, replaces current sidebar list)

The default scene-list rendering inside the sidebar.

**Anatomy.**
- Group scenes by their base location (everything before the first " – "). E.g. all scenes whose location starts with `SUPERMERCADO` collapse under a single `SUPERMERCADO` header.
- **Location header** (6px 16px 4px padding):
  - 14px Courier expand glyph `▾`/`▸` in `RD.copper`
  - `RD.display` italic 13px 600 `RD.ink`, letter-spacing 0.5px — base location
  - Count chip (9px `RD.inkFade`, tabular nums, 1px `RD.line` border, 0 6px padding)
- **Scene slats** under each header (4px 16px 4px 36px padding):
  - Active scene: `${RD.copper}1c` background, 2px copper left-border
  - Scene number (Courier 10px 700, 22px wide, tabular nums, `RD.inkFade` / `RD.copper`)
  - Sub-location + time-of-day (1fr; Courier 10.5px uppercase, letter-spacing 0.3px). If location has no `" – "` sublocation, render `time` alone.
  - **Character beads** (right-aligned): up to 3 first-letter chips (14×14, 1px border-radius, character color background, white 8px display font 700). If >3, render `+N` italic suffix `RD.inkFade`.
  - Note-count badge (right-most): same gold circle as T3.1B.

### View B — Character presence grid (inspector, opens on `i`)

An overlay/inspector that shows a 2D grid: characters × scenes.

**Trigger.** Press `i` while focused on a scene or a character bead → open as a modal overlay or a wide bottom-panel.

**Anatomy.**
- Header — `RD.display` italic 16px 600 "Presence Grid", 9px subtitle "Who's in which scene · {N} characters · {M} scenes"
- Grid rows:
  - 90px name column (16px square color chip + Courier 9.5px name)
  - N scene columns (1fr each), each cell 18px tall
  - Cell color = character color when character is in scene, 75% opacity; 100% opacity + `RD.ink` outline when on active scene; transparent when absent
- Above grid: scene-number labels (7.5px Courier 700 bold; copper + 2px copper underline when active)
- Below scene labels: a 4px-tall act marker strip showing act zones in muted colors
- Below all character rows: a "Notes" density row (dashed `RD.line` top), gold bars proportional to per-scene note count

**Character data.** Lift from existing `CHARACTER_BIBLE` (`src/data/characters.ts`). Add a `scenes: number[]` field — derive at build time by scanning `SCREENPLAY` for dialogue characters whose name matches.

**Keyboard.** `Esc` closes the inspector. `←/→` flips between character-focus and scene-focus modes (in scene-focus mode, the columns highlight the active scene; in character-focus mode, the rows highlight one character).

### Where (T3.2)
- `src/components/Sidebar.tsx` — refactor to render the location-grouped tree (View A)
- New: `src/components/PresenceGrid.tsx` — the View B inspector
- New: `src/lib/groupByLocation.ts` — pure helper
- New: `src/lib/deriveCharacterScenes.ts` — pre-build helper
- `src/types.ts` — add `Character.scenes: number[]` (optional)
- `src/data/characters.ts` — backfill or compute

### Acceptance (T3.2)
- Sidebar shows base locations once with collapsible scene lists nested below
- Character beads (max 3 + overflow) on every scene row in the location tree
- `i` opens the Presence Grid inspector; `Esc` closes it
- Grid cells render correctly for the demo screenplay (Irina/Betsabé/Supervisor/Carnicero/Guardia/Tommy or equivalent)
- The note-density row at the bottom of the grid reflects per-scene note counts

### Constraints
- The grid handles up to 120 scenes — for wider, allow horizontal scroll inside the grid container
- Reference `docs/tier3-mockups.html` → T3.2 → "A · Location-grouped tree" and "B · Character presence grid"

---

## T3.3 — Reading mode (Full-bleed paper)  ✅ APPROVED (A only)

**Problem.** There's no way to read the script without all the editor chrome competing. The script never gets to be just a script.

**APPROVED DIRECTION.** Full-bleed reading overlay. Variant B (teleprompter) deferred to `backlog.md`.

**Trigger.** **`⌘\`** (Mac) / **`Ctrl+\`** (Win). Why `\`: `R` is already taken by Rewrite from T2.1. `\` is unused, single key, easy thumb reach.

**Anatomy.**
- Full-viewport `position: fixed` overlay, z-index above everything (including the timeline ribbon)
- Background: `#1a1612` (deep ink — slightly darker than `RD.ink`)
- Paper sheet centered: 460×420 baseline, scales with viewport (`min(85vh, 880px)` tall, 7.5" wide standard screenplay margins)
- Paper styling: `#fefcf2` background, drop shadow `0 8px 40px rgba(0,0,0,0.55)`, 36px 56px padding
- Script renders as plain Courier 12px lineHeight 1.85 — no asterisks, no revision stamps, no margin numbers, no diff tints, no gutter pins, no T1.1 inline-tag underlines
- **Top-right corner**: `esc to return` in `RD.display` italic 11px `rgba(244,237,224,0.4)` letter-spacing 1.5 uppercase
- **Bottom-center**: `p. {N} of {total} · ← scene → · space to page` in same dim style

**Keyboard nav.**
- `Esc` — exit
- `←/→` — previous/next scene (scroll paper to that scene heading)
- `Space` — page down; `Shift+Space` — page up
- `Home/End` — first/last scene
- `0-9` — jump to N×10% of script length

**Persistence.** Remember "last reading position" in `localStorage` key `splitdev.read.lastScene`. On re-open, restore that scene.

**No-go list (what reading mode hides).**
- The topbar (entirely, including timeline ribbon and outline drawer)
- The sidebar
- All notes/chat panes
- All gutter pins (T2.2)
- All revision stamps, asterisks, line edits, T1.1 inline tags
- All right-click affordances (right-click does nothing in reading mode)

**Where (T3.3)**
- New: `src/components/ReadingMode.tsx` — the overlay component + keyboard listener
- New: `src/components/ReadingScript.tsx` — stripped-down render of `SCREENPLAY` data
- `src/App.tsx` — mount `<ReadingMode open={…} onClose={…}/>`; track open state in `useState`
- Global keydown listener registered in App-level `useEffect`

**Acceptance (T3.3)**
- `⌘\` toggles reading mode from any state of the app
- Inside reading mode: only paper + corner hints visible
- Arrow keys + space cycle scenes/pages
- Esc returns to editor with prior scene selected
- Last reading position persists across reloads
- `@media print` styles render reading mode as plain paper (one page per slug → one PDF page when user prints)

**Constraints**
- Do not implement read-aloud TTS in this PR (existing Cast voice picker stays where it is)
- Do not implement the teleprompter variant (B) — that's in `backlog.md`
- Reference `docs/tier3-mockups.html` → T3.3 → "A · Full-bleed paper"

---

## T3.4 — Colored-draft diff overlay (Inline)  ✅ APPROVED (A only)

**Problem.** Topbar says BLUE DRAFT but no line is actually marked as changed since WHITE. Production drafts depend on this signal — every reader needs to know which lines are new.

**APPROVED DIRECTION.** Inline diff. Variant B (split-pane) deferred to `backlog.md`.

**Trigger.** A new "Compare to" toggle in the existing topbar revision-color picker. Default: off. When on, the script renders with diff tints + revision asterisks.

**Anatomy of the toggle.**
- The existing revision-color dropdown (BLUE / WHITE / PINK / etc.) gets a sibling checkbox row inside its popover: `[✓] Compare to White` (or whichever color is the base draft).
- When on, the topbar gains a small `Δ vs White` chip next to the existing revision stamp (copper background, paper text, sans 9px 700 letter-spacing 1.5 uppercase).

**Inline diff rendering.**
- For every line that changed between base revision (e.g. White) and current revision (e.g. Blue):
  - **Deletions**: render the deleted line in `RD.inkFade` with `text-decoration: line-through` `RD.ruby` 1.5px
  - **Insertions**: render the new line on the next row with `background: ${revColor}1c`, `border-left: 2px solid ${revColor}`, padding `2px 6px`, margin `0 -6px`
  - **Both get margin asterisks**: deletions in `RD.ruby`, insertions in `revColor`, right-aligned in the existing margin column
- For **inline word-level changes** in dialogue: same approach but inline. Deleted span gets strike-through + `RD.inkFade`; inserted span gets `${revColor}1c` background + bottom-border in `revColor`.
- For **unchanged scenes**: render normally, no extra chrome

**Page footer.**
- Right corner of every page (in `RD.display` italic 10px `RD.inkFade` letter-spacing 1 uppercase): "{N} changes · this page"

**Data model changes** (`src/types.ts`)
```ts
export interface LineRevisionState {
  revisionId: string;          // 'white' | 'blue' | 'pink' | …
  changedSince?: string;       // base revision this line differs from
  deletedText?: string;        // what used to be there (for line-level changes)
  insertions?: { from: number; to: number; text: string }[];  // word-level changes
  deletions?: { from: number; to: number; text: string }[];
}

export interface ScreenplayLine {
  // ... existing
  revision?: LineRevisionState;
}
```

Backfill demo data in `src/data/screenplay.ts`: for scenes 14, 22, 30 add 2-3 example changes vs the (implicit) White baseline so the diff actually shows something.

**Where (T3.4)**
- `src/components/Screenplay.tsx` — extend line render to apply diff tints when `compareToBase` is active
- `src/components/TopBar.tsx` — add `Compare to {base}` checkbox in revision-color popover; add `Δ vs {base}` chip in the topbar
- `src/types.ts` — add `LineRevisionState` shape
- `src/data/screenplay.ts` — backfill changes on 3 demo scenes
- New: `src/lib/diffRender.tsx` — small helper that turns a `LineRevisionState` into rendered React nodes

**Acceptance (T3.4)**
- Topbar revision picker shows a "Compare to White" checkbox
- Activating it tints changed lines in revision color, strikes through deleted lines
- Margin asterisks appear next to changed lines in the appropriate color
- Demo screenplay has 3 scenes with visible changes
- Reading mode (T3.3) ignores diff state — the paper renders without tints
- `@media print` keeps the diff (this is the WGA pipeline use case)

**Constraints**
- Do not implement real revision history with rollback — this is a *display* of changes captured in the line model. The "history" comes from manually-authored `revision` fields on lines in the fixture.
- Do not implement the split-pane variant (B) — that's in `backlog.md`
- Reference `docs/tier3-mockups.html` → T3.4 → "A · Inline diff"

---

# Closing checklist (Claude Code)

After each PR:
- [ ] Branch named `audit/T3-<num>-<short-slug>`
- [ ] `npm run build` passes (strict TS green)
- [ ] No new dependencies in `package.json`
- [ ] No regressions in unchanged areas — click through every panel
- [ ] PR body lists the spec section, acceptance criteria checked off, deviations from the approved direction (with justification)
- [ ] Ambiguities called out in the PR body for reviewer attention

**Order dependency.**
- T3.1 first — provides the beat data model and the always-on rail that other items respect
- T3.2 second — depends on T3.1 for the outline-drawer slot in the sidebar
- T3.3 third — independent; can ship in parallel with T3.2
- T3.4 fourth — independent; can ship in parallel with T3.2 or T3.3

After all four merge into `tier3`:
1. Add `docs/tier3-mockups.html` reference (similar to `docs/tier2-mockups.html` from Tier 2)
2. Open PR: `tier3 → main`
3. Use the app for a couple of days before pulling backlog items

If anything in this brief is ambiguous or contradicts CLAUDE.md, **stop and ask** before writing code. Do not improvise.

— end of brief —

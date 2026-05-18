# SPLITDEV — Tier 4 Brief (Audit Round 2)

**Single-session task brief for Claude Code.** Paste this whole file into a fresh Claude Code session pointed at `SPLITDEV1/`, on a fresh `tier4` branch off `main` (which now contains Tier 1 + Tier 2 + Tier 3). Execute in order. One PR per item.

---

## Mission

**Tier 4 is "Trust & Theatre."** Five items that close the build's biggest contract violations (Apply ▸ doesn't apply, Bible starts empty) and turn the franchise moments (ingest, session greeting) from streamed text into ceremonies. Mocked on `docs/tier4-mockups.html` (commit alongside this brief) and the human reviewer has locked specific variants below.

## ✅ Mock review status — all five items APPROVED

Approved by the human reviewer on **May 18 2026**. The variants below ARE the approved variants; do not deviate without asking.

- **T4.1** — Variant B (Manuscript spread). Variants A and C archived.
- **T4.2** — Storyboard ships as drawn (3-frame flow). Button style A (solid copper, current).
- **T4.3** — Theatre storyboard ships as drawn. Rounds Variant A (Ledger). Variant B archived as future archive view.
- **T4.4** — Variant A (Sticky note pinned to manuscript). Variants B and C archived.
- **T4.5** — Polish pack ships as one PR; all six pairs.

## ⚠ Prerequisites

This brief assumes Tier 3 is merged into `main`. Specifically:

- T3.1 (Beat Sheet ribbon + Outline drawer)
- T3.2 (Location-grouped sidebar + Presence Grid)
- T3.3 (Reading mode)
- T3.4 (Inline diff overlay)

Branch off `main`, name it `tier4`. Merge each `audit/T4-*` branch into it.

## House rules

1. Read `CLAUDE.md` before touching anything.
2. TypeScript **strict**. No `any`. New types into `src/types.ts` (and mirror to `src/api/types.ts` and `server/src/models/types.ts` if they cross the wire).
3. Inline styles via `RD` tokens (`src/tokens.ts`). No raw hex. If a new token is needed, add it to `RD` first; flagged below as 🎨.
4. No new dependencies. No CSS framework. No state-management lib.
5. After every item, `npm run build` must pass. Server tests (`npm test`) must remain green.
6. **One PR per item**, branch + title format: `audit/T4-<num>-<short-slug>`.
7. If a change feels bigger than the spec suggests, **stop and ask**.
8. Match the prototype's tactile choices — sticky notes, pushpins, ink stamps, paper texture. Lean editorial, never minimalism-SaaS.

---

# The five items

## T4.1 — Bible auto-populate ✅ APPROVED (Variant B)

**Problem.** The Character Bible drawer (`src/components/Bible.tsx`) opens onto an empty state. The AI just read the entire screenplay during triage. That's a contract violation — the same Opus pass should populate cast + voice rules + want/need + presence.

**APPROVED DIRECTION (Variant B — Manuscript spread).** Triage emits a *populated* Character Bible alongside its notes. Rendered as a manuscript-paper card (screenplay paper-sheet background, Cormorant italic, Courier for type metadata). Voice rules surface as **pull-quotes** (italic Cormorant with a 2px left border in the character's color). Only the top three rules show; below them, an italic dim line: *"+ N more · Right-click a line → 'Voice exemplar →' to teach me more."*

**Anatomy.** Per the mock `docs/tier4-mockups.html` → T4.1 → "B · Manuscript spread":

1. **Header band** (paddingBottom 14, borderBottom `2px double ${RD.line}`):
   - 56×56 **NameTag** (filled square in `character.color`, white Courier letter, transform `rotate(-3deg)`, top-tape strip 60×14 at `rgba(184,137,58,0.5)` rotated `1deg`).
   - Cormorant italic 32px 600 character name.
   - Below name: Courier 11px uppercase letter-spacing 1 `RD.inkSoft` — `{role} · age {age} · {appearances} scenes`.
   - Right side: `Auto-populated` ink-stamp 9px italic Cormorant in `RD.gold` rotated `3deg`.

2. **Want/Need grid** (`gridTemplateColumns: '1fr 1fr'`, gap 22, marginTop 14, paddingBottom 14, borderBottom `1px solid ${RD.line}`):
   - Each cell: Eyebrow 9px `What she wants` / `What she needs` (sans 700 letter-spacing 2 uppercase `RD.inkFade`), then Cormorant italic 16px 1.3 lineHeight `RD.ink` body.

3. **Voice block** (marginTop 12):
   - Eyebrow `Voice — three rules the AI inferred`.
   - Three pull-quotes: Cormorant italic 14px lineHeight 1.35, paddingLeft 12, borderLeft `2px solid ${character.color}`, 6px margin top/bottom.
   - Footer line: sans 10px italic `RD.inkFade` letter-spacing 0.5 — `+ ${voice.length - 3} more · Right-click a line → "Voice exemplar →" to teach me more.`

4. **Presence** (marginTop 14, paddingTop 12, borderTop `1px solid ${RD.line}`):
   - Eyebrow `Where she appears`.
   - 8px-wide bars per scene, 14px tall when present, 4px when absent, color = `character.color` when present, `RD.line` when absent.

**Triage pipeline.** Extend the existing triage pass (`server/src/triage/runner.ts`) so the **same Opus call** that emits notes also emits:
- `cast: Array<{ name: string; role: string; age?: number; want: string; need: string; voice: string[]; appearances: number[] }>`
- The five voice rules per character should each be ≤ 80 chars, present-tense, third-person.

Persist via `server/src/models/characterBible.ts` and surface through the existing screenplay payload endpoint (`GET /api/screenplays/:id`).

**Where (T4.1)**

- `server/src/triage/runner.ts` — extend `TriageResponse` schema with `cast`. Insert into `character_bible` table after notes are saved.
- `server/src/anthropic/prompts/triage/` — extend the triage prompt to request the cast structure. Voice-rule examples grounded in the actual script.
- `server/src/db/migrations/` — new migration adding `character_bible` columns if missing (`want`, `need`, `voice` as JSON, `appearances` as JSON).
- `server/src/models/characterBible.ts` — `insertCharacters(db, screenplayId, cast)` upsert.
- `src/types.ts` — `Character` already exists; verify `voice: string[]` and add `appearances: number[]` if absent.
- `src/api/types.ts` — mirror.
- `src/components/Bible.tsx` — replace existing right-panel character card layout with the **Manuscript spread** anatomy above. Keep the drawer chrome (header, character picker rail) as-is.

**Acceptance (T4.1)**

- Uploading any `.fountain` or `.fdx` results in a populated Character Bible visible without any user action.
- Each character card shows: NameTag, role/age/scene-count, Want, Need, top 3 voice rules as pull-quotes, "+N more" footer, presence strip.
- The presence strip reflects actual scene appearances derived from dialogue characters.
- Opening Bible drawer on a screenplay uploaded **before** this PR triggers a one-time backfill (re-run triage's cast portion only, do not regenerate notes).
- Server tests cover the new triage schema; one test verifies cast survives a parse → triage → fetch round-trip.

**Constraints**

- No new dependencies.
- Triage stays a single Opus call. Do not split into two.
- Voice rules are author-editable in the drawer (existing Bible component already supports edit; preserve that affordance — newly-AI-rules are editable too, no second-class state).
- Reference `docs/tier4-mockups.html` → T4.1 → "B · Manuscript spread" for exact spec.

---

## T4.2 — Wire Apply ▸ ✅ APPROVED (Storyboard + Button A)

**Problem.** The `Apply ▸` button in `src/components/Chat.tsx` (around line 800+ in the agent reply block, `msg.showApply`) is rendered but does nothing. No handler. No state change. No revision-log entry. This is the single most damaging unkept promise in the build.

**APPROVED DIRECTION.** Wire the full three-frame flow from the storyboard. The acceptance test is **Frame ③** — clicking Apply ▸ on a Dialogue agent suggestion must (a) replace the target line inline with revision-color tint, (b) move the old line to the right-side gutter as a `was:` pin, (c) emit a new entry in the History panel. All four surfaces (chat → script body → gutter → history) update in concert in one transaction.

**Anatomy** (per `docs/tier4-mockups.html` → T4.2):

**Frame ① — The suggestion (chat panel).** As today, with two polish tweaks: deletion struck through in `RD.ruby` (not generic grey); insertion shown in `${RD.copperSoft}80` with a `2px solid ${RD.copper}` left border.

**Frame ② — Preview on hover.** When the user hovers Apply ▸:
- Button background darkens to `#a04915`, inset shadow `inset 0 1px 2px rgba(0,0,0,0.2)`.
- The target line in the script panel **previews inline** — old line gets `${RD.ruby}10` background and a `line-through ${RD.ruby}` strike; new line lands directly below with `${RD.copperSoft}80` background and `2px solid ${RD.copper}` borders both sides.
- A small inline confirm bar appears bottom-right of the new line: `↵ accept · esc` (italic Cormorant 10px 700 letter-spacing 1 uppercase).
- Preview persists while hovering Apply. Mouseleave reverts; clicking Apply commits.

**Frame ③ — Applied (the centerpiece — primary acceptance test).** Click Apply ▸:
1. **Script body** — target line is replaced by the suggestion. The new line renders with `${revColor}1c` background, `2px solid ${revColor}` left border, margin `0 0 0 -6px`, padding `2px 0 2px 4px`. Margin asterisk in `revColor`. (This matches the existing T3.4 inline-diff visual vocabulary in `src/lib/diffRender.tsx`.)
2. **Right gutter** — a `was:` pin appears, line-aligned to the changed line. Pin spec:
   - Card: `RD.card` background, `1px solid ${RD.line}` border, `2px solid ${RD.inkFade}` left border, padding `6px 9px`, sans family, `RD.shadowCard`.
   - Eyebrow row: italic Cormorant 9px `RD.inkFade` letter-spacing 1.5 uppercase — `was · {character} · {sceneNumber}`.
   - Body: Courier 10px `RD.inkSoft` lineHeight 1.45, with `text-decoration: line-through ${RD.ruby}50`.
3. **History panel** — new `revision_entry` row appears at the top:
   - Sans, `RD.paper` background, `3px solid ${RD.forest}` left border, padding `8px 11px`, `RD.shadowCard`.
   - Top row: italic Cormorant 11px 700 `RD.forest` letter-spacing 0.5 — `Accepted` + right-aligned Courier 9px `RD.inkFade` — `just now`.
   - Body: sans 11px `RD.ink` — `{Character} line — Scene {N}`.
   - Subtext: sans 10px italic `RD.inkFade` — `from {Agent.name} Agent`.
4. **Chat bubble** — Apply ▸ button transitions to `✓ Applied` in `RD.forest`. Disabled. (Preview button hides.)

**Button style.** Variant A (solid copper) — `RD.copper` background, `RD.paper` text, italic Cormorant 11px 700 letter-spacing 1 uppercase, no border, borderRadius 0. (No change from current button JSX; the wiring is the work.)

**Data model.**

```ts
// server/src/models/types.ts
export interface RevisionEntry {
  id: string;
  screenplayId: string;
  lineId: string;            // the line that was changed
  sceneId: string;
  agentId: string | null;    // null for self-edits
  action: 'accepted' | 'rejected' | 'note';
  oldText: string;
  newText: string;
  createdAt: number;
}
```

If `revision_entry` table exists in DB (per README "Editor's Log (revision_entry) is wired in the DB"), this PR only needs the route + handler + UI wire-up. Otherwise add a migration.

**Where (T4.2)**

- `server/src/models/revision.ts` — verify or add `insertRevisionEntry`, `listRevisionEntries(screenplayId)`.
- `server/src/routes/` — new file `revisions.ts`: `POST /api/screenplays/:id/revisions` (creates entry + updates line), `GET /api/screenplays/:id/revisions`.
- `server/src/app.ts` — register route.
- `src/api/client.ts` — `applyRevision({screenplayId, lineId, sceneId, agentId, oldText, newText})` + `listRevisions(screenplayId)`.
- `src/api/types.ts` + `src/types.ts` — `RevisionEntry`.
- `src/components/Chat.tsx` — wire `Apply ▸` `onClick`. On click: call `applyRevision`, then call into Editor-level handlers (lifted state in `src/pages/Editor.tsx`) to update the line, append a `was:` pin, and append to History.
- `src/components/Chat.tsx` — wire hover preview: `onMouseEnter` on Apply button sets a "preview" state in Editor; on `onMouseLeave` clears it.
- `src/components/Screenplay.tsx` — accept a `previewSuggestion?: {lineId, newText}` prop and render Frame ② preview when present.
- New: `src/components/GutterPin.tsx` — extract the gutter-pin component (existing `AgentMarginPin` is the close cousin; the `was:` pin is a sibling type — keep them in one file or split, your call but commit to one structure).
- `src/components/History.tsx` — render `RevisionEntry[]` newest-first. The existing `UNDO_HISTORY` mock fixture in `src/data/characters.ts` is replaced by real DB-backed data.

**Acceptance (T4.2)**

- Apply ▸ on any agent suggestion in the chat panel:
  - Updates the target line in the screenplay panel (revision-color tint, asterisk, etc).
  - Appends a `was:` pin to the right gutter, line-aligned to the changed line.
  - Appends a `RevisionEntry` to the History panel.
  - The chat bubble's Apply button changes to `✓ Applied` and is disabled thereafter.
- Hovering Apply ▸ shows Frame ② preview inline; mouseleave reverts; clicking commits.
- Refreshing the editor preserves the change (revision_entry is persisted in DB; lines have the new text).
- Rejecting (a new minor verb — secondary button, or right-click on the chat bubble) creates a `RevisionEntry` with `action: 'rejected'` and `RD.ruby` left border in History but does NOT modify the line.

**Constraints**

- Apply ▸ is **only** wired for agent-target chat messages (`msg.showApply === true`). Character-target replies do not surface Apply.
- The `revision_entry` log is per-screenplay, not per-note. It does **not** replace the existing `Note.status` field (`unread / discussing / applied`); a note can be marked `applied` independently of any specific revision.
- Reading mode (T3.3) hides the gutter — `was:` pins must not appear in reading mode.
- Reference `docs/tier4-mockups.html` → T4.2 → "Storyboard · all three frames" for exact spec.

---

## T4.3 — Ingest theatre + Note rounds ✅ APPROVED (Storyboard + Rounds A)

**Problem.** Two issues:
1. The Ingest Notes flow (`src/components/Notes/IngestModal.tsx`) parses producer email → notes silently. No animation. The franchise feature lands as a quiet UI update.
2. Notes have no concept of **rounds**. Three ingests from three producers over six weeks all end up as a flat note list. A working pro thinks in rounds ("close Esther's notes by Friday"), not individual notes.

**APPROVED DIRECTION.**

**Theatre** — 4-frame arrival animation when ingest completes (~2 seconds total):
- Frame ② (parsing): `Reading · N of ?` copper badge in the gutter zone with a faint vertical scanline overlay.
- Frame ③ (arrival): notes pour into the gutter line-aligned to their scenes, each with a `0 0 0 3px ${RD.copperSoft}` glow halo. Simultaneously, affected scene headings pulse — `${RD.copper}1c` background, padding `2px 4px`, margin `-4px`, small copper dot to the right of each heading.
- Frame ④ (settled): halos and pulses fade after 1.2s. Working state.

**Rounds** — Variant A (Ledger). A new section at the top of the Notes panel that groups every ingest by name + date + origin. Each round tracks open/closed count and an active state. New CTA: `+ Ingest a round`.

**Anatomy.**

**Theatre** (`docs/tier4-mockups.html` → T4.3 → "Arrival · 4-frame storyboard"):
- Animation lives in the Editor surface, not the modal — modal closes first, then the script reveals with notes arriving.
- Scene-heading pulse: 1.2s ease-out, then steady-state.
- Note gutter halo: 1.5s ease-out fade.
- Note arrival: stagger 80ms per note from top to bottom, each fades from opacity 0 / translateX(20px) → 1 / 0.
- `Reading · N of ?` badge: position `top: 18 right: 4` in gutter zone, `RD.copper` background, `RD.paper` text, italic Cormorant 10px 700 letter-spacing 1.5 uppercase, `RD.shadowDeep`.
- Scanline overlay during parsing: `position: absolute; left: <gutter-left>; right: 0; top: 0; bottom: 0; background: repeating-linear-gradient(90deg, transparent 0 6px, ${RD.copperSoft}40 6px 7px); pointer-events: none;` — fades on completion.

**Rounds Ledger** (`docs/tier4-mockups.html` → T4.3 → "Rounds · A · Ledger"):
- Lives at the top of the Notes panel, **above** the existing `Notes 8 / Patterns 0` tabs.
- Header row (`padding: 12px 16px`, `background: RD.paperDeep`, `borderBottom: 1px solid ${RD.line}`):
  - Cormorant italic 20px 600 — "Notes" (this replaces the existing Notes header).
  - Right-side eyebrow — `{N} rounds · {M} open`.
- Round rows (`padding: 8px 16px`, `borderLeft: 3px solid transparent | RD.copper` when active, `background: transparent | ${RD.copperSoft}40`, `borderBottom: 1px dotted ${RD.line}`):
  - Grid: `24px 1fr auto auto` — OriginChip, content, progress ticks, optional Active stamp.
  - Content: italic Cormorant 13px 600 round name; below it Courier 9px letter-spacing 1 uppercase `RD.inkFade` — `{closed} of {total} closed`.
  - Progress ticks: row of 6×12px bars, `RD.forest` for closed, `RD.line` for open.
  - `Active` stamp: italic Cormorant 8px 700 letter-spacing 2 uppercase `RD.copper` with `1px solid ${RD.copper}` border, transform `rotate(-3deg)`.
- CTA row at bottom (`padding: 10px 16px`, `background: RD.paperDeep`, `borderTop: 1px solid ${RD.line}`):
  - `+ Ingest a round` (solid copper button, italic Cormorant 11px 700 letter-spacing 1.5 uppercase). Flex 1.
  - `+ Self note` (outline copper button, same type spec).

**Data model.** Add `Round` to the schema:

```ts
// src/types.ts + src/api/types.ts + server/src/models/types.ts
export interface Round {
  id: string;
  screenplayId: string;
  name: string;             // 'Esther — Tue 7:43pm'  (auto-generated, user-editable)
  origin: NoteOriginId;     // producer | exec | director | reader | self | table
  source: 'ingest' | 'manual';
  createdAt: number;
  closedAt: number | null;
}

// Existing Note interface — add:
roundId: string | null;
```

The note-ingest pipeline creates a `Round` + assigns `roundId` to every note it extracts. Manual notes default to a synthetic "Working" round per session.

**Round naming.** When ingest completes, default name = `{producerInitials} — {weekdayShort} {h:mm} {ampm}`. Producer initials inferred from email signature; fall back to file name; fall back to `"Round {N}"`. Author-editable in the round row (inline edit on click).

**Where (T4.3)**

- `server/src/db/migrations/` — new migration adding `round` table and `note.round_id` column.
- `server/src/models/round.ts` — new model: `createRound`, `listRounds`, `closeRound`, `assignNotesToRound`.
- `server/src/routes/notes.ts` (existing) — extend `POST /api/screenplays/:id/notes:ingest` to create a round and return `{ round, notes }`.
- `server/src/routes/rounds.ts` — new file: `POST /api/screenplays/:id/rounds` (manual round), `PATCH /api/rounds/:id` (name, closed), `GET /api/screenplays/:id/rounds`.
- `src/api/client.ts` + types — round endpoints.
- New: `src/components/Notes/RoundsLedger.tsx` — the ledger row component.
- New: `src/components/Notes/IngestTheatre.tsx` — orchestrates the post-ingest animation. Consumed by Editor on `onIngested` callback.
- `src/components/Notes.tsx` — mount `<RoundsLedger>` at the top above tabs. Remove the duplicate `Notes` header inside the existing card; the ledger header now owns the title.
- `src/components/Notes/IngestModal.tsx` — on success, close modal first, then call into Editor to trigger theatre. Editor wires `<IngestTheatre>` over the screenplay panel.

**Acceptance (T4.3)**

- Ingesting a producer email creates a `Round` with auto-generated name. Notes from that ingest have `roundId` set.
- The Notes panel shows a Rounds Ledger at the top with one row per round (active one highlighted in `RD.copperSoft`).
- After ingest modal closes, the 4-frame animation plays:
  1. Modal exit (200ms).
  2. `Reading · N of ?` badge + scanlines (1.5s).
  3. Notes arrive in gutter, scene headings pulse (1.2s, staggered 80ms each).
  4. Halos and pulses fade (1.2s ease-out).
- Total perceived duration ≤ 3s.
- Round name is inline-editable.
- Closing a round (button in row hover state) sets `closedAt`. Closed rounds appear at the bottom of the ledger with `RD.inkFade` text + Courier strike on the name.
- Filtering by round (clicking a round row) scopes the Notes list below to that round only. Click again or click another round to switch.

**Constraints**

- No new animation library. Use CSS keyframes + `transition` declarations.
- Animation respects `prefers-reduced-motion: reduce` → all halos/pulses become instant fades; no movement.
- If a screenplay's existing notes were created before this PR, treat them as belonging to a synthetic "Pre-Tier-4" round so the ledger isn't empty on first open.
- Reference `docs/tier4-mockups.html` → T4.3 → "Arrival · 4-frame storyboard" and "Rounds · A · Ledger" for exact spec.

---

## T4.4 — Session-greeting ceremony ✅ APPROVED (Variant A — Sticky note)

**Problem.** When the editor opens, the AI greets the writer via a streamed chat message that finalizes into the chat history. This is the second-best moment in the product (after ingest) and it reads as a wall of text. It should be a **ceremony**.

**APPROVED DIRECTION.** Render the greeting as a yellow sticky note pinned to the manuscript with a copper pushpin, slight rotation, italic Cormorant body, and **three CTA buttons stacked vertically**. The card is mounted in the Editor surface, not the Chat panel. Dismissed by clicking any CTA or an explicit close glyph.

**Anatomy** (per `docs/tier4-mockups.html` → T4.4 → "A · Sticky note"):

- Position: `position: absolute; top: 40; right: -20; width: 280; transform: rotate(2.4deg); zIndex: 5`. Pinned to the top-right of the script paper-sheet (visually overlapping the manuscript page).
- Background: `RD.stickyYellow`. Box-shadow: `RD.shadowSticky`. Padding `14px 16px 16px`.
- **Copper pushpin** at top-center (`position: absolute; top: -8; left: 50%; transform: translateX(-50%); width: 14; height: 14; border-radius: 50%; background: radial-gradient(circle at 32% 30%, #ec9560 0%, ${RD.copper} 60%, #6c3210 100%); box-shadow: 0 1.5px 3px rgba(40,28,16,0.4), inset -1px -1px 1px rgba(0,0,0,0.25)`).
- Eyebrow line: sans 8px 700 letter-spacing 2 uppercase `RD.copper` — `Session opener`.
- Body: italic Cormorant 14px lineHeight 1.45 `RD.ink`, marginTop 8, marginBottom 14. The AI's actual greeting text.
- Three CTA buttons stacked vertically, gap 6:
  - Each: italic Cormorant 10px 700 letter-spacing 1.5 uppercase, padding `7px 12px`, border `1.5px solid ${RD.copper}`, borderRadius 0.
  - Primary (first CTA — usually "fix the bigger issue"): solid `RD.copper` background, `RD.paper` text.
  - Secondary (second CTA — alt focus): transparent background, `RD.copper` text.
  - Tertiary ("Show me everything"): transparent background, `RD.inkSoft` text, `RD.inkSoft` border.

**CTA derivation.** The AI's greeting prompt (`server/src/anthropic/prompts/session-opener.md`) currently returns prose only. Extend the prompt to return a structured payload:

```ts
{
  text: string;     // the prose greeting (≤ 2 sentences)
  focuses: Array<{ label: string; sceneIds?: string[]; noteIds?: string[] }>; // 1-3 items
}
```

`focuses[0]` → primary CTA. `focuses[1]` → secondary CTA. Tertiary is always "Show me everything" and is hardcoded client-side. Clicking a focus CTA dismisses the card AND navigates to that scene / opens that note's chat.

**Where (T4.4)**

- `server/src/anthropic/prompts/session-opener.md` — extend prompt to return structured payload (text + focuses).
- `server/src/routes/screenplays.ts` — the existing `POST /api/screenplays/:id/session/open` SSE stream. Update event payload to include `focuses`.
- `src/api/types.ts` — extend `SessionOpenEvent` (or whatever the existing type is) with `focuses`.
- `src/api/client.ts` — parse `focuses` from SSE.
- New: `src/components/SessionGreeting.tsx` — the sticky-note ceremony component.
- `src/pages/Editor.tsx` — mount `<SessionGreeting>` over the screenplay panel when `greeting` is loaded. Dismiss on any CTA click. Click handlers route to scene/note as appropriate.
- `src/components/Chat.tsx` — **remove** the existing greeting-as-chat-message rendering. The chat panel no longer surfaces the greeting; SessionGreeting owns it exclusively. (The greeting can still be added to chat history on dismiss for context, but it does not stream into the chat UI.)

**Acceptance (T4.4)**

- On editor open with a fresh screenplay, the sticky-note ceremony appears over the top-right of the manuscript page within the time the greeting takes to stream.
- The card shows italic Cormorant greeting text and 1–3 focus CTAs (always at least one + the tertiary "Show me everything").
- Clicking a focus CTA navigates the script to that scene (or opens that note in chat) AND dismisses the card.
- Clicking the tertiary CTA dismisses the card without navigation.
- The greeting **does not** appear in the chat panel's message history.
- Re-opening the editor on a screenplay you've seen before does NOT re-greet (track `session_greeted_at` on `screenplay` — only fire once per upload).

**Constraints**

- The card lives in the Editor, not the Chat. It is mounted as a sibling of `<Screenplay>` with absolute positioning relative to the script paper-sheet wrapper.
- It does not block interaction with the script — clicking outside the card does not dismiss it (only explicit close or a CTA).
- Reading mode (T3.3) does not show the card. (Reading mode and "first open" are mutually exclusive states anyway, but if the user opens reading mode before dismissing, the card defers to reading mode and re-appears on exit.)
- Reference `docs/tier4-mockups.html` → T4.4 → "A · Sticky note" for exact spec.

---

## T4.5 — Quick-win polish pack ✅ APPROVED (all six pairs)

**Problem.** Six small visual loose ends from the Round 2 audit. Each is too small to justify a brief on its own; together they tighten the brand a full notch. Ship as one PR.

**APPROVED DIRECTION.** Six before/after swaps, atomic. Per `docs/tier4-mockups.html` → T4.5.

### 1. Status pip → Status stamp

Replace the 7px colored circle in note rows / Triage view with a differentiated form per status:

| Status | Glyph | Color | Label |
|---|---|---|---|
| unread | `○` (Courier 14px) | `RD.gold` | `Open` |
| discussing | `◐` (Courier 14px) | `RD.copper` | `Discussing` |
| applied | `✓` (Courier 14px) | `RD.forest` | `Applied` |

Render together as `<span>` with `display: inline-flex; gap: 5; font-family: ${RD.script}; font-size: 11; font-weight: 700; letter-spacing: 0.5; text-transform: uppercase; color: <statusColor>`.

**Where:** `src/components/Notes/TriageView.tsx`, `src/components/Notes.tsx` (list view). Extract a `<StatusStamp status={...} />` component.

### 2. Chat avatar — gradient → name tag

Replace the gradient circle in `src/components/Chat.tsx` (the 38×38 avatar at the top of the chat header) with a filled square name-tag:
- 38×38, `background: agent.color || character.color`, color `RD.paper`, Courier 14px 700 letter-spacing 0.5.
- `transform: rotate(-3deg)`.
- Tape strip 60% wide at top: `position: absolute; top: -4; left: 20%; right: 20%; height: 6; background: rgba(184,137,58,0.55); transform: rotate(1.5deg); box-shadow: 0 1px 1px rgba(60,40,20,0.1)`.
- Box-shadow: `0 1px 2px rgba(60,40,20,0.18), inset 0 -2px 0 rgba(0,0,0,0.12)`.

Extract `<NameTag name color size rotate />` into `src/components/NameTag.tsx`. Use it for the chat header AND in Bible drawer (T4.1).

### 3. Pinned messages — ★ → Pushpin

Replace the `★ {count}` button in `src/components/Chat.tsx` header with a copper pushpin glyph + `Pinned · {count}`:
- Pushpin: 11px radial-gradient circle (spec same as T4.4 pushpin, smaller).
- Label: sans 10px 700 letter-spacing 1.5 uppercase `RD.copper`.
- Container: `padding: 5px 10px 5px 8px; background: RD.copperSoft; border: 1px solid ${RD.copper}; display: inline-flex; align-items: center; gap: 6`.

Extract `<Pushpin size color />` into `src/components/Pushpin.tsx`. Re-used in T4.4.

### 4. Patterns — buried tab → topbar pill

Promote the `Patterns` tab (currently inside `src/components/Notes.tsx` as a tab next to `Notes 8`) to a topbar pill:
- Location: `src/components/TopBar.tsx`, between page count and save indicator.
- Visual: `padding: 4px 10px; background: RD.ink; color: RD.paper; border: 1px solid ${RD.copper}; display: inline-flex; align-items: center; gap: 6; font-family: ${RD.display}; font-style: italic; font-size: 11; font-weight: 700; letter-spacing: 1.2; text-transform: uppercase`. Glyph `◉` in `RD.copper` 13px.
- Hidden when `patternNotes.length === 0`. Surfaces with count when ≥ 1.
- Click → opens Notes panel and switches to Patterns tab (existing affordance, just wired from the new entry point).

The tab inside Notes panel can stay, OR demote to a small secondary chip; either way the topbar pill is now the primary entry point.

### 5. Sidebar scene row — add length, bookmark, J/K hint

In `src/components/Sidebar.tsx` (the location-grouped tree from T3.2):
- After the sub-location label, add a right-aligned scene-length cell: Courier 9.5px letter-spacing 0.5, color `RD.ruby` if `eighths > 5 pages` else `RD.inkFade`. Render the existing `eighths` value if present (`X Y/8`); fallback to `~N pgs` from `lines.length / linesPerPage`.
- Add a bookmark star at the end of each row: 11px sans, color `RD.gold` when bookmarked, `RD.line` when not. Click toggles. Persist `bookmarkedSceneIds` per-screenplay in localStorage (key: `splitdev.bookmarks.{screenplayId}`).
- Footer below the last group: `padding: 4px 12px; border-top: 1px dotted ${RD.line}` — italic Cormorant 9px letter-spacing 1 uppercase `RD.inkFade`:
  - `<copper>J/K</copper> next/prev` + `<copper>★</copper> bookmark`

Wire `J` and `K` keystrokes (no modifier) on the Editor root: jump active scene to next/prev scene heading.

### 6. Menu shadow — soft modern → ink on paper

In `src/components/Screenplay.tsx` (the `LineContextMenu` component, line ~440+):
- Replace `box-shadow: 0 12px 32px rgba(40,28,16,0.18)` with `box-shadow: 0 1px 2px rgba(40,28,16,0.16), 0 6px 10px rgba(40,28,16,0.18)`.
- Background `#fefcf2` (same as script paper sheet), `background-image: ${RD.paperTexture}; background-size: 32px 32px`.
- Remove `borderRadius: 2`. The menu is paper, not a chip.
- Eyebrow section labels: italic Cormorant 9.5px 700 letter-spacing 2 uppercase `RD.inkFade`.

**Where (T4.5)** — combined:

- New: `src/components/StatusStamp.tsx`, `src/components/NameTag.tsx`, `src/components/Pushpin.tsx`.
- `src/components/Notes/TriageView.tsx` — use `<StatusStamp>`.
- `src/components/Notes.tsx` — use `<StatusStamp>` in list view.
- `src/components/Chat.tsx` — replace gradient avatar with `<NameTag>`; replace `★ N` with `<Pushpin />` + label.
- `src/components/TopBar.tsx` — add Patterns pill.
- `src/components/Sidebar.tsx` — scene-length cell, bookmark star, J/K footer hint.
- `src/pages/Editor.tsx` — J/K keystroke handler.
- `src/components/Screenplay.tsx` — soften `LineContextMenu` shadow + paper background.

**Acceptance (T4.5)**

- All six swaps visible in the running app.
- Status stamps differentiated by glyph + color in both Triage view and list view.
- Chat header shows a name-tag avatar with tape strip; no gradient anywhere.
- Pinned-messages button reads "Pinned · 3" with a copper pushpin.
- Patterns pill appears in topbar when `patternNotes.length > 0`; clicking opens Notes panel + Patterns tab.
- Sidebar scene rows show length and bookmark star; J/K shortcuts work; footer hint visible.
- Right-click menu has the paper texture and tighter shadow.
- All work in `prefers-color-scheme: light` (which is the only scheme this build supports).

**Constraints**

- No new dependencies.
- Existing test coverage must remain green. Add no new tests; this is a visual PR.
- Reference `docs/tier4-mockups.html` → T4.5 for each pair's before/after.

---

# Closing checklist (Claude Code)

After each PR:
- [ ] Branch named `audit/T4-<num>-<short-slug>`
- [ ] `npm run build` passes (strict TS green)
- [ ] `npm test` (server vitest) passes
- [ ] No new dependencies in `package.json`
- [ ] No regressions in unchanged areas — click through every panel after each PR
- [ ] PR body lists the spec section, acceptance criteria checked off, deviations from the approved direction (with justification)
- [ ] Ambiguities called out in the PR body for reviewer attention

**Order dependency.**
- **T4.1 (Bible auto-populate)** — first. Pure data + new card. No deps on other Tier 4 items.
- **T4.5 (Polish pack)** — second. Independent. Extracts `NameTag` / `Pushpin` which T4.4 reuses.
- **T4.4 (Greeting ceremony)** — third. Depends on `Pushpin` from T4.5.
- **T4.2 (Apply ▸ wired)** — fourth. The deepest wiring of Tier 4; biggest PR. Independent of others.
- **T4.3 (Ingest theatre + Rounds)** — fifth. Depends on the `GutterPin` extracted in T4.2 (the `was:` pin and the round note-pin share the gutter primitive).

After all five merge into `tier4`:
1. Verify `docs/tier4-mockups.html` is committed.
2. Open PR: `tier4 → main`.
3. Use the app for a few days before pulling backlog items (B-1 Teleprompter, B-2 Split-pane diff, B-3 Whisper mode, B-4 Bilingual gloss).

If anything in this brief is ambiguous or contradicts CLAUDE.md, **stop and ask** before writing code. Do not improvise.

— end of brief —

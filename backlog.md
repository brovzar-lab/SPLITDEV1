# SPLITDEV — Backlog (deferred features)

Items that came out of the UX audit but were intentionally deferred. Each entry has the original audit context plus a re-entry point — when you're ready, lift the entry into a `TIER*_BRIEF.md` and ship it.

---

## B-1 — Reading mode · Teleprompter (T3.3 variant B)

**Source.** UX audit, Tier 3 mocks, May 16 2026. Variant B of T3.3 (Reading mode).

**What it is.** An auto-scrolling, single-character-highlighted reading mode. Rehearsal companion to the full-bleed paper mode (T3.3 variant A, shipped).

**Visual spec.** See `Tier 3 Mockups.html` → T3.3 → "Variation B — Teleprompter". Key elements:
- Vignetted reading band centered vertically (top + bottom fades to black)
- A single character highlighted in `RD.copperSoft` 26px; other characters muted to ~50% opacity
- Cast indicator top-left (avatar + "Reading: CARNICERO · others muted")
- Tempo control + progress bar bottom-center (0.8×, ½ scene marker)
- Inherits the dark stage from variant A

**Why deferred.** A is the higher-leverage reading surface (review/print-preview); B is a different use case (actor rehearsal). Ship A first, validate that reading-mode is a real workflow, then add B.

**Re-entry.** Add to a future `TIER3.5_BRIEF.md` or fold into a "rehearsal pack" feature alongside the existing Cast voice picker. Should reuse T3.3-A's keybind family — `⌘\` opens A; once open, `T` toggles into teleprompter mode.

**Dependencies.** T3.3-A must ship first. T2.2's Cast picker (already shipped) provides voice assignment.

---

## B-2 — Diff overlay · Split-pane comparator (T3.4 variant B)

**Source.** UX audit, Tier 3 mocks, May 16 2026. Variant B of T3.4 (Colored-draft diff).

**What it is.** A two-pane side-by-side comparator for any two revisions. Each pane is independently scrollable but scene-locked. Changed lines tinted in both panes. A change-list summary bar runs along the bottom.

**Visual spec.** See `Tier 3 Mockups.html` → T3.4 → "Variation B — Split-pane". Key elements:
- Ink-black top bar with "Compare [White Draft] vs [Blue Draft]" selects
- Two `MiniScript` panes on `RD.paperDeep` background
- Each pane shows the revision stamp top-right + heading + diffed lines
- Footer change-list: `[+1 action]` `[~1 dialogue]` chips with hover-to-jump
- "2 changes on scene 14 · 18 changes total" header readout

**Why deferred.** A (inline diff) is production-standard — prints, matches WGA conventions, is non-negotiable for the pipeline. B is a delighter for review sessions, not a workflow blocker.

**Re-entry.** Lift into a `TIER3.6_BRIEF.md` once T3.4-A is in real use. Worth pairing with a "Review Session" mode that locks the right panel into B and disables editing.

**Dependencies.** T3.4-A must ship first (provides the per-line change-detection logic that B reuses).

---

## B-3 — Whisper mode for agents (Tier 4.6)

**Source.** UX audit Round 1, PLAN.md.

**What it is.** A "Whispers" toggle. When on, agents emit margin suggestions silently after a 4-second pause on a scene (no chat sent). Suggestions appear as ghosted notes in the right gutter; `⌘↵` to promote to a real note.

**Why deferred.** Pure net-new feature, not an audit fix. Worth shipping after the core audit roadmap (T1+T2+T3) is in real use for a couple weeks so we know what "an idle pause on a scene" means in practice.

**Dependencies.** T2.2's gutter-pin system. Idle-detection helper. A "draft" note state on `Note`.

---

## B-4 — Bilingual gloss (Tier 4.7)

**Source.** UX audit Round 1, PLAN.md. Driven by the real Spanish "13 O'CLOCK" production script.

**What it is.** A "Show English gloss" toggle. Glosses live in a parallel data structure keyed by line. Useful for international writers' rooms.

**Why deferred.** Net-new feature with backend implications (translation pipeline, or pre-translated glosses authored manually). Out of audit scope.

**Dependencies.** Translation pipeline OR a manual gloss-authoring UI (separate design).

---

## How to use this file

When you're ready to ship one of these:
1. Pick the entry.
2. Copy the spec into a new `TIER3.5_BRIEF.md` / `TIER3.6_BRIEF.md` / `B-3_BRIEF.md` etc.
3. Flesh out the brief in the same shape as `TIER2_BRIEF.md` / `TIER3_BRIEF.md` — approval stamp, prerequisites, where/what/acceptance/constraints.
4. Paste into Claude Code.
5. Remove the entry from this file once shipped.

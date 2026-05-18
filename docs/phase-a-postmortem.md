# Phase A Post-Mortem — May 16–17, 2026

> **Source audit:** [`AUDIT_2026-05-16.md`](../AUDIT_2026-05-16.md) — sections §2.1 through §2.10.
> **Phase A scope:** "Stop the bleeding." The 10 showstopper bugs that would have cost the tool credibility on a producer demo.

---

## Summary

- **9 of 10 audit items fully closed.** §2.10 is partially closed and intentionally deferred to Phase B.
- **11 fix commits across 2 days** (May 16 and May 17), plus 1 audit-doc status update.
- **One repo-side migration** on persisted data: 30 corrupted dialogue/action rows in `screenplays.db` were repaired in-place.
- **Verified end-to-end** against the working branch on 2026-05-18 — every cited fix is present in the current code; no regressions detected.

---

## Fix log

| § | Status | Commit · Branch | File · Range | What the fix does |
|---|--------|-----------------|--------------|-------------------|
| 2.1 | ✅ Closed (two-layer) | `964c8f3` · `audit/T4-1-whitespace-collapse`<br>`f1625f9` · *direct on `main`* | `server/src/parsers/fountain.ts:11`<br>`server/src/parsers/fdx.ts`<br>`server/scripts/fix-whitespace.ts` *(new)* | Pre-parse regex normalizes intra-paragraph soft breaks to spaces; post-parse helper collapses runs; one-shot migration repaired 30 already-persisted rows in the `line` table's `text` column. See §2.1 deep-dive below. |
| 2.2 | ✅ Closed | `6f07b9b` · `audit/T4-2-location-grouping-case` | `src/lib/groupByLocation.ts:11–47` | `canonicalKey()` normalizes case, NFD-strips accents, and cuts at the first em-dash family — so `HACIENDA SERRANO — RECÁMARA` groups under `HACIENDA SERRANO`. |
| 2.3 | ✅ Closed | `8dcde82` · `audit/T4-3-beat-ribbon-overflow` | `src/components/TimelineRibbon.tsx:22–86` | `selectVisibleBeats()` runs collision math with `MIN_LABEL_GAP_PX = 8`, driven by a ResizeObserver. Drops minor beats first, then the edge-furthest minors, then a second major if the ribbon is still too tight. |
| 2.4 | ✅ Closed | `0ea9bd7` · `audit/T4-4-ribbon-zindex` | `src/components/TimelineRibbon.tsx:149,154` | `zIndex: 5` and a 1px bottom boxShadow on the ribbon container — script can no longer bleed under the rail. |
| 2.5 | ✅ Closed | `f76a318` · `audit/T4-5-sidebar-auto-reveal` | `src/components/Sidebar.tsx:29–51` | `useEffect` on `[activeScene, scenes]` expands the active scene's collapsed location group, then `scrollIntoView()`s the row (40ms defer so the DOM has settled). |
| 2.6 | ✅ Closed | `9738e89` · `audit/T4-6-kill-new-note-cta` | `src/components/Notes.tsx:36–57` | `+ New note` strings removed entirely; `NotesToolbar` left with only `Ingest`. Right-click → `Note this` is the canonical creation path. |
| 2.7 | ✅ Closed | `43d647c` · `audit/T4-7-remove-ask-ai-slug` | `src/components/Screenplay.tsx` | The `★ Ask AI` chip next to scene headings is gone. No `Ask AI` or `★` strings remain in the file. |
| 2.8 | ✅ Closed | `4f3e246` · `audit/T4-8-agent-pin-alignment` | `src/components/Screenplay.tsx:540–565` | `AgentMarginPin` rendered inside the scene-heading flex column, anchored at `top: 8` with a 6px stack gap — no longer floats mid-scene. |
| 2.9 | ✅ Closed | `737055a` · `audit/T4-9-remove-inline-page-divider` | `src/components/Screenplay.tsx` | Inline `— PAGE N —` divider component and all calls deleted. Page numbers continue to live only in the right margin (T1.5). |
| 2.10 | ⚠️ Partial — deferred | `2ac552c` · `audit/T4-10-title-prompt-on-upload` | `src/components/Library/UploadCard.tsx` | Title-prompt modal triggers on upload + triage completion when the parser's recovered title is missing or `Untitled`. See §2.10 deep-dive below. |
| — | 📝 Docs | `70744b4` · *direct on `main`* | `AUDIT_2026-05-16.md` | Status block at line 32 marks §2.1–§2.9 FIXED with cross-references to the commits above. |

---

## Special case — §2.1 (two-layer fix)

The first attempt (`964c8f3`, Tier 4 T4-1, May 16) added a `normalizeWhitespace()` helper that ran *after* `fountain-js` had tokenized the source. It collapsed runs of whitespace inside action and dialogue tokens, which fixed the most obvious symptoms — but it ran too late to recover information `fountain-js` had already destroyed. The tokenizer was stripping intra-paragraph soft line-breaks without inserting a space, so source like:

```
Tenemos que
hablar de Grupo Serrano.
```

was reaching the post-parse helper as `Tenemos quehablar de Grupo Serrano.` — the seam was already invisible.

The second attempt (`f1625f9`, May 17) moves the fix upstream. A single regex pre-process sits at `server/src/parsers/fountain.ts:11`:

```ts
const normalizedSource = source.replace(/([^\n])\n([^\n])/g, '$1 $2');
```

Single-newlines (intra-paragraph) become spaces; double-newlines (paragraph breaks) survive untouched. `fountain-js` sees only well-formed input, and the post-parse helper from T4-1 is preserved as defense-in-depth.

**Why a DB migration was unavoidable.** 30 rows in the `line` table already contained the fused text — pure code fix doesn't unmangle persisted data. The migration script at `server/scripts/fix-whitespace.ts` walks `line` rows where `type IN ('action', 'dialogue')` and runs `repairText()` against the single `text` column, repairing two patterns:

- **`lower→UPPER` fusion** (`estaríaEnterrada`) — split on the case boundary.
- **`lower→{¿¡}` fusion** (`vamos¿Por qué`) — split before the Spanish opening punctuation.

The script is transaction-wrapped (atomic across all 30 rewrites), guards every update with `if (repaired !== row.text)` (line 49) so already-clean rows are skipped, and logs each before/after. The regex patterns can't match output they've already produced, so re-running on clean data is a no-op by construction. Post-run scan: 0 remaining issues.

---

## Special case — §2.10 (partial closure)

The original audit spec at line 79–81 says:

> Title is `Untitled` but the project has 45 scenes — on first save, prompt for a title.

Commit `2ac552c` (T4-10) ships a title-prompt modal in `UploadCard.tsx`. It triggers on **upload + triage completion** when the parser's recovered title is missing or exactly `Untitled`, pre-fills with the source filename minus extension, and lets the user **Save** / **Skip** / **Escape**. That closes the dominant case — a Fountain or FDX file ingested without title-page metadata.

But "Untitled" can still reach the topbar via three flows the T4-10 modal doesn't cover:

1. **Skip path.** `UploadCard.tsx:74–77` keeps `Untitled` when the user dismisses the modal.
2. **API-created screenplays without title** — direct POST to `/api/screenplays` with no `title` field falls through to the default.
3. **Blank-start projects** — a screenplay created from scratch (not via upload) never enters the upload flow at all, so the modal never fires.

And the literal string `"Untitled"` is hard-coded as a fallback in four locations:

- `server/src/parsers/fountain.ts:16`
- `server/src/parsers/fdx.ts:37`
- `src/components/TopBar.tsx:168`
- `src/components/Library/UploadCard.tsx:65`

**Phase B follow-up spec.** To make `Untitled` impossible in the topbar, the fix needs:
- A first-save guard that intercepts before persisting an `Untitled` screenplay (the spec's "on first save, prompt").
- A pre-flight check at the topbar that prompts inline if it's about to render `Untitled`.
- Removal of the four hard-coded fallback strings — the empty case should bubble up to UI rather than masquerade as a value.

The "DEFERRED" label on §2.10 in the audit doc is honest.

---

## Files touched (rolled up)

By area:

- **Server / parsers** — `server/src/parsers/fountain.ts`, `server/src/parsers/fdx.ts`, `server/tests/parsers/fountain.test.ts`
- **Server / scripts** — `server/scripts/fix-whitespace.ts` *(new)*
- **Client / library** — `src/lib/groupByLocation.ts`
- **Client / components** — `src/components/TimelineRibbon.tsx`, `src/components/Sidebar.tsx`, `src/components/Notes.tsx`, `src/components/Screenplay.tsx`, `src/components/Library/UploadCard.tsx`
- **Docs** — `AUDIT_2026-05-16.md`

Phase B will likely re-architect `Screenplay.tsx` heavily (cursor-in-page + annotation gutter from §4.1–§4.2 of the audit). Three Phase A fixes — §2.7, §2.8, §2.9 — all landed in that file; expect their patches to interact with the gutter rewrite.

---

## Verification method

This post-mortem was produced by:

1. Walking `git log --since=2026-05-15 --oneline` on the active branch to locate every Phase A commit.
2. Dispatching two parallel `Explore` agents to cross-check each commit's diff against the current file state — confirming each fix is still live, not later regressed.
3. Reading `AUDIT_2026-05-16.md` end-to-end to anchor the numbering and §2.10 deferral language.
4. Running `git show --stat <sha>` for each of the 11 fix commits to map files touched.

No runtime smoke testing was performed. The build was green at HEAD when verification ran. The reproducibility check at the bottom of this doc lets any future reader re-run the same verification.

---

## What's open going into Phase B

**From §2 (this Phase A scope):**
- §2.10 — the 3 uncovered user flows and 4 hard-coded fallback strings listed above.

**From §3–§4 of the audit (always intended for Phase B):**
- §3.6 / §4.1 — **cursor in the page** is the load-bearing prerequisite; everything else depends on it.
- §4.1 — slide-out sidebar (`⌘1`) + slide-out notes (`⌘2`) + solitude (`⌘.`).
- §4.2 — unified **annotation gutter** at the right of the page; replaces the floating `S` pin, the linked-note slug badge, the per-line asterisks.
- §4.3 — `⌘K` command bar as the input grammar.
- §4.5 — `Patterns` topbar pill.

The audit doc remains the single source of truth for Phase B's spec; this post-mortem only handles closure of Phase A.

---

## How to re-verify this doc

End-to-end, ~5 minutes, no build step:

1. **Confirm every cited commit exists on the current branch:**
   ```sh
   git log --oneline | grep -E "964c8f3|6f07b9b|8dcde82|0ea9bd7|f76a318|9738e89|43d647c|4f3e246|737055a|2ac552c|f1625f9|70744b4"
   ```
   Expected: 12 lines.

2. **For each row in the fix-log table**, open the cited file at the cited range and confirm the change is present.

3. **Confirm the §2.10 fallback strings still exist** in the four files listed — they're the remaining work, not the fix:
   ```sh
   grep -n "Untitled" server/src/parsers/fountain.ts server/src/parsers/fdx.ts src/components/TopBar.tsx src/components/Library/UploadCard.tsx
   ```
   Expected lines (as of this writing): `fountain.ts:16`, `fdx.ts:37`, `TopBar.tsx:168`, `UploadCard.tsx:65`.

4. **Confirm the migration script is structurally idempotent** by re-reading the regex at `server/scripts/fix-whitespace.ts`: the `[lower][UPPER]` and `[lower][¿¡]` patterns can't match a string that's already been split with a space. Re-running on clean data is a no-op by construction. (No `--dry-run` flag; the script logs every before/after line and skips rows where `repairText(text) === text`.)

— end —

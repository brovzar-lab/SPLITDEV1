# SPLITDEV — The Writer's Atelier

<img width="2034" height="1042" alt="Screenshot 2026-05-14 at 9 31 39 PM" src="https://github.com/user-attachments/assets/784ac6e5-0f20-4d99-8871-1ce109d85368" />

Production port of the `SPLITDEV Redesign.html` prototype from the design handoff
bundle (`SPLITDEV_.zip` → `redesign/*.jsx`).

Built with Vite + React 18 + TypeScript. The visual layer is a 1:1 recreation of
the in-browser prototype: warm parchment + ink palette, editorial serif display
type, Courier screenplay, sticky-note cards, clapboard top bar, resizable panels.

## Stack

- React 18.3 + TypeScript 5.6
- Vite 5 (dev server + build)
- Inline styles via the shared `RD` token object in `src/tokens.ts` (mirrors the
  prototype's `RD` object 1:1)
- Google Fonts loaded in `index.html`: Cormorant Garamond, DM Sans, Courier Prime

## Layout

```
splitdev_v2/
├── index.html              # Loads fonts, mounts <App />
├── src/
│   ├── main.tsx            # React root
│   ├── App.tsx             # Top-level shell + resizable layout
│   ├── tokens.ts           # RD design tokens (palette, type, shadows)
│   ├── types.ts            # Shared TypeScript types
│   ├── data/               # Mock data (scenes, notes, characters, beats, …)
│   └── components/
│       ├── TopBar.tsx          # Clapboard top + revision picker + VoiceCast
│       ├── Sidebar.tsx         # Table of contents, heat map, beat outline
│       ├── Screenplay.tsx      # Manuscript view + Index Cards + line menu
│       ├── Notes.tsx           # Sticky/list/sheet densities + pattern view
│       ├── Chat.tsx            # Agent/character correspondence + pinned
│       ├── Bible.tsx           # Cast Bible drawer
│       ├── History.tsx         # Editor's log / undo footer
│       └── Divider.tsx         # Resizable pane handle
```

## Run

```bash
cd splitdev_v2
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle in dist/
npm run preview  # preview the production build
```

## Notes

- All data is mocked (matches the prototype). The screenplay, notes, character
  bible, beats, and AI replies are static fixtures in `src/data/`.
- Two demo `c1` / `c2` AI line suggestions in Scene 1 / Scene 2 are interactive:
  Accept / Reject / Edit. Status is held in component state.
- Index Cards view supports drag-to-reorder and a "What-If Mode" banner.
- Right-clicking any screenplay line opens the agent context menu.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project is on **Vite+** (the `vp` CLI), on top of pnpm. CI uses pnpm 11 / Node 24. Old `pnpm <script>` invocations still work — the npm scripts in `package.json` delegate to `vp`.

- `vp install` — install dependencies (delegates to pnpm)
- `vp dev` — start dev server
- `vp build` — production build to `dist/`
- `vp preview` — serve the production build
- `vp check` — format + lint (type-aware oxlint) + type check; **use this for validation loops**
- `vp check --fix` — auto-fix formatting and fixable lint issues
- `vp test` — run vitest (no test files currently — exits 1 by design)

Tool-specific config (lint plugins/rules, fmt ignore patterns, staged hook) lives in the `lint`, `fmt`, and `staged` blocks of `vite.config.ts`. The `.oxlintrc.json` / `.oxfmtrc.json` files no longer exist.

## Design — "The Seventh Candle"

**Read first.** The gameplay loop and visual style for this game are
specified in:

- [`docs/gameplay.md`](./docs/gameplay.md) — concept, win/lose, phase
  tuning, candle positions, state shape, audio events.
- [`docs/art-direction.md`](./docs/art-direction.md) — palette, map layout,
  landmark primitive specs, lighting plan, phase visual shifts.

Implementation should match those docs; if you deviate intentionally,
update the doc so future Claude has the right reference. **The docs are
canonical** — they outrank older inline comments or memory.

## Architecture

A single-page Three.js horror game. The game lives in `src/main.ts`. The
flow is:

1. The script imports `style.css`, `images.ts`, and `audio.ts`, then mounts
   HUD markup into `#app` (from `index.html`).
2. It builds the scene from the spec in `docs/art-direction.md` — floor,
   perimeter walls + iron-fence spikes, ambient + moonlight + flickering
   central point light, mausoleum row, chapel ruin, hanging tree, 25 decoy
   graves + 7 candle graves, the gate, low fog patches.
3. The "menace" is a `THREE.Sprite` textured from
   `https://assets.vsantele.dev/max-la-menace/<filename>.webp`
   (filenames hardcoded in `src/images.ts`, `getRandomImageUrl`). New
   texture per respawn; previous is `.dispose()`d. A second flanker sprite
   spawns at candle 5.
4. Input: pointer lock + WASD/arrows + Shift + **E (interact)** on desktop;
   virtual joystick + drag-to-look + SPRINT + ACTION on touch. Camera
   clamped `[-14, 14]` on x and z (room is 30×30).
5. Each frame: run the game state machine (whisper scheduling, interact
   check, phase tuning, win/lose detection), lerp Max toward the camera,
   render.

When adding gameplay features, prefer extending `main.ts` directly rather
than introducing modules, unless the file grows clearly unwieldy. `audio.ts`
and `images.ts` are the two existing modules; both are small and
self-contained.

## TypeScript

`tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. Notable consequences:

- Indexed access returns `T | undefined` — `images[i]` is `string | undefined`, so be deliberate about narrowing.
- `verbatimModuleSyntax` requires `import type` for type-only imports.
- Imports of local files use the `.js` extension even though sources are `.ts` (see `main.ts` importing `./images.js`).

## Deployment

`.github/workflows/deploy.yml` deploys `main` to GitHub Pages. The build runs `pnpm exec vp build --base="/${{ github.event.repository.name }}/"`, so all asset paths are prefixed with the repo name in production. Keep asset references relative or root-relative to `/` so the base rewrite works.

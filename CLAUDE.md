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

## Architecture

A single-page Three.js horror game. The entire game lives in `src/main.ts` — there is no scene/entity abstraction layer. The flow is:

1. The script imports `style.css` and `images.ts`, then mounts HUD markup into `#app` (from `index.html`).
2. It builds a fixed scene (floor, four walls, ambient + directional + flickering point light, 32 randomly placed grave meshes).
3. The "menace" is a `THREE.Sprite` whose texture is loaded at runtime from `https://assets.vsantele.dev/max-la-menace/<filename>.webp`. The filenames are hardcoded in `src/images.ts` (`getRandomImageUrl`). A new texture is picked on every respawn and the previous one is `.dispose()`d.
4. Input: pointer lock on click, WASD/arrows + Shift for movement, mouse for yaw/pitch. Camera position is clamped to `[-14, 14]` on both axes (room is 30×30).
5. The menace lerps toward the camera each frame; on `distance < 1.25` the player is caught and `respawn()` runs after 1.8s.

When adding gameplay features, expect to extend `main.ts` directly rather than introducing modules, unless the file grows unwieldy.

## TypeScript

`tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. Notable consequences:

- Indexed access returns `T | undefined` — `images[i]` is `string | undefined`, so be deliberate about narrowing.
- `verbatimModuleSyntax` requires `import type` for type-only imports.
- Imports of local files use the `.js` extension even though sources are `.ts` (see `main.ts` importing `./images.js`).

## Deployment

`.github/workflows/deploy.yml` deploys `main` to GitHub Pages. The build runs `pnpm exec vp build --base="/${{ github.event.repository.name }}/"`, so all asset paths are prefixed with the repo name in production. Keep asset references relative or root-relative to `/` so the base rewrite works.

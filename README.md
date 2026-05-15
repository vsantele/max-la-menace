# Max: La Menace

A browser-based horror game built with Three.js and Vite. Wander a fog-shrouded
graveyard at night while **Max** — a sprite that lerps relentlessly toward
you — closes in. Survive as long as you can.

**Play it now:** https://vsantele.github.io/max-la-menace/

## Controls

### Desktop

- **Click** the screen to lock the pointer and begin.
- **Mouse** — look around
- **WASD** / Arrow keys — move
- **Shift** — sprint
- **Esc** — release the pointer

### Mobile / touch

- **Tap** the screen to begin.
- **Left half** of the screen — drag to walk (virtual joystick appears where
  your thumb lands).
- **Right half** of the screen — drag to look around.
- **SPRINT** button (bottom-right) — hold to run.

The **SOUND** button in the top-right toggles the ambient soundtrack at any
time. The soundtrack is generated procedurally with the Web Audio API — a
sub-bass drone, a dissonant pad, filtered wind, and a heartbeat that quickens
as Max draws nearer.

## Development

This project uses **pnpm** (the CI workflow pins pnpm 11 / Node 24).

```bash
pnpm install
pnpm dev          # start the Vite dev server
pnpm build        # production build to dist/
pnpm preview      # serve the production build locally
pnpm lint         # oxlint
pnpm fmt          # oxfmt
```

## Deployment

Pushes to `main` are deployed to GitHub Pages by
`.github/workflows/deploy.yml`. The workflow runs
`vite build --base="/${repo}/"`, so production assets are served from
`/max-la-menace/`.

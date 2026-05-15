# Stage manager — architecture for multi-stage progression

Companion to [gameplay.md](./gameplay.md) and [art-direction.md](./art-direction.md). This file is the implementation contract for splitting `src/main.ts` so a second stage (house interior) can ship and a third can follow without further refactors.

## 1. Chosen architecture (and rejected alternatives)

**Chosen.** `main.ts` keeps every long-lived service — renderer, camera, clock, scene, HUD elements, input state (keys, joystick, pointer-lock, look angles), audio, end-screen, the rAF loop — and becomes a thin orchestrator that owns one variable: `currentStage: Stage | null`. Each stage lives in its own module under `src/stages/` and exports a single factory `createStage(ctx: StageContext): Stage`. A `Stage` is a plain object with `id`, `update(dt, t)`, and `dispose()`; it returns a `StageOutcome` (`"win" | "lose" | null`) from `update` to let the orchestrator decide what comes next. The orchestrator's frame loop calls `currentStage.update(dt, t)`, watches the outcome, and on transition runs `currentStage.dispose()` before instantiating the next stage. The scene is a _shared_ `THREE.Scene` — stages add their meshes into a stage-local `THREE.Group` they own and remove on dispose, so the orchestrator never has to know what a stage put in the world. HUD remains owned by `main.ts`; stages talk to it through three small callbacks on `StageContext` (`setStatus`, `setObjective`, `setCandleCount` — the last is repurposed as a generic "secondary counter" string). This is one new file (`Stage.ts` types), one orchestrator slimming pass on `main.ts`, and one `stages/graveyard.ts` containing today's gameplay code verbatim.

**Rejected.** I rejected an ECS / entity-system layer — there are no entity behaviors that recur across stages today, so the indirection would be pure cost. I rejected a `GameManager` / `SceneManager` / `InputManager` triad — that's the manager-of-managers anti-pattern and would force every stage to plumb services through three lookups. I rejected dynamic `import()` for stages (per the constraint) — the bundle is small and Vite's tree-shaking is fine. I rejected fresh `THREE.Scene` per stage — it forces re-creating renderer state and risks losing pixel-ratio / shadow-map settings, and offers no real benefit since `Group.remove()` + `dispose()` is sufficient. I rejected an event bus — outcomes are a single return value, so a function return is clearer than a `mitt`-style emitter.

## 2. The `Stage` interface

```ts
// src/stages/Stage.ts
import type * as THREE from "three";
import type { StageContext } from "./StageContext.js";

export type StageOutcome = "win" | "lose" | null;
export type StageId = "graveyard" | "house";

export interface Stage {
  readonly id: StageId;
  /** Per-frame tick. Return "win" / "lose" to request a transition; null otherwise. */
  update(deltaTime: number, elapsedTime: number): StageOutcome;
  /** Tear down everything this stage added: meshes, materials, textures, lights,
   *  listeners, timers. After dispose() the stage must be unreachable from GC roots. */
  dispose(): void;
}

export type StageFactory = (ctx: StageContext) => Stage;
```

## 3. The `StageContext`

```ts
// src/stages/StageContext.ts
import type * as THREE from "three";
import type { CreepyAudio } from "../audio.js";

/** Read-only per-frame player intent, derived in main.ts from keys + joystick + look. */
export interface PlayerInput {
  /** XZ walk vector in world space, already yaw-rotated, magnitude 0..1. */
  readonly walk: THREE.Vector3;
  readonly sprint: boolean;
  /** True for exactly one frame on E / action button press. */
  readonly interactPressed: boolean;
}

export interface StageHud {
  setStatus(text: string): void; // top-left status line
  setObjective(text: string): void; // "Whispered:" line — reused as generic objective
  setCounter(text: string): void; // "Candles:" line — reused as generic counter
  showEndscreen(title: string, sub: string): void;
  setPulse(opacity: number): void; // red vignette
}

export interface StageContext {
  readonly scene: THREE.Scene; // shared; stages parent into ctx.stageRoot
  readonly stageRoot: THREE.Group; // fresh group added/removed by orchestrator
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly clock: THREE.Clock;
  readonly audio: CreepyAudio;
  readonly hud: StageHud;
  readonly input: PlayerInput; // mutated by main.ts each frame, read by stages
  readonly isTouchDevice: boolean;
}
```

## 4. Stage-manager glue in `main.ts`

```ts
// --- after renderer / camera / clock / hud queries / input setup ---

import { createGraveyardStage } from "./stages/graveyard.js";
import { createHouseStage } from "./stages/house.js";
import type { Stage, StageId } from "./stages/Stage.js";
import type { PlayerInput, StageContext } from "./stages/StageContext.js";

// PlayerInput is a single mutable object reused every frame (no GC).
const playerInput: PlayerInput & {
  walk: THREE.Vector3;
  sprint: boolean;
  interactPressed: boolean;
} = {
  walk: new THREE.Vector3(),
  sprint: false,
  interactPressed: false,
};

const hud: StageHud = {
  setStatus: (t) => {
    statusEl.textContent = t;
  },
  setObjective: (t) => {
    whisperNameEl.textContent = t;
  },
  setCounter: (t) => {
    candleCountEl.textContent = t;
  },
  showEndscreen: (title, sub) => {
    endscreenTitleEl.textContent = title;
    endscreenSubEl.textContent = sub;
    endscreenEl.removeAttribute("hidden");
  },
  setPulse: (o) => {
    pulseEl.style.opacity = String(o);
  },
};

let currentStage: Stage | null = null;
let currentStageRoot: THREE.Group | null = null;

const buildCtx = (root: THREE.Group): StageContext => ({
  scene,
  stageRoot: root,
  camera,
  renderer,
  clock,
  audio,
  hud,
  input: playerInput,
  isTouchDevice,
});

const STAGE_FACTORIES = {
  graveyard: createGraveyardStage,
  house: createHouseStage,
} as const;

const enterStage = (id: StageId): void => {
  if (currentStage) {
    currentStage.dispose();
  }
  if (currentStageRoot) {
    scene.remove(currentStageRoot);
    currentStageRoot = null;
  }
  const root = new THREE.Group();
  scene.add(root);
  currentStageRoot = root;
  endscreenEl.setAttribute("hidden", "");
  currentStage = STAGE_FACTORIES[id](buildCtx(root));
};

const handleOutcome = (outcome: StageOutcome): void => {
  if (!outcome || !currentStage) return;
  const finishedId = currentStage.id;
  if (outcome === "win" && finishedId === "graveyard") enterStage("house");
  else if (outcome === "win" && finishedId === "house") {
    /* game complete — leave endscreen up */
  } else if (outcome === "lose") enterStage(finishedId); // retry same stage
};

// Endscreen click → re-enter the stage that just ended (or graveyard from idle).
endscreenEl.addEventListener("click", () => enterStage(currentStage?.id ?? "graveyard"));

// rAF loop — input gathered here, stage just reads it.
const animate = (): void => {
  const dt = Math.min(clock.getDelta(), 0.05);
  gatherPlayerInput(playerInput); // existing keys+joystick code, refactored
  const outcome = currentStage?.update(dt, clock.elapsedTime) ?? null;
  renderer.render(scene, camera);
  playerInput.interactPressed = false; // consume one-shot
  handleOutcome(outcome);
  requestAnimationFrame(animate);
};

enterStage("graveyard");
animate();
```

## 5. Migration plan (refactor `main.ts` → orchestrator + `stages/graveyard.ts`)

- **Create** `src/stages/Stage.ts` and `src/stages/StageContext.ts` with the types above. **Create** `src/stages/graveyard.ts`.
- **Move into `graveyard.ts`:** every `THREE` object construction currently between "Ground, perimeter, lighting" and "Per-frame update" inline blocks — floor, walls, fence spikes, hanging tree, chapel ruin, mausoleum row, gate group/leaves/spot, graves + nameplates, candles, both menace sprites + `loadMenaceTexture`. Each gets parented to `ctx.stageRoot` instead of `scene`. The current free `game` state object becomes a closure-local `state` inside `createGraveyardStage`. `startRun`, `triggerWhisper`, `lightCandle`, `tryInteract`, `triggerCatch`, `triggerWin`, `applyPhaseTuning`, `updatePlayer` (the parts that move the camera using `ctx.input.walk` / `ctx.input.sprint`), `updateMenace`, `updateGate`, `updateFlame`, `updateActionPromptVisibility` all become inner functions. The `update(dt, t)` method is the body of today's `animate()` minus rAF/render — it returns `"win"` instead of calling `showEndscreen` for the win path, `"lose"` for caught (orchestrator shows the endscreen via `ctx.hud.showEndscreen`). `dispose()` walks `stageRoot` (see §6) and clears any stage-owned `setTimeout` ids and the `flickerLight` if it was added directly to `scene` — move it into `stageRoot` so dispose is uniform.
- **Stays in `main.ts`:** DOM query selectors, HUD shim, audio toggle wiring, pointer-lock + touch handlers writing to `playerInput`, resize listener, `__maxDebug` hook (point it at `currentStage` instead of `game`), the rAF loop, `enterStage` / `handleOutcome`. `images.ts` splits into `MONSTER_IMAGES` + `DECORATION_IMAGES` exports — graveyard imports `MONSTER_IMAGES`, house can use either.
- **Split `images.ts`:** rename `images` to `MONSTER_IMAGES`, add `DECORATION_IMAGES`, replace `getRandomImageUrl()` with `getRandomMonsterUrl()` / `getRandomDecorationUrl()`. Update graveyard's two call sites.
- **Stage 2 stub:** `createHouseStage` returns a `Stage` whose `update` always returns `null` (so the build compiles) and whose `dispose` does nothing — implementation lands in the next ticket.

## 6. Cleanup contract — what `dispose()` MUST do

A stage that disposes correctly leaves zero traces in the renderer, the GPU, the DOM, or the timer queue. The contract:

- **Walk `stageRoot` with `traverse()`** and for every descendant:
  - `THREE.Mesh` / `THREE.Sprite` / `THREE.Points`: call `geometry.dispose()` then dispose every material (a mesh's `.material` may be `Material | Material[]`).
  - **Materials:** call `.dispose()` and also dispose every texture slot the material holds — `.map`, `.normalMap`, `.alphaMap`, `.emissiveMap`, plus the `SpriteMaterial.map` (this is the menace texture — loaded fresh per respawn, must not leak).
  - **`THREE.CanvasTexture`** (nameplates and any HUD-canvas-derived texture): the underlying `<canvas>` element is GC'd, but the GPU upload only releases on `.dispose()`. **Forgetting this is the #1 leak in the current code path.**
  - **`THREE.InstancedMesh`** (fence spikes): dispose `.geometry` _and_ `.dispose()` on the InstancedMesh itself — the instance attribute buffer is separate from the geometry attributes.
  - **`THREE.PointLight` / `SpotLight` / `DirectionalLight`**: no GPU resource of their own, but if the light has a `.shadow.map` (because `castShadow = true`), call `light.shadow.map?.dispose()` and null it. The shadow target object can stay parented to root.
  - **`THREE.Group`**: nothing to dispose, just `removeFromParent()` after the walk.
- **After traversal**, `scene.remove(stageRoot)`. The orchestrator does this; `dispose()` only has to traverse + dispose.
- **`setTimeout` / `setInterval`**: every timer the stage scheduled must have its id captured in a stage-local `Set<number>` and cleared in `dispose()`. The current `setTimeout(... 1500)` in `triggerWrongCandle` is the example — wrap it.
- **`requestAnimationFrame`**: stages do **not** own a rAF token; the orchestrator owns the single rAF loop. (If a stage ever needs one, capture and `cancelAnimationFrame` in `dispose()`.)
- **`addEventListener`**: stages should not add window/document listeners — they read input via `ctx.input`. If a stage _must_ (e.g. a special pointer hit-test), it captures the handler reference and removes it in `dispose()`. The keyboard/touch/mouse listeners stay on `main.ts` and persist across stages.
- **Audio**: `audio` is a shared service that outlives stages. `dispose()` should call `audio.restoreMaster(1)` if it ducked, and stop nothing else. Do not destroy the AudioContext.
- **HUD / endscreen DOM**: owned by `main.ts`. `dispose()` does **not** touch the DOM directly — it can clear via `ctx.hud.setStatus("")` etc. but must not remove or hide endscreen (the orchestrator manages that on stage entry).
- **`__maxDebug`**: re-pointed to the live stage on every `enterStage` so Playwright tests can still poke `window.__maxDebug.stage`.

## 7. Forward compatibility — adding stage 3

Adding a third stage is: create `src/stages/<name>.ts` exporting `create<Name>Stage`, add it to `STAGE_FACTORIES`, and extend `StageId`. Adjust the `handleOutcome` branch table — that's the only orchestrator code that knows transition rules, so the routing for "house win → stage 3" is a one-line change. If stage 3 needs a shared service the others don't (e.g. a particle system pool), add it to `StageContext` as a `readonly` optional and stages that don't need it ignore it — no existing stage breaks.

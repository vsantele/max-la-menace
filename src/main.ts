import "./style.css";
import * as THREE from "three";
import { audio } from "./audio.js";
import { createGraveyardStage } from "./stages/graveyard.js";
import { createHouseStage } from "./stages/house.js";
import type { Stage, StageFactory, StageId, StageOutcome } from "./stages/Stage.js";
import type { PlayerInput, StageContext, StageHud } from "./stages/StageContext.js";

// ---------------------------------------------------------------------------
// DOM + HUD
// ---------------------------------------------------------------------------

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app element not found");
}

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const idleInstructions = isTouchDevice
  ? "Tap to begin. Light the seven candles in the whispered order, then reach the gate."
  : "Click to begin. WASD to walk, mouse to look, Shift to sprint, E to interact.";

app.innerHTML = `
  <div class="hud">
    <h1>Max: La Menace</h1>
    <p class="status" aria-live="polite">${idleInstructions}</p>
    <p class="objective"><span class="objective-label">Objective:</span> <span class="whisper-name">—</span></p>
    <p class="objective"><span class="objective-label">State:</span> <span class="candle-count">0 / 7</span></p>
  </div>
  <div class="prompt" aria-hidden="true"></div>
  <div class="stage-hint" aria-live="polite"><span class="stage-hint__label">Whispered</span><span class="stage-hint__name">—</span></div>
  <button class="audio-toggle" type="button" aria-pressed="false" aria-label="Toggle sound">SOUND OFF</button>
  <div class="touch-ui${isTouchDevice ? " touch-ui--enabled" : ""}" aria-hidden="true">
    <div class="joystick">
      <div class="joystick-knob"></div>
    </div>
    <button class="action-btn" type="button" aria-label="Interact">LIGHT</button>
    <button class="sprint-btn" type="button" aria-label="Sprint">SPRINT</button>
  </div>
  <div class="pulse" aria-hidden="true"></div>
  <div class="endscreen" hidden>
    <div class="endscreen__inner">
      <h2 class="endscreen__title">—</h2>
      <p class="endscreen__sub">—</p>
      <p class="endscreen__hint">Click to continue</p>
    </div>
  </div>
`;

const statusEl = app.querySelector<HTMLElement>(".status")!;
const whisperNameEl = app.querySelector<HTMLElement>(".whisper-name")!;
const candleCountEl = app.querySelector<HTMLElement>(".candle-count")!;
const promptEl = app.querySelector<HTMLElement>(".prompt")!;
const stageHintEl = app.querySelector<HTMLElement>(".stage-hint")!;
const stageHintNameEl = app.querySelector<HTMLElement>(".stage-hint__name")!;
const pulseEl = app.querySelector<HTMLElement>(".pulse")!;
const audioToggleEl = app.querySelector<HTMLButtonElement>(".audio-toggle")!;
const joystickEl = app.querySelector<HTMLElement>(".joystick")!;
const joystickKnobEl = app.querySelector<HTMLElement>(".joystick-knob")!;
const sprintBtnEl = app.querySelector<HTMLButtonElement>(".sprint-btn")!;
const actionBtnEl = app.querySelector<HTMLButtonElement>(".action-btn")!;
const endscreenEl = app.querySelector<HTMLElement>(".endscreen")!;
const endscreenTitleEl = app.querySelector<HTMLElement>(".endscreen__title")!;
const endscreenSubEl = app.querySelector<HTMLElement>(".endscreen__sub")!;

// ---------------------------------------------------------------------------
// Renderer / scene / camera / clock
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.Fog(0x0a0a14, 14, 38);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.append(renderer.domElement);

const clock = new THREE.Clock();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Input — keyboard + pointer lock + touch (joystick / look / sprint / action)
// ---------------------------------------------------------------------------

const keyState = new Set<string>();
const look = { yaw: Math.PI, pitch: 0 };
const moveVector = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

const playerInput: PlayerInput & {
  walk: THREE.Vector3;
  sprint: boolean;
  interactPressed: boolean;
} = {
  walk: new THREE.Vector3(),
  sprint: false,
  interactPressed: false,
};

let isPointerLocked = false;
let gameStarted = false;

const joystickInput = { x: 0, y: 0 };
const touchSprint = { active: false };
const touchIds = {
  move: null as number | null,
  look: null as number | null,
};
const touchLookPrev = { x: 0, y: 0 };
const moveTouchOrigin = { x: 0, y: 0 };
const JOYSTICK_RADIUS = 55;

const updateKnob = (nx: number, ny: number): void => {
  const px = nx * JOYSTICK_RADIUS;
  const py = ny * JOYSTICK_RADIUS;
  joystickKnobEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
};

window.addEventListener("keydown", (event) => {
  keyState.add(event.code);
  if (event.code === "KeyE") {
    playerInput.interactPressed = true;
  }
});
window.addEventListener("keyup", (event) => {
  keyState.delete(event.code);
});

// Compute playerInput per frame from current keys + joystick + look.yaw.
const gatherPlayerInput = (): void => {
  moveVector.set(0, 0, 0);
  let usingKeyboard = false;
  if (keyState.has("KeyW") || keyState.has("ArrowUp")) {
    moveVector.z -= 1;
    usingKeyboard = true;
  }
  if (keyState.has("KeyS") || keyState.has("ArrowDown")) {
    moveVector.z += 1;
    usingKeyboard = true;
  }
  if (keyState.has("KeyA") || keyState.has("ArrowLeft")) {
    moveVector.x -= 1;
    usingKeyboard = true;
  }
  if (keyState.has("KeyD") || keyState.has("ArrowRight")) {
    moveVector.x += 1;
    usingKeyboard = true;
  }
  if (!usingKeyboard) {
    moveVector.x = joystickInput.x;
    moveVector.z = joystickInput.y;
  }
  const mag = moveVector.length();
  if (mag > 0.1) {
    if (mag > 1) moveVector.divideScalar(mag);
    moveVector.applyAxisAngle(upAxis, look.yaw);
  } else {
    moveVector.set(0, 0, 0);
  }
  playerInput.walk.copy(moveVector);
  playerInput.sprint =
    keyState.has("ShiftLeft") || keyState.has("ShiftRight") || touchSprint.active;
  camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
};

// ---------------------------------------------------------------------------
// Pointer lock / mouse look (desktop)
// ---------------------------------------------------------------------------

const ensureAudioStarted = (): void => {
  if (!audio.hasStarted()) {
    void audio
      .start()
      .then(() => {
        const running = audio.isRunning();
        audioToggleEl.textContent = running ? "SOUND ON" : "SOUND OFF";
        audioToggleEl.setAttribute("aria-pressed", String(running));
      })
      .catch((e) => console.warn("audio start failed", e));
  }
};

audioToggleEl.addEventListener("click", async (event) => {
  event.stopPropagation();
  await audio.toggle();
  const running = audio.isRunning();
  audioToggleEl.textContent = running ? "SOUND ON" : "SOUND OFF";
  audioToggleEl.setAttribute("aria-pressed", String(running));
});

type PointerLockOptions = { unadjustedMovement?: boolean };
type RequestPointerLock = (options?: PointerLockOptions) => Promise<void> | void;
const requestLock = async (): Promise<void> => {
  if (document.pointerLockElement) return;
  const request: RequestPointerLock = (app.requestPointerLock as RequestPointerLock).bind(app);
  try {
    await request({ unadjustedMovement: true });
  } catch {
    await request();
  }
};

const startGameIfNeeded = (): void => {
  ensureAudioStarted();
  if (!gameStarted) {
    gameStarted = true;
    enterStage("graveyard");
  }
};

if (!isTouchDevice) {
  app.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("button")) return;
    startGameIfNeeded();
    void requestLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isPointerLocked = document.pointerLockElement === app;
  });

  window.addEventListener("mousemove", (event) => {
    if (!isPointerLocked) return;
    look.yaw -= event.movementX * 0.0024;
    look.pitch -= event.movementY * 0.002;
    look.pitch = THREE.MathUtils.clamp(look.pitch, -1.1, 1.1);
  });
}

// ---------------------------------------------------------------------------
// Touch input (mobile)
// ---------------------------------------------------------------------------

if (isTouchDevice) {
  const isOnUi = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    // Endscreen is a tap target — exclude it so the global touch handler
    // doesn't preventDefault and swallow the synthetic click.
    return target.closest("button, .joystick, .endscreen") !== null;
  };

  const handleTouchStart = (event: TouchEvent): void => {
    let shouldPrevent = false;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      const touch = event.changedTouches[i];
      if (!touch) continue;
      if (isOnUi(touch.target)) continue;
      shouldPrevent = true;
      const isLeftHalf = touch.clientX < window.innerWidth / 2;
      if (isLeftHalf && touchIds.move === null) {
        touchIds.move = touch.identifier;
        moveTouchOrigin.x = touch.clientX;
        moveTouchOrigin.y = touch.clientY;
        joystickEl.style.left = `${touch.clientX}px`;
        joystickEl.style.top = `${touch.clientY}px`;
        joystickEl.classList.add("joystick--active");
        updateKnob(0, 0);
      } else if (!isLeftHalf && touchIds.look === null) {
        touchIds.look = touch.identifier;
        touchLookPrev.x = touch.clientX;
        touchLookPrev.y = touch.clientY;
      }
    }
    if (shouldPrevent) {
      event.preventDefault();
      startGameIfNeeded();
    }
  };
  const handleTouchMove = (event: TouchEvent): void => {
    let shouldPrevent = false;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      const touch = event.changedTouches[i];
      if (!touch) continue;
      if (touch.identifier === touchIds.move) {
        shouldPrevent = true;
        const dx = touch.clientX - moveTouchOrigin.x;
        const dy = touch.clientY - moveTouchOrigin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const scale = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
        const nx = (dx * scale) / JOYSTICK_RADIUS;
        const ny = (dy * scale) / JOYSTICK_RADIUS;
        joystickInput.x = nx;
        joystickInput.y = ny;
        updateKnob(nx, ny);
      } else if (touch.identifier === touchIds.look) {
        shouldPrevent = true;
        const dx = touch.clientX - touchLookPrev.x;
        const dy = touch.clientY - touchLookPrev.y;
        look.yaw -= dx * 0.005;
        look.pitch -= dy * 0.005;
        look.pitch = THREE.MathUtils.clamp(look.pitch, -1.1, 1.1);
        touchLookPrev.x = touch.clientX;
        touchLookPrev.y = touch.clientY;
      }
    }
    if (shouldPrevent) event.preventDefault();
  };
  const handleTouchEnd = (event: TouchEvent): void => {
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      const touch = event.changedTouches[i];
      if (!touch) continue;
      if (touch.identifier === touchIds.move) {
        touchIds.move = null;
        joystickInput.x = 0;
        joystickInput.y = 0;
        joystickEl.classList.remove("joystick--active");
      } else if (touch.identifier === touchIds.look) {
        touchIds.look = null;
      }
    }
  };
  window.addEventListener("touchstart", handleTouchStart, { passive: false });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd);
  window.addEventListener("touchcancel", handleTouchEnd);

  const onSprintDown = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    touchSprint.active = true;
    sprintBtnEl.classList.add("sprint-btn--active");
  };
  const onSprintUp = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    touchSprint.active = false;
    sprintBtnEl.classList.remove("sprint-btn--active");
  };
  sprintBtnEl.addEventListener("touchstart", onSprintDown, { passive: false });
  sprintBtnEl.addEventListener("touchend", onSprintUp);
  sprintBtnEl.addEventListener("touchcancel", onSprintUp);
}

// Action button (both desktop and mobile)
const handleAction = (event: Event): void => {
  event.preventDefault();
  event.stopPropagation();
  startGameIfNeeded();
  playerInput.interactPressed = true;
};
actionBtnEl.addEventListener("click", handleAction);
actionBtnEl.addEventListener("touchstart", handleAction, { passive: false });

// ---------------------------------------------------------------------------
// HUD adapter (consumed by stages via ctx.hud)
// ---------------------------------------------------------------------------

const hud: StageHud = {
  setStatus(text) {
    statusEl.textContent = text;
  },
  setObjective(text) {
    whisperNameEl.textContent = text;
  },
  setCounter(text) {
    candleCountEl.textContent = text;
  },
  setActionPrompt(text) {
    if (text === null) {
      promptEl.style.opacity = "0";
    } else {
      promptEl.textContent = text;
      promptEl.style.opacity = "1";
    }
  },
  setActionReady(ready) {
    if (ready) actionBtnEl.classList.add("action-btn--ready");
    else actionBtnEl.classList.remove("action-btn--ready");
  },
  setStageHint(text) {
    if (text === null) {
      stageHintEl.classList.remove("stage-hint--show");
    } else {
      stageHintNameEl.textContent = text;
      stageHintEl.classList.add("stage-hint--show");
    }
  },
  showEndscreen(title, sub) {
    endscreenTitleEl.textContent = title;
    endscreenSubEl.textContent = sub;
    endscreenEl.removeAttribute("hidden");
  },
  setPulse(opacity) {
    pulseEl.style.opacity = String(opacity);
  },
};

// ---------------------------------------------------------------------------
// Stage manager
// ---------------------------------------------------------------------------

let currentStage: Stage | null = null;
let currentStageRoot: THREE.Group | null = null;
let lastOutcome: StageOutcome = null;
let lastStageId: StageId | null = null;

const STAGE_FACTORIES: Record<StageId, StageFactory> = {
  graveyard: createGraveyardStage,
  house: createHouseStage,
};

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
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
});

// Pre-populate debug hook so Playwright tests can invoke enterStage before the
// user has clicked. Re-pointed on every stage change.
(window as unknown as { __maxDebug?: unknown }).__maxDebug = {
  stage: null as Stage | null,
  camera,
  clock,
  scene,
  stageRoot: null as THREE.Group | null,
  input: playerInput,
  enterStage: (id: StageId): void => enterStage(id),
};

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
  hud.setActionPrompt(null);
  hud.setActionReady(false);
  hud.setStageHint(null);
  hud.setPulse(0);
  lastOutcome = null;
  currentStage = STAGE_FACTORIES[id](buildCtx(root));
  lastStageId = id;

  // Re-point debug hook at the active stage.
  const dbg = (window as unknown as { __maxDebug?: Record<string, unknown> }).__maxDebug;
  if (dbg) {
    dbg.stage = currentStage;
    dbg.stageRoot = currentStageRoot;
  }
};

const handleOutcome = (): void => {
  if (!lastOutcome || !lastStageId) return;
  // Stay paused on endscreen; advance only when the user clicks it.
};

let endscreenLatch = false;
const advanceFromEndscreen = (event: Event): void => {
  event.preventDefault();
  event.stopPropagation();
  // Debounce — touchstart fires before the synthetic click on mobile; without
  // this, both fire and we re-enter the same stage twice in one tap.
  if (endscreenLatch) return;
  endscreenLatch = true;
  window.setTimeout(() => {
    endscreenLatch = false;
  }, 350);

  // Many mobile browsers gate audio resume on a user gesture. The endscreen
  // tap is one — use it.
  ensureAudioStarted();

  if (!lastOutcome || !lastStageId) {
    enterStage("graveyard");
    return;
  }
  if (lastOutcome === "win" && lastStageId === "graveyard") {
    enterStage("house");
  } else if (lastOutcome === "win" && lastStageId === "house") {
    // Game complete — restart from the beginning.
    enterStage("graveyard");
  } else {
    enterStage(lastStageId); // retry same on lose
  }
};
endscreenEl.addEventListener("click", advanceFromEndscreen);
endscreenEl.addEventListener("touchstart", advanceFromEndscreen, { passive: false });

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------

const animate = (): void => {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const elapsedTime = clock.elapsedTime;

  gatherPlayerInput();

  if (currentStage) {
    const outcome = currentStage.update(deltaTime, elapsedTime);
    if (outcome && !lastOutcome) {
      lastOutcome = outcome;
      handleOutcome();
    }
  }

  // Consume one-shot interact press
  playerInput.interactPressed = false;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

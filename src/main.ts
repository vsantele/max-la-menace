import "./style.css";
import * as THREE from "three";
import { getRandomImageUrl } from "./images.js";
import { audio } from "./audio.js";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app element not found");
}

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const instructions = isTouchDevice
  ? "Drag the left side to walk. Drag the right side to look. Hold SPRINT to run."
  : "Click to enter. Move with WASD / Arrow keys. Hold Shift to sprint.";

app.innerHTML = `
  <div class="hud">
    <h1>Max: La Menace</h1>
    <p>${instructions}</p>
    <p class="status" aria-live="polite">Survive the darkness.</p>
  </div>
  <button class="audio-toggle" type="button" aria-pressed="false" aria-label="Toggle sound">SOUND OFF</button>
  <div class="touch-ui${isTouchDevice ? " touch-ui--enabled" : ""}" aria-hidden="true">
    <div class="joystick">
      <div class="joystick-knob"></div>
    </div>
    <button class="sprint-btn" type="button" aria-label="Sprint">SPRINT</button>
  </div>
  <div class="pulse" aria-hidden="true"></div>
`;

const statusEl = app.querySelector<HTMLElement>(".status")!;
const pulseEl = app.querySelector<HTMLElement>(".pulse")!;
const audioToggleEl = app.querySelector<HTMLButtonElement>(".audio-toggle")!;
const joystickEl = app.querySelector<HTMLElement>(".joystick")!;
const joystickKnobEl = app.querySelector<HTMLElement>(".joystick-knob")!;
const sprintBtnEl = app.querySelector<HTMLButtonElement>(".sprint-btn")!;

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

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({
    color: 0x2a2d38,
    roughness: 0.95,
    metalness: 0.05,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x363846,
  roughness: 0.9,
});
const wallGeometry = new THREE.BoxGeometry(30, 6, 0.8);

const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
northWall.position.set(0, 3, -15);
scene.add(northWall);

const southWall = northWall.clone();
southWall.position.z = 15;
scene.add(southWall);

const sideWallGeometry = new THREE.BoxGeometry(0.8, 6, 30);
const eastWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
eastWall.position.set(15, 3, 0);
scene.add(eastWall);

const westWall = eastWall.clone();
westWall.position.x = -15;
scene.add(westWall);

const ambientLight = new THREE.AmbientLight(0x4a5680, 0.85);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x9fb0ff, 1.1);
moonLight.position.set(-6, 12, 4);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
scene.add(moonLight);

const flickerLight = new THREE.PointLight(0xb0c8ff, 2.2, 30);
flickerLight.position.set(0, 4.5, 0);
scene.add(flickerLight);

const graveGeometry = new THREE.BoxGeometry(0.5, 1.3, 0.18);
const graveMaterial = new THREE.MeshStandardMaterial({
  color: 0x5a606a,
  roughness: 0.95,
});
for (let i = 0; i < 32; i += 1) {
  const grave = new THREE.Mesh(graveGeometry, graveMaterial);
  const angle = Math.random() * Math.PI * 2;
  const radius = 4 + Math.random() * 9;
  grave.position.set(Math.cos(angle) * radius, 0.65, Math.sin(angle) * radius);
  grave.rotation.y = (Math.random() - 0.5) * 0.6;
  grave.castShadow = true;
  grave.receiveShadow = true;
  scene.add(grave);
}

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

const MENACE_HEIGHT = 1.8;
const MENACE_WIDTH = 1.35;

const menaceMaterial = new THREE.SpriteMaterial({
  color: 0xffffff,
  transparent: true,
  depthWrite: false,
  fog: true,
});
const menace = new THREE.Sprite(menaceMaterial);
menace.scale.set(MENACE_WIDTH, MENACE_HEIGHT, 1);
menace.position.set(0, MENACE_HEIGHT / 2, -9);
scene.add(menace);

const menaceLight = new THREE.PointLight(0xa0134f, 0.7, 5);
menace.add(menaceLight);

const loadRandomMenaceTexture = (): void => {
  const url = getRandomImageUrl();
  textureLoader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const previous = menaceMaterial.map;
      menaceMaterial.map = texture;
      menaceMaterial.needsUpdate = true;
      previous?.dispose();
    },
    undefined,
    (err) => {
      console.error("Failed to load menace texture", url, err);
    },
  );
};

loadRandomMenaceTexture();

const keyState = new Set<string>();
const look = { yaw: Math.PI, pitch: 0 };
const moveVector = new THREE.Vector3();
const nextPosition = new THREE.Vector3();
const menaceTarget = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const clock = new THREE.Clock();

let isActive = false;
let isPointerLocked = false;
let isCaught = false;

const joystickInput = { x: 0, y: 0 };
const touchSprint = { active: false };
const touchIds = {
  move: null as number | null,
  look: null as number | null,
};
const touchLookPrev = { x: 0, y: 0 };
const moveTouchOrigin = { x: 0, y: 0 };
const JOYSTICK_RADIUS = 55;

const onResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener("resize", onResize);

window.addEventListener("keydown", (event) => {
  keyState.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keyState.delete(event.code);
});

const updateAudioToggle = (): void => {
  const running = audio.isRunning();
  audioToggleEl.textContent = running ? "SOUND ON" : "SOUND OFF";
  audioToggleEl.setAttribute("aria-pressed", String(running));
};

audioToggleEl.addEventListener("click", async (event) => {
  event.stopPropagation();
  await audio.toggle();
  updateAudioToggle();
});

const setActivePlayingStatus = (): void => {
  statusEl.textContent = "The menace can hear you...";
};

const setIdleStatus = (): void => {
  statusEl.textContent = isTouchDevice
    ? "Tap to enter. The menace stirs..."
    : "Click to enter. Move with WASD / Arrow keys.";
};

const ensureAudioStarted = async (): Promise<void> => {
  if (!audio.hasStarted()) {
    await audio.start();
    updateAudioToggle();
  }
};

type PointerLockOptions = { unadjustedMovement?: boolean };
type RequestPointerLock = (options?: PointerLockOptions) => Promise<void> | void;

const requestLock = async (): Promise<void> => {
  if (document.pointerLockElement) {
    return;
  }
  const request = app.requestPointerLock as RequestPointerLock;
  try {
    await request.call(app, { unadjustedMovement: true });
  } catch {
    await request.call(app);
  }
};

if (isTouchDevice) {
  renderer.domElement.addEventListener("click", () => {
    void ensureAudioStarted();
  });
} else {
  app.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    void ensureAudioStarted();
    void requestLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isPointerLocked = document.pointerLockElement === app;
    isActive = isPointerLocked;
    if (isActive) {
      setActivePlayingStatus();
    } else {
      setIdleStatus();
    }
  });

  window.addEventListener("mousemove", (event) => {
    if (!isPointerLocked) {
      return;
    }
    look.yaw -= event.movementX * 0.0024;
    look.pitch -= event.movementY * 0.002;
    look.pitch = THREE.MathUtils.clamp(look.pitch, -1.1, 1.1);
  });
}

if (isTouchDevice) {
  const isOnUi = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return target.closest("button, .joystick") !== null;
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
      if (!isActive) {
        isActive = true;
        setActivePlayingStatus();
        void ensureAudioStarted();
      }
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

  setIdleStatus();
}

const updateKnob = (nx: number, ny: number): void => {
  const px = nx * JOYSTICK_RADIUS;
  const py = ny * JOYSTICK_RADIUS;
  joystickKnobEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
};

const respawn = (): void => {
  camera.position.set(0, 1.6, 8);
  menace.position.set((Math.random() - 0.5) * 8, MENACE_HEIGHT / 2, -9);
  loadRandomMenaceTexture();
  isCaught = false;
  statusEl.textContent = "You escaped... for now.";
};

const updatePlayer = (deltaTime: number): void => {
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

  const magnitude = moveVector.length();
  if (magnitude > 0.1) {
    if (magnitude > 1) {
      moveVector.divideScalar(magnitude);
    }
    moveVector.applyAxisAngle(upAxis, look.yaw);

    const sprinting = keyState.has("ShiftLeft") || keyState.has("ShiftRight") || touchSprint.active;
    const speed = sprinting ? 5.2 : 3.1;
    nextPosition.copy(camera.position).addScaledVector(moveVector, speed * deltaTime);
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -14, 14);
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -14, 14);
    camera.position.copy(nextPosition);
  }

  camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
};

const updateMenace = (elapsedTime: number, deltaTime: number): void => {
  menaceTarget.set(camera.position.x, menace.position.y, camera.position.z);
  menace.position.lerp(menaceTarget, deltaTime * 0.28);
  menace.position.y = MENACE_HEIGHT / 2 + Math.sin(elapsedTime * 4) * 0.12;

  const distance = menace.position.distanceTo(camera.position);
  const pulse = THREE.MathUtils.clamp(1 - distance / 10, 0, 1);
  pulseEl.style.opacity = String(pulse * 0.85);
  audio.setIntensity(pulse);

  if (distance < 1.25 && !isCaught) {
    isCaught = true;
    statusEl.textContent = "The menace found you. Reawakening...";

    window.setTimeout(respawn, 1800);
  }
};

const animate = (): void => {
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.elapsedTime;

  flickerLight.intensity = 2.0 + Math.sin(elapsedTime * 11) * 0.25 + Math.random() * 0.15;

  if (!isCaught && isActive) {
    updatePlayer(deltaTime);
    updateMenace(elapsedTime, deltaTime);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

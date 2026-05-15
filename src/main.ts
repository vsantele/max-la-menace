import "./style.css";
import * as THREE from "three";
import { getRandomImageUrl } from "./images.js";
import { audio } from "./audio.js";

// ---------------------------------------------------------------------------
// Constants (kept in sync with docs/gameplay.md and docs/art-direction.md)
// ---------------------------------------------------------------------------

const NAMES = [
  "Élodie",
  "Henri",
  "Margaux",
  "Théodore",
  "Adèle",
  "Octave",
  "Camille",
  "Auguste",
  "Béatrice",
  "Vincent",
  "Joséphine",
  "Émile",
  "Hortense",
  "Léon",
  "Cosette",
  "Édouard",
  "Mathilde",
  "Gaspard",
  "Geneviève",
  "Bertrand",
  "Sidonie",
  "Ferdinand",
  "Eugénie",
  "Apollinaire",
  "Solange",
  "Thibault",
  "Anaïs",
  "Roland",
  "Florine",
  "Pascal",
  "Honorine",
  "Gilles",
  "Désirée",
  "Bastien",
  "Clotilde",
  "Lucienne",
  "Raphaël",
  "Maëlys",
  "Aurélien",
  "Pierrot",
] as const;

const CANDLE_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [-11, -9],
  [3, 11],
  [-2, -7],
  [12, 4],
  [-6, -12],
  [-6, 6],
  [3, 1],
];

const PLAYER_HEIGHT = 1.6;
const INTERACT_RADIUS = 1.4;
const GATE_TRIGGER_RADIUS = 1.6;
const GATE_HOLD_SECONDS = 2;
const RAGE_TIMER_SECONDS = 360;
const MAX_WRONG = 3;

// ---------------------------------------------------------------------------
// Boot / DOM
// ---------------------------------------------------------------------------

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app element not found");
}

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const idleInstructions = isTouchDevice
  ? "Tap to begin. Light the seven candles in the whispered order, then reach the gate."
  : "Click to begin. WASD to walk, mouse to look, Shift to sprint, E to light a candle.";

app.innerHTML = `
  <div class="hud">
    <h1>Max: La Menace</h1>
    <p class="status" aria-live="polite">${idleInstructions}</p>
    <p class="objective"><span class="objective-label">Whispered:</span> <span class="whisper-name">—</span></p>
    <p class="objective"><span class="objective-label">Candles:</span> <span class="candle-count">0 / 7</span></p>
  </div>
  <div class="prompt" aria-hidden="true"></div>
  <button class="audio-toggle" type="button" aria-pressed="false" aria-label="Toggle sound">SOUND OFF</button>
  <div class="touch-ui${isTouchDevice ? " touch-ui--enabled" : ""}" aria-hidden="true">
    <div class="joystick">
      <div class="joystick-knob"></div>
    </div>
    <button class="action-btn" type="button" aria-label="Light candle">LIGHT</button>
    <button class="sprint-btn" type="button" aria-label="Sprint">SPRINT</button>
  </div>
  <div class="pulse" aria-hidden="true"></div>
  <div class="endscreen" hidden>
    <div class="endscreen__inner">
      <h2 class="endscreen__title">—</h2>
      <p class="endscreen__sub">—</p>
      <p class="endscreen__hint">Click to try again</p>
    </div>
  </div>
`;

const statusEl = app.querySelector<HTMLElement>(".status")!;
const whisperNameEl = app.querySelector<HTMLElement>(".whisper-name")!;
const candleCountEl = app.querySelector<HTMLElement>(".candle-count")!;
const promptEl = app.querySelector<HTMLElement>(".prompt")!;
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
// Renderer / scene / camera
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.Fog(0x0a0a14, 14, 38);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, PLAYER_HEIGHT, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.append(renderer.domElement);

// ---------------------------------------------------------------------------
// Ground, perimeter, lighting
// ---------------------------------------------------------------------------

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.95, metalness: 0.05 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x363846, roughness: 0.9 });
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

// Iron fence spikes (instanced, decorative, no collider)
const spikeGeo = new THREE.BoxGeometry(0.06, 2.4, 0.06);
const spikeMat = new THREE.MeshStandardMaterial({
  color: 0x3a3d4a,
  metalness: 0.6,
  roughness: 0.4,
});
const SPIKES_PER_SIDE = 60;
const spikes = new THREE.InstancedMesh(spikeGeo, spikeMat, SPIKES_PER_SIDE * 4);
{
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let side = 0; side < 4; side += 1) {
    for (let i = 0; i < SPIKES_PER_SIDE; i += 1) {
      const t = -14.5 + (i / (SPIKES_PER_SIDE - 1)) * 29;
      if (side === 0) dummy.position.set(t, 1.2, -14.7);
      else if (side === 1) dummy.position.set(t, 1.2, 14.7);
      else if (side === 2) dummy.position.set(-14.7, 1.2, t);
      else dummy.position.set(14.7, 1.2, t);
      dummy.updateMatrix();
      spikes.setMatrixAt(idx, dummy.matrix);
      idx += 1;
    }
  }
}
spikes.instanceMatrix.needsUpdate = true;
scene.add(spikes);

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e7382, roughness: 1 });
const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1c24, roughness: 1 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 });

// Hanging tree at (0, -12)
{
  const tree = new THREE.Group();
  tree.position.set(0, 0, -12);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 5, 8), darkWoodMat);
  trunk.position.y = 2.5;
  tree.add(trunk);
  for (let i = 0; i < 5; i += 1) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 3, 5), darkWoodMat);
    const yaw = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
    branch.rotation.z = Math.PI / 3 + (Math.random() - 0.5) * 0.3;
    branch.rotation.y = yaw;
    branch.position.set(Math.cos(yaw) * 0.4, 4.2, Math.sin(yaw) * 0.4);
    tree.add(branch);
  }
  // Horizontal branch + noose
  const horiz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2.6, 5), darkWoodMat);
  horiz.rotation.z = Math.PI / 2;
  horiz.position.set(1.2, 4.5, 0);
  tree.add(horiz);
  const noose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), darkWoodMat);
  noose.position.set(2.3, 4.05, 0);
  tree.add(noose);
  scene.add(tree);
}

// Chapel ruin at (-10, 0)
{
  const chapel = new THREE.Group();
  chapel.position.set(-10, 0, 0);
  const nWall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 0.4), stoneMat);
  nWall.position.set(0, 1.4, -2);
  chapel.add(nWall);
  const eWallLower = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 4), stoneMat);
  eWallLower.position.set(2, 0.8, 0);
  chapel.add(eWallLower);
  const eWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 1.5), stoneMat);
  eWallUpper.position.set(2, 2.0, -0.9);
  chapel.add(eWallUpper);
  const sWall = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 0.4), stoneMat);
  sWall.position.set(0, 0.3, 2);
  chapel.add(sWall);
  // West side: arched opening — two pillars + lintel
  const wPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 1.0), stoneMat);
  wPillarL.position.set(-2, 1.6, -1.5);
  chapel.add(wPillarL);
  const wPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 1.0), stoneMat);
  wPillarR.position.set(-2, 1.6, 1.5);
  chapel.add(wPillarR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 4), stoneMat);
  lintel.position.set(-2, 3.0, 0);
  chapel.add(lintel);
  scene.add(chapel);
}

// Mausoleum row at (-9, -9)
{
  const row = new THREE.Group();
  row.position.set(-9, 0, -9);
  for (let i = 0; i < 3; i += 1) {
    const m = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.6), stoneMat);
    base.position.y = 1.2;
    m.add(base);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.8), stoneMat);
    roof.position.y = 2.55;
    m.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.3), darkStoneMat);
    door.position.set(0, 0.8, 1.35);
    m.add(door);
    m.position.set(0, 0, i * 3.4);
    row.add(m);
  }
  scene.add(row);
}

// The Gate at (0, 0, 14.8)
const gateGroup = new THREE.Group();
gateGroup.position.set(0, 0, 14.8);
scene.add(gateGroup);

const ironMat = new THREE.MeshStandardMaterial({
  color: 0x3a3d4a,
  metalness: 0.7,
  roughness: 0.4,
});

const pillarGeo = new THREE.BoxGeometry(0.6, 4.2, 0.6);
const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
leftPillar.position.set(-2.3, 2.1, 0);
const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
rightPillar.position.set(2.3, 2.1, 0);
gateGroup.add(leftPillar, rightPillar);

const leafGeo = new THREE.BoxGeometry(2.2, 3.6, 0.08);
const westLeafPivot = new THREE.Group();
westLeafPivot.position.set(-2.0, 1.8, 0);
const westLeaf = new THREE.Mesh(leafGeo, ironMat);
westLeaf.position.set(1.1, 0, 0);
westLeafPivot.add(westLeaf);
gateGroup.add(westLeafPivot);

const eastLeafPivot = new THREE.Group();
eastLeafPivot.position.set(2.0, 1.8, 0);
const eastLeaf = new THREE.Mesh(leafGeo, ironMat);
eastLeaf.position.set(-1.1, 0, 0);
eastLeafPivot.add(eastLeaf);
gateGroup.add(eastLeafPivot);

for (const leaf of [westLeaf, eastLeaf]) {
  for (let i = 0; i < 4; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.05), ironMat);
    bar.position.set(0, -1.4 + i * 0.95, 0.06);
    leaf.add(bar);
  }
}

const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 6, 16, Math.PI), ironMat);
arch.position.set(0, 4.2, 0);
gateGroup.add(arch);

const gateSpot = new THREE.SpotLight(0x9fb0ff, 0, 18, Math.PI / 5, 0.6);
gateSpot.position.set(0, 6, 16);
gateSpot.target.position.set(0, 0, 14.8);
scene.add(gateSpot);
scene.add(gateSpot.target);

// ---------------------------------------------------------------------------
// Graves + nameplates
// ---------------------------------------------------------------------------

const graveGeometry = new THREE.BoxGeometry(0.5, 1.3, 0.18);
const graveMaterial = new THREE.MeshStandardMaterial({ color: 0x5a606a, roughness: 0.95 });

const makeNameplateTexture = (name: string, dates: string): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d canvas context unavailable");
  }
  ctx.clearRect(0, 0, 256, 128);
  ctx.strokeStyle = "#2a2d38";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = "#1a1820";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 2;
  ctx.textAlign = "center";
  ctx.font = 'bold 30px "Times New Roman", serif';
  ctx.fillText(name, 128, 60);
  ctx.shadowBlur = 1;
  ctx.font = '16px "Times New Roman", serif';
  ctx.fillText(dates, 128, 92);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
};

const randomDates = (): string => {
  const death = 1830 + Math.floor(Math.random() * 80);
  const birth = death - (25 + Math.floor(Math.random() * 55));
  return `${birth} — ${death}`;
};

const nameplateGeo = new THREE.PlaneGeometry(0.42, 0.21);
const shuffledNames = ((): string[] => {
  const a: string[] = [...NAMES];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i];
    const aj = a[j];
    if (ai === undefined || aj === undefined) continue;
    a[i] = aj;
    a[j] = ai;
  }
  return a;
})();

const candleNames: string[] = shuffledNames.slice(0, 7);
const decoyNames: string[] = shuffledNames.slice(7, 32);

const buildGrave = (
  worldX: number,
  worldZ: number,
  rotY: number,
  tilt: number,
  name: string,
): THREE.Group => {
  const group = new THREE.Group();
  group.position.set(worldX, 0.65, worldZ);
  group.rotation.y = rotY;
  group.rotation.x = tilt;

  const stone = new THREE.Mesh(graveGeometry, graveMaterial);
  stone.castShadow = true;
  stone.receiveShadow = true;
  group.add(stone);

  const plateMat = new THREE.MeshBasicMaterial({
    map: makeNameplateTexture(name, randomDates()),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const plate = new THREE.Mesh(nameplateGeo, plateMat);
  plate.position.set(0, 0.18, 0.1);
  group.add(plate);
  return group;
};

const candleGraves: THREE.Group[] = [];
for (let i = 0; i < 7; i += 1) {
  const slot = CANDLE_POSITIONS[i];
  const name = candleNames[i];
  if (!slot || !name) continue;
  const [x, z] = slot;
  const rotY = Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.3;
  const grave = buildGrave(x, z, rotY, 0, name);
  scene.add(grave);
  candleGraves.push(grave);
}

const decoyGraves: THREE.Group[] = [];
{
  let placed = 0;
  let attempts = 0;
  while (placed < decoyNames.length && attempts < 400) {
    attempts += 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    let ok = true;
    for (const [cx, cz] of CANDLE_POSITIONS) {
      if (Math.hypot(x - cx, z - cz) < 1.8) {
        ok = false;
        break;
      }
    }
    // Reject inside chapel / mausoleum / tree footprints
    if (ok && x < -7.5 && x > -12 && z < 2.5 && z > -2.5) ok = false; // chapel
    if (ok && x < -6.5 && x > -10.5 && z < -6 && z > -11) ok = false; // mausoleums
    if (ok && Math.hypot(x, z + 12) < 1.5) ok = false; // tree
    if (!ok) continue;

    const name = decoyNames[placed];
    if (!name) break;
    const tilt = Math.random() < 0.3 ? (Math.random() - 0.5) * 0.6 : 0;
    const grave = buildGrave(x, z, (Math.random() - 0.5) * 0.6, tilt, name);
    scene.add(grave);
    decoyGraves.push(grave);
    placed += 1;
  }
}

// ---------------------------------------------------------------------------
// Candles
// ---------------------------------------------------------------------------

type Candle = {
  index: number;
  name: string;
  pos: THREE.Vector3;
  group: THREE.Group;
  flame: THREE.Mesh;
  light: THREE.PointLight;
  lit: boolean;
};

const candles: Candle[] = [];
const candleBaseMat = new THREE.MeshStandardMaterial({ color: 0x141016, roughness: 0.9 });
const flameMat = new THREE.MeshBasicMaterial({
  color: 0xffd084,
  fog: false,
  transparent: true,
  opacity: 0,
});

for (let i = 0; i < 7; i += 1) {
  const slot = CANDLE_POSITIONS[i];
  const name = candleNames[i];
  if (!slot || !name) continue;
  const [x, z] = slot;

  const group = new THREE.Group();
  group.position.set(x, 1.3, z);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.35, 8), candleBaseMat);
  base.position.y = 0.175;
  group.add(base);

  for (let d = 0; d < 3; d += 1) {
    const drip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), candleBaseMat);
    const drippAng = (d / 3) * Math.PI * 2 + Math.random();
    drip.position.set(
      Math.cos(drippAng) * 0.07,
      0.05 + Math.random() * 0.15,
      Math.sin(drippAng) * 0.07,
    );
    group.add(drip);
  }

  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.04, 4),
    new THREE.MeshStandardMaterial({ color: 0x000000 }),
  );
  wick.position.y = 0.37;
  group.add(wick);

  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), flameMat.clone());
  flame.scale.set(1, 1.6, 1);
  flame.position.y = 0.42;
  flame.visible = false;
  group.add(flame);

  const light = new THREE.PointLight(0xffb24a, 0, 4.5);
  light.position.y = 0.5;
  group.add(light);

  scene.add(group);

  candles.push({
    index: i,
    name,
    pos: new THREE.Vector3(x, PLAYER_HEIGHT, z),
    group,
    flame,
    light,
    lit: false,
  });
}

// ---------------------------------------------------------------------------
// Menace (primary + flanker)
// ---------------------------------------------------------------------------

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

const MENACE_HEIGHT = 1.8;
const MENACE_WIDTH = 1.35;

const makeMenace = (
  haloColor: number,
  haloIntensity: number,
): { sprite: THREE.Sprite; material: THREE.SpriteMaterial } => {
  const material = new THREE.SpriteMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(MENACE_WIDTH, MENACE_HEIGHT, 1);
  const halo = new THREE.PointLight(haloColor, haloIntensity, 5);
  sprite.add(halo);
  return { sprite, material };
};

const primary = makeMenace(0xa0134f, 0.7);
primary.sprite.position.set(0, MENACE_HEIGHT / 2, -10);
scene.add(primary.sprite);

const flanker = makeMenace(0x6a1029, 0.5);
flanker.sprite.position.set(-13, MENACE_HEIGHT / 2, -13);
flanker.sprite.visible = false;
scene.add(flanker.sprite);

const loadMenaceTexture = (mat: THREE.SpriteMaterial): void => {
  const url = getRandomImageUrl();
  textureLoader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const prev = mat.map;
      mat.map = texture;
      mat.needsUpdate = true;
      prev?.dispose();
    },
    undefined,
    (err) => {
      console.error("Failed to load menace texture", url, err);
    },
  );
};

loadMenaceTexture(primary.material);
loadMenaceTexture(flanker.material);

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

type GameState = "idle" | "playing" | "won" | "caught";

const game = {
  state: "idle" as GameState,
  order: [] as number[],
  currentIndex: 0,
  wrongCount: 0,
  runStartTime: 0,
  nextWhisperAt: 0,
  whisperHudUntil: 0,
  currentWhisperName: null as string | null,
  gateOpening: false,
  gateOpenAt: -1,
  gateProgress: 0,
  flankerEnabled: false,
  winHoldStart: -1,
  litCount: 0,
};

const shuffleIndices = (n: number): number[] => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i] as number;
    const aj = a[j] as number;
    a[i] = aj;
    a[j] = ai;
  }
  return a;
};

const updateHud = (): void => {
  candleCountEl.textContent = `${game.litCount} / 7 · ${game.wrongCount}/${MAX_WRONG} wrong`;
  if (game.currentWhisperName && game.litCount < 7) {
    whisperNameEl.textContent = game.currentWhisperName;
  } else if (game.litCount >= 7) {
    whisperNameEl.textContent = "Run to the gate!";
  } else {
    whisperNameEl.textContent = "—";
  }
};

const startRun = (): void => {
  // Reset state
  game.state = "playing";
  game.order = shuffleIndices(7);
  game.currentIndex = 0;
  game.wrongCount = 0;
  game.runStartTime = clock.elapsedTime;
  game.nextWhisperAt = clock.elapsedTime + 1.8;
  game.whisperHudUntil = 0;
  game.currentWhisperName = null;
  game.gateOpening = false;
  game.gateOpenAt = -1;
  game.gateProgress = 0;
  game.flankerEnabled = false;
  game.winHoldStart = -1;
  game.litCount = 0;

  for (const candle of candles) {
    candle.lit = false;
    candle.flame.visible = false;
    (candle.flame.material as THREE.MeshBasicMaterial).opacity = 0;
    candle.light.intensity = 0;
  }
  westLeafPivot.rotation.y = 0;
  eastLeafPivot.rotation.y = 0;
  gateSpot.intensity = 0;

  camera.position.set(0, PLAYER_HEIGHT, 8);
  look.yaw = Math.PI;
  look.pitch = 0;

  primary.sprite.position.set(0, MENACE_HEIGHT / 2, -10);
  flanker.sprite.position.set(-13, MENACE_HEIGHT / 2, -13);
  flanker.sprite.visible = false;
  loadMenaceTexture(primary.material);

  audio.setCandleProgress(0);
  audio.restoreMaster(1.5);

  endscreenEl.setAttribute("hidden", "");
  statusEl.textContent = "Listen for the name…";
  updateHud();
};

const triggerWhisper = (): void => {
  if (game.litCount >= 7) return;
  const idx = game.order[game.currentIndex];
  if (idx === undefined) return;
  const candle = candles[idx];
  if (!candle) return;
  game.currentWhisperName = candle.name;
  game.whisperHudUntil = clock.elapsedTime + 2.5;
  audio.playWhisper(candle.name);
  updateHud();
};

const scheduleNextWhisper = (delay: number): void => {
  game.nextWhisperAt = clock.elapsedTime + delay;
};

const lightCandle = (candle: Candle): void => {
  if (candle.lit) return;
  candle.lit = true;
  candle.flame.visible = true;
  (candle.flame.material as THREE.MeshBasicMaterial).opacity = 1;
  candle.light.intensity = 1.4;
  game.litCount += 1;
  game.currentIndex += 1;
  audio.playLightCandle();
  audio.setCandleProgress(game.litCount);

  if (game.litCount === 5) {
    game.flankerEnabled = true;
    flanker.sprite.visible = true;
    flanker.sprite.position.set(
      Math.cos(Math.random() * Math.PI * 2) * 13,
      MENACE_HEIGHT / 2,
      Math.sin(Math.random() * Math.PI * 2) * 13,
    );
    loadMenaceTexture(flanker.material);
  }

  if (game.litCount >= 7) {
    triggerGateOpen();
  } else {
    scheduleNextWhisper(3 + Math.random() * 6);
  }
  updateHud();
};

const triggerWrongCandle = (): void => {
  game.wrongCount += 1;
  audio.playWrongSting();
  if (game.wrongCount >= MAX_WRONG) {
    snuffAllCandles();
    triggerCatch();
  } else {
    statusEl.textContent = `Wrong name. ${MAX_WRONG - game.wrongCount} mistake${
      MAX_WRONG - game.wrongCount === 1 ? "" : "s"
    } left.`;
    pulseEl.style.opacity = "0.7";
    window.setTimeout(() => {
      if (game.state === "playing") {
        statusEl.textContent = "Listen again…";
      }
    }, 1500);
  }
  updateHud();
};

const snuffAllCandles = (): void => {
  for (const c of candles) {
    if (c.lit) {
      c.lit = false;
      c.light.intensity = 0;
      c.flame.visible = false;
      (c.flame.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }
};

const triggerGateOpen = (): void => {
  game.gateOpening = true;
  game.gateOpenAt = clock.elapsedTime;
  audio.playGateRumble();
  statusEl.textContent = "The gate gives way. Run.";
};

const tryInteract = (): void => {
  if (game.state !== "playing") return;
  if (game.litCount >= 7) return;
  let nearest: Candle | null = null;
  let nearestDist = INTERACT_RADIUS;
  for (const candle of candles) {
    if (candle.lit) continue;
    const dx = camera.position.x - candle.pos.x;
    const dz = camera.position.z - candle.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = candle;
    }
  }
  if (!nearest) return;

  const expectedIdx = game.order[game.currentIndex];
  if (expectedIdx === undefined) return;
  if (nearest.index === expectedIdx) {
    lightCandle(nearest);
  } else {
    triggerWrongCandle();
  }
};

const triggerCatch = (): void => {
  if (game.state !== "playing") return;
  game.state = "caught";
  audio.playLoseChord();
  audio.duckMaster(0.15, 2);
  primary.sprite.scale.set(MENACE_WIDTH * 3.6, MENACE_HEIGHT * 3.6, 1);
  statusEl.textContent = "Max t'a trouvé.";
  showEndscreen("Max t'a trouvé.", "Your trespass ends here.");
};

const triggerWin = (): void => {
  if (game.state !== "playing") return;
  game.state = "won";
  audio.playWinChord();
  statusEl.textContent = "Tu t'es échappé.";
  showEndscreen("Tu t'es échappé.", "For tonight, at least.");
};

const showEndscreen = (title: string, sub: string): void => {
  endscreenTitleEl.textContent = title;
  endscreenSubEl.textContent = sub;
  endscreenEl.removeAttribute("hidden");
};

// ---------------------------------------------------------------------------
// Phase tuning (driven by candles lit)
// ---------------------------------------------------------------------------

const applyPhaseTuning = (): void => {
  const t = game.litCount / 7;
  ambientLight.intensity = 0.85 - t * 0.3;
  moonLight.intensity = 1.1 - t * 0.65;
  moonLight.color.lerpColors(new THREE.Color(0x9fb0ff), new THREE.Color(0x7a8aff), t);
  const fog = scene.fog;
  if (fog instanceof THREE.Fog) {
    fog.far = 38 - t * 14;
  }
  flickerLight.distance = game.litCount >= 5 ? 18 : 30;
  if (game.litCount >= 7) {
    flickerLight.intensity = 0;
  }
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const keyState = new Set<string>();
const look = { yaw: Math.PI, pitch: 0 };
const moveVector = new THREE.Vector3();
const nextPosition = new THREE.Vector3();
const menaceTarget = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const clock = new THREE.Clock();

let isActive = false;
let isPointerLocked = false;

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
  if (event.code === "KeyE") {
    tryInteract();
  }
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

const ensureAudioStarted = async (): Promise<void> => {
  if (!audio.hasStarted()) {
    await audio.start();
    updateAudioToggle();
  }
};

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

const tryStartRun = (): void => {
  void ensureAudioStarted();
  if (game.state === "won" || game.state === "caught") {
    primary.sprite.scale.set(MENACE_WIDTH, MENACE_HEIGHT, 1);
  }
  if (game.state !== "playing") {
    startRun();
  }
};

if (isTouchDevice) {
  renderer.domElement.addEventListener("click", () => {
    tryStartRun();
  });
} else {
  app.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("button")) return;
    tryStartRun();
    void requestLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isPointerLocked = document.pointerLockElement === app;
    isActive = isPointerLocked;
  });

  window.addEventListener("mousemove", (event) => {
    if (!isPointerLocked) return;
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
        tryStartRun();
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
}

// Action button works for both desktop and mobile (touch + click)
const handleAction = (event: Event): void => {
  event.preventDefault();
  event.stopPropagation();
  void ensureAudioStarted();
  if (game.state !== "playing") {
    tryStartRun();
    return;
  }
  tryInteract();
};
actionBtnEl.addEventListener("click", handleAction);
actionBtnEl.addEventListener("touchstart", handleAction, { passive: false });

// Endscreen click restarts
endscreenEl.addEventListener("click", () => {
  primary.sprite.scale.set(MENACE_WIDTH, MENACE_HEIGHT, 1);
  startRun();
});

const updateKnob = (nx: number, ny: number): void => {
  const px = nx * JOYSTICK_RADIUS;
  const py = ny * JOYSTICK_RADIUS;
  joystickKnobEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
};

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

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
    if (magnitude > 1) moveVector.divideScalar(magnitude);
    moveVector.applyAxisAngle(upAxis, look.yaw);
    const sprinting = keyState.has("ShiftLeft") || keyState.has("ShiftRight") || touchSprint.active;
    const speed = sprinting ? 5.2 : 3.1;
    nextPosition.copy(camera.position).addScaledVector(moveVector, speed * deltaTime);

    const maxZ = game.gateProgress > 0.7 ? 15.6 : 14;
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -14, 14);
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -14, maxZ);
    camera.position.copy(nextPosition);
  }

  camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
};

const updateMenace = (
  sprite: THREE.Sprite,
  baseSpeed: number,
  lerpFactor: number,
  elapsedTime: number,
  deltaTime: number,
  bob: number,
): void => {
  menaceTarget.set(camera.position.x, sprite.position.y, camera.position.z);
  const dir = menaceTarget.clone().sub(sprite.position);
  dir.y = 0;
  const dist = dir.length();
  if (dist > 0.01) {
    dir.divideScalar(dist);
    sprite.position.addScaledVector(dir, baseSpeed * deltaTime);
  }
  sprite.position.lerp(menaceTarget, deltaTime * lerpFactor);
  sprite.position.y = MENACE_HEIGHT / 2 + Math.sin(elapsedTime * 4 + bob) * 0.12;
};

const updateGate = (deltaTime: number): void => {
  if (!game.gateOpening) return;
  game.gateProgress = THREE.MathUtils.clamp(game.gateProgress + deltaTime / 1.8, 0, 1);
  const eased = 1 - Math.pow(1 - game.gateProgress, 3);
  westLeafPivot.rotation.y = -eased * (Math.PI / 2);
  eastLeafPivot.rotation.y = eased * (Math.PI / 2);
  gateSpot.intensity = eased * 3;
  if (game.gateProgress < 0.25) {
    leftPillar.position.x = -2.3 + (Math.random() - 0.5) * 0.04;
    rightPillar.position.x = 2.3 + (Math.random() - 0.5) * 0.04;
  } else {
    leftPillar.position.x = -2.3;
    rightPillar.position.x = 2.3;
  }
};

const updateFlame = (candle: Candle, elapsedTime: number): void => {
  if (!candle.lit) return;
  const f = 1.4 + Math.sin(elapsedTime * 17 + candle.index) * 0.25 + Math.random() * 0.12;
  candle.light.intensity = f;
  candle.flame.scale.y = 1.5 + Math.sin(elapsedTime * 22 + candle.index) * 0.18;
};

const updateActionPromptVisibility = (): void => {
  if (game.state !== "playing" || game.litCount >= 7) {
    promptEl.style.opacity = "0";
    actionBtnEl.classList.remove("action-btn--ready");
    return;
  }
  let nearby = false;
  for (const candle of candles) {
    if (candle.lit) continue;
    const dx = camera.position.x - candle.pos.x;
    const dz = camera.position.z - candle.pos.z;
    if (Math.hypot(dx, dz) < INTERACT_RADIUS) {
      nearby = true;
      break;
    }
  }
  if (nearby) {
    promptEl.textContent = isTouchDevice
      ? "Tap LIGHT to light this candle"
      : "[E] Light this candle";
    promptEl.style.opacity = "1";
    actionBtnEl.classList.add("action-btn--ready");
  } else {
    promptEl.style.opacity = "0";
    actionBtnEl.classList.remove("action-btn--ready");
  }
};

const animate = (): void => {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  const elapsedTime = clock.elapsedTime;

  flickerLight.intensity =
    game.litCount >= 7 ? 0 : 2.0 + Math.sin(elapsedTime * 11) * 0.25 + Math.random() * 0.15;

  if (game.state === "playing") {
    updatePlayer(deltaTime);

    // Whisper scheduler
    if (game.litCount < 7 && elapsedTime >= game.nextWhisperAt && game.state === "playing") {
      triggerWhisper();
      game.nextWhisperAt = Number.POSITIVE_INFINITY;
    }

    // Hide whisper HUD after duration
    if (elapsedTime > game.whisperHudUntil && game.currentWhisperName) {
      // keep until lit; show subtler text
    }

    // Rage mode at 6:00
    const elapsed = elapsedTime - game.runStartTime;
    const rage = elapsed > RAGE_TIMER_SECONDS ? 1 : 0;

    // Phase tuning every frame (cheap)
    applyPhaseTuning();

    // Menace speeds (per docs/gameplay.md)
    const t = game.litCount / 7;
    const primarySpeed = (2.6 + t * 3.0) * (1 + rage);
    const primaryLerp = 0.012 + t * 0.016;
    updateMenace(primary.sprite, primarySpeed, primaryLerp, elapsedTime, deltaTime, 0);

    if (game.flankerEnabled) {
      updateMenace(
        flanker.sprite,
        primarySpeed * 0.6,
        primaryLerp * 0.7,
        elapsedTime,
        deltaTime,
        1.7,
      );
    }

    // Distance / catch
    const distP = primary.sprite.position.distanceTo(camera.position);
    const distF = game.flankerEnabled
      ? flanker.sprite.position.distanceTo(camera.position)
      : Infinity;
    const dist = Math.min(distP, distF);
    const pulse = THREE.MathUtils.clamp(1 - dist / 10, 0, 1);
    pulseEl.style.opacity = String(pulse * 0.85);
    audio.setIntensity(pulse);

    if (dist < 1.25) {
      triggerCatch();
    }

    // Update flames
    for (const candle of candles) updateFlame(candle, elapsedTime);

    // Gate open animation
    updateGate(deltaTime);

    // Win check
    if (game.litCount >= 7 && game.gateProgress > 0.6) {
      const dxg = camera.position.x;
      const dzg = camera.position.z - 14.5;
      const dGate = Math.hypot(dxg, dzg);
      if (dGate < GATE_TRIGGER_RADIUS) {
        if (game.winHoldStart < 0) game.winHoldStart = elapsedTime;
        const hold = elapsedTime - game.winHoldStart;
        statusEl.textContent = `Escaping… ${(GATE_HOLD_SECONDS - hold).toFixed(1)}s`;
        if (hold >= GATE_HOLD_SECONDS) triggerWin();
      } else {
        game.winHoldStart = -1;
      }
    }

    updateActionPromptVisibility();
  } else if (game.state === "won" || game.state === "caught") {
    // Slow camera bob only
    camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
  } else {
    // Idle: render scene but no game logic
    camera.rotation.set(look.pitch, look.yaw, 0, "YXZ");
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

updateHud();

// Test/debug hook — exposes runtime state to Playwright. Keeping it in shipped
// code is cheap and lets future automated playtests poke the simulation
// without rewiring this file.
(window as unknown as { __maxDebug?: unknown }).__maxDebug = {
  game,
  camera,
  primary,
  flanker,
  candles,
  startRun,
  tryInteract,
  clock,
};

animate();

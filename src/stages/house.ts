import * as THREE from "three";
import { audio } from "../audio.js";
import { DECORATION_IMAGES, getDecorationImageUrl, getRandomMonsterImageUrl } from "../images.js";
import type { Stage, StageOutcome } from "./Stage.js";
import type { StageContext } from "./StageContext.js";

// ---------------------------------------------------------------------------
// "The House of Many Maxes" — stage 2 (see docs/stage2-gameplay.md +
// docs/stage2-art-direction.md). Implementation is intentionally trimmed
// from the design doc: 5 rooms + corridors, paintings, brass key, cellar
// hatch, 2 wardrobes, 1 buff (salt), simple Max chase AI. Doors are visual
// only for v1 — Max ignores them but slows when crossing a doorway.
// ---------------------------------------------------------------------------

const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.35;
const HATCH_HOLD_SECONDS = 1.5;
const RAGE_TIMER_SECONDS = 300;
const MENACE_HEIGHT = 1.8;
const MENACE_WIDTH = 1.35;
const HIDE_BREATH_MAX = 12;
const HIDE_REFILL_RATE = 1.5;
const HIDE_INVESTIGATE_SECONDS = 6;

type Wall = { x: number; z: number; w: number; d: number };
type Wardrobe = {
  pos: THREE.Vector3;
  doorPivot: THREE.Group;
  occupiedByPlayer: boolean;
};
type Buff = {
  kind: "salt";
  pos: THREE.Vector3;
  mesh: THREE.Object3D;
  taken: boolean;
};
type Painting = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  defaultTex: THREE.Texture;
  monsterTex: THREE.Texture | null;
  flashed: boolean;
};

const makeWallpaperTex = (base: string, accent: string, vertical: boolean): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  if (vertical) {
    for (let i = 0; i < 256; i += 12) {
      ctx.fillStyle = accent;
      ctx.fillRect(i, 0, 2, 256);
    }
  } else {
    // damask diamond pattern
    ctx.fillStyle = accent;
    for (let r = 16; r < 256; r += 48) {
      for (let cx = 16; cx < 256; cx += 48) {
        const ox = (r / 48) % 2 === 0 ? 0 : 24;
        ctx.beginPath();
        ctx.ellipse(cx + ox, r, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // foxing stains
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = `rgba(106,74,42,${(0.1 + Math.random() * 0.15).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 256,
      Math.random() * 256,
      4 + Math.random() * 10,
      3 + Math.random() * 8,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
};

const makePlankFloorTex = (): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#2d2a26";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 48) {
    const shade = 30 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${shade + 8},${shade + 4},${shade})`;
    ctx.fillRect(0, y, 512, 44);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, y + 44, 512, 4);
    // grain streaks
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = `rgba(20,16,12,${(0.15 + Math.random() * 0.2).toFixed(2)})`;
      ctx.fillRect(Math.random() * 512, y + Math.random() * 44, 30 + Math.random() * 80, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 4;
  return tex;
};

const makeSepiaTex = (img: HTMLImageElement): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, 256, 320);
  ctx.filter = "sepia(0.7) contrast(0.85) brightness(0.7) saturate(0.65)";
  ctx.drawImage(img, 8, 8, 240, 304);
  ctx.filter = "none";
  const grad = ctx.createRadialGradient(128, 160, 30, 128, 160, 180);
  grad.addColorStop(0, "rgba(20,16,12,0)");
  grad.addColorStop(1, "rgba(20,16,12,0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 320);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

export const createHouseStage = (ctx: StageContext): Stage => {
  const { stageRoot, camera, renderer, clock, hud, input, scene } = ctx;
  const timeoutIds = new Set<number>();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // Switch the scene fog/background to a warmer house feel.
  const prevFog = scene.fog;
  const prevBackground = scene.background;
  const houseFog = new THREE.Fog(0x18120e, 6, 24);
  scene.fog = houseFog;
  scene.background = new THREE.Color(0x18120e);

  // ----- Textures -----
  const floorTex = track(makePlankFloorTex());
  const wallpaperParlor = track(makeWallpaperTex("#3a242a", "#5a3838", false));
  const wallpaperStudy = track(makeWallpaperTex("#352c1f", "#5a4632", true));
  const wallpaperHall = track(makeWallpaperTex("#322a2a", "#4a3838", false));
  const wallpaperKitchen = track(makeWallpaperTex("#2e3a2e", "#3a4a3a", true));
  const wallpaperBathroom = track(makeWallpaperTex("#2a2e3a", "#3a3e4a", true));

  // ----- Floor and ceiling -----
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTex,
    roughness: 0.85,
  });
  const houseFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  houseFloor.rotation.x = -Math.PI / 2;
  houseFloor.receiveShadow = true;
  stageRoot.add(houseFloor);

  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3;
  stageRoot.add(ceiling);

  // ----- Walls (with collision) -----
  // Wall definitions in world space. Each wall is an AABB on XZ + a height.
  // Layout: rooms are
  //   Parlor   x ∈ [-5, 5],  z ∈ [-10, -1]
  //   Study    x ∈ [-9, -5], z ∈ [-10, -1]
  //   Kitchen  x ∈ [ 5,  9], z ∈ [-10, -1]
  //   Hall     x ∈ [-3, 3],  z ∈ [-1,  6]
  //   Bathroom x ∈ [-4, 4],  z ∈ [ 6, 10]
  // Doorway gaps are inserted in internal walls (1.6 m wide).
  const wallH = 3;
  const wallT = 0.25;
  const walls: Wall[] = [];

  const buildWall = (
    x: number,
    z: number,
    w: number,
    d: number,
    paperTex: THREE.Texture | null,
  ): void => {
    walls.push({ x, z, w, d });
    const mat = paperTex
      ? new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: paperTex,
          roughness: 0.95,
        })
      : new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 1 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mat);
    wall.position.set(x, wallH / 2, z);
    stageRoot.add(wall);
  };

  // Outer perimeter (rough rectangle covering all rooms)
  // North wall
  buildWall(-2, -10, 14, wallT, null);
  buildWall(7, -10, 4, wallT, null);
  // South wall
  buildWall(0, 10, 8, wallT, null);
  // West wall (study + parlor west + hall west + bath west pieces — keep simple)
  buildWall(-9, -5.5, wallT, 9, wallpaperStudy);
  buildWall(-4, 8, wallT, 4, wallpaperBathroom);
  buildWall(-3, 2.5, wallT, 7, wallpaperHall);
  // East wall
  buildWall(9, -5.5, wallT, 9, wallpaperKitchen);
  buildWall(4, 8, wallT, 4, wallpaperBathroom);
  buildWall(3, 2.5, wallT, 7, wallpaperHall);

  // Internal: parlor south wall (separates parlor from hall) — doorway at x∈[-0.8, 0.8]
  buildWall(-3.4, -1, 3.2, wallT, wallpaperParlor); // west of door
  buildWall(3.4, -1, 3.2, wallT, wallpaperParlor); // east of door
  // Wider section to seal off study/kitchen
  buildWall(-7, -1, 4, wallT, wallpaperStudy);
  buildWall(7, -1, 4, wallT, wallpaperKitchen);

  // Parlor/Study divider — doorway at z∈[-4, -2]
  buildWall(-5, -8, wallT, 4, wallpaperStudy);
  // Parlor/Kitchen divider — doorway at z∈[-4, -2]
  buildWall(5, -8, wallT, 4, wallpaperKitchen);
  // Parlor north outer
  buildWall(0, -10, 10, wallT, wallpaperParlor); // already covered by N wall

  // Hall/Bathroom divider — doorway at x∈[-0.8, 0.8]
  buildWall(-2, 6, 2, wallT, wallpaperHall);
  buildWall(2, 6, 2, wallT, wallpaperHall);

  // ----- Lights -----
  const ambient = new THREE.AmbientLight(0x1a1612, 0.35);
  stageRoot.add(ambient);

  // Hall warm bulb
  const hallLight = new THREE.PointLight(0xffc88a, 0.7, 8);
  hallLight.position.set(0, 2.6, 2);
  stageRoot.add(hallLight);

  // Parlor hearth
  const hearth = new THREE.PointLight(0xff5522, 0.4, 6);
  hearth.position.set(0, 1.2, -8.5);
  stageRoot.add(hearth);

  // Study green desk lamp
  const desk = new THREE.PointLight(0x88ff99, 0.5, 4);
  desk.position.set(-7, 1.1, -3);
  stageRoot.add(desk);

  // Kitchen cold bulb
  const kitchen = new THREE.PointLight(0xb0c8ff, 0.6, 6);
  kitchen.position.set(7, 2.5, -5);
  stageRoot.add(kitchen);

  // Bathroom warm sconce
  const bath = new THREE.PointLight(0xffeedd, 0.35, 4);
  bath.position.set(0, 2.2, 8);
  stageRoot.add(bath);

  // ----- Hearth (parlor) -----
  {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 0.8), stoneMat);
    base.position.set(0, 0.7, -9.4);
    stageRoot.add(base);
    walls.push({ x: 0, z: -9.4, w: 3, d: 0.8 });
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.1), stoneMat);
    mantel.position.set(0, 1.5, -9.3);
    stageRoot.add(mantel);
    // ember glow shifts
    const embers = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xff5522,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    embers.position.set(0, 0.6, -9.0);
    stageRoot.add(embers);
  }

  // ----- Hatch (exit, in Hall) -----
  const hatchPos = new THREE.Vector3(0, 0, 3);
  const hatchRimMat = new THREE.MeshBasicMaterial({
    color: 0xa0134f,
    transparent: true,
    opacity: 0.6,
  });
  const hatchRim = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 24), hatchRimMat);
  hatchRim.rotation.x = -Math.PI / 2;
  hatchRim.position.copy(hatchPos);
  hatchRim.position.y = 0.02;
  stageRoot.add(hatchRim);
  const hatchBoardPivot = new THREE.Group();
  hatchBoardPivot.position.set(hatchPos.x, 0.05, hatchPos.z + 0.7);
  stageRoot.add(hatchBoardPivot);
  const hatchBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x2a221a, roughness: 0.9 }),
  );
  hatchBoard.position.set(0, 0, -0.7);
  hatchBoardPivot.add(hatchBoard);

  // ----- Brass key (one random spawn from 3) -----
  const keySpawns: THREE.Vector3[] = [
    new THREE.Vector3(7, 1.0, -6), // kitchen table
    new THREE.Vector3(-7, 1.0, -4), // study desk
    new THREE.Vector3(0, 1.4, -9), // mantel
  ];
  const keyPos = keySpawns[Math.floor(Math.random() * keySpawns.length)] ?? keySpawns[0]!;
  const keyMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.18, 8),
    new THREE.MeshStandardMaterial({
      color: 0xb89968,
      metalness: 0.85,
      roughness: 0.3,
      emissive: 0xb89968,
      emissiveIntensity: 0.15,
    }),
  );
  keyMesh.position.copy(keyPos);
  keyMesh.rotation.z = Math.PI / 2;
  stageRoot.add(keyMesh);
  const keyHalo = new THREE.PointLight(0xffc88a, 0.5, 1.6);
  keyHalo.position.copy(keyPos);
  stageRoot.add(keyHalo);

  // ----- Tables in each room (for prop diversity) -----
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.7 });
  const makeTable = (x: number, z: number, w = 1.2, d = 0.8): void => {
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), woodMat);
    top.position.set(x, 0.78, z);
    stageRoot.add(top);
    walls.push({ x, z, w, d });
    // Legs (decorative only, no collision)
    for (const [dx, dz] of [
      [-w / 2 + 0.08, -d / 2 + 0.08],
      [w / 2 - 0.08, -d / 2 + 0.08],
      [-w / 2 + 0.08, d / 2 - 0.08],
      [w / 2 - 0.08, d / 2 - 0.08],
    ] as Array<[number, number]>) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), woodMat);
      leg.position.set(x + dx, 0.39, z + dz);
      stageRoot.add(leg);
    }
  };
  makeTable(7, -6); // kitchen
  makeTable(-7, -4); // study desk
  makeTable(0, 4); // hall side
  makeTable(0, 8); // bathroom sink stand

  // ----- Wardrobes (2 hide spots) -----
  const wardrobes: Wardrobe[] = [];
  const buildWardrobe = (x: number, z: number, rotY: number): Wardrobe => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.1, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2d2a26, roughness: 0.8 }),
    );
    body.position.y = 1.05;
    group.add(body);
    const doorPivot = new THREE.Group();
    doorPivot.position.set(0.4, 1.05, 0.41);
    group.add(doorPivot);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.9, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3a2f24, roughness: 0.7 }),
    );
    door.position.set(-0.275, 0, 0);
    doorPivot.add(door);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xb89968, metalness: 0.7 }),
    );
    knob.position.set(-0.48, 0, 0.05);
    doorPivot.add(knob);
    stageRoot.add(group);
    walls.push({ x, z, w: 1.2, d: 0.8 });
    return {
      pos: new THREE.Vector3(x, 0, z),
      doorPivot,
      occupiedByPlayer: false,
    };
  };
  wardrobes.push(buildWardrobe(-2.7, -2, 0));
  wardrobes.push(buildWardrobe(2.7, -2, Math.PI));

  // ----- Paintings on walls -----
  const paintings: Painting[] = [];
  const placePainting = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    decorationIdx: number,
  ): void => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x18120e, fog: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), mat);
    plane.position.set(x, y, z);
    plane.rotation.y = rotY;
    stageRoot.add(plane);
    // Wood frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.82, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3a2f24, roughness: 0.7 }),
    );
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    // offset frame back slightly along normal
    frame.translateZ(-0.025);
    stageRoot.add(frame);

    const url = getDecorationImageUrl(decorationIdx);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = makeSepiaTex(img);
      mat.map = tex;
      mat.needsUpdate = true;
      paintings.push({
        mesh: plane,
        material: mat,
        defaultTex: tex,
        monsterTex: null,
        flashed: false,
      });
    };
    img.onerror = (): void => {
      console.warn("painting image failed", url);
    };
    img.src = url;
  };

  // Hall paintings (the gauntlet)
  for (let i = 0; i < 6; i += 1) {
    const z = -0.5 + i * 1.0;
    placePainting(-2.85, 1.6, z, Math.PI / 2, i % DECORATION_IMAGES.length);
    placePainting(2.85, 1.6, z, -Math.PI / 2, (i + 7) % DECORATION_IMAGES.length);
  }
  // Parlor paintings
  placePainting(-3, 1.7, -9.85, 0, 1);
  placePainting(0, 1.7, -9.85, 0, 3);
  placePainting(3, 1.7, -9.85, 0, 5);
  // Study
  placePainting(-8.85, 1.7, -3, Math.PI / 2, 7);
  placePainting(-8.85, 1.7, -7, Math.PI / 2, 9);
  // Kitchen
  placePainting(8.85, 1.7, -3, -Math.PI / 2, 11);
  placePainting(8.85, 1.7, -7, -Math.PI / 2, 13);

  // ----- Buff (salt vial) -----
  const buffs: Buff[] = [];
  {
    const saltMesh = new THREE.Group();
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8),
      new THREE.MeshStandardMaterial({
        color: 0xeae5dc,
        roughness: 0.4,
        emissive: 0xeae5dc,
        emissiveIntensity: 0.1,
      }),
    );
    jar.position.y = 0.08;
    saltMesh.add(jar);
    const halo = new THREE.PointLight(0xeae5dc, 0.4, 1.5);
    halo.position.y = 0.1;
    saltMesh.add(halo);
    const pos = new THREE.Vector3(-7, 0.84, -6);
    saltMesh.position.copy(pos);
    stageRoot.add(saltMesh);
    buffs.push({ kind: "salt", pos, mesh: saltMesh, taken: false });
  }

  // ----- Menace -----
  const menaceMat = new THREE.SpriteMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const maxSprite = new THREE.Sprite(menaceMat);
  maxSprite.scale.set(MENACE_WIDTH, MENACE_HEIGHT, 1);
  maxSprite.position.set(0, MENACE_HEIGHT / 2, -8);
  stageRoot.add(maxSprite);
  const maxHalo = new THREE.PointLight(0xa0134f, 0.6, 4);
  maxSprite.add(maxHalo);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");
  {
    const url = getRandomMonsterImageUrl();
    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const prev = menaceMat.map;
        menaceMat.map = texture;
        menaceMat.needsUpdate = true;
        prev?.dispose();
        // Pre-load monster tex for painting flash
        const flashTex = texture.clone();
        flashTex.needsUpdate = true;
        for (const p of paintings) {
          p.monsterTex = flashTex;
        }
      },
      undefined,
      (err) => console.error("monster texture failed", err),
    );
  }

  // ----- Game state -----
  const state = {
    runStartTime: clock.elapsedTime,
    hasKey: false,
    saltStored: false,
    hiding: false,
    breath: HIDE_BREATH_MAX,
    investigateUntil: -1,
    investigateTarget: new THREE.Vector3(),
    maxStunUntil: -1,
    flashedAt: -1,
    flashUntil: -1,
    hatchHoldStart: -1,
    pendingOutcome: null as StageOutcome,
  };

  // Expose for Playwright tests.
  (window as unknown as { __houseDebug?: unknown }).__houseDebug = {
    state,
    keyMesh,
    wardrobes,
    walls,
    maxSprite,
    buffs,
  };

  // Place player at the entry into the hall
  camera.position.set(0, PLAYER_HEIGHT, 5);
  hud.setStatus("You are inside. Find the brass key.");
  hud.setObjective("Find: brass key");
  hud.setCounter("Key: —");
  hud.setActionPrompt(null);
  hud.setActionReady(false);

  // ----- Collision -----
  const checkCollision = (x: number, z: number): boolean => {
    for (const w of walls) {
      const xMin = w.x - w.w / 2 - PLAYER_RADIUS;
      const xMax = w.x + w.w / 2 + PLAYER_RADIUS;
      const zMin = w.z - w.d / 2 - PLAYER_RADIUS;
      const zMax = w.z + w.d / 2 + PLAYER_RADIUS;
      if (x > xMin && x < xMax && z > zMin && z < zMax) return true;
    }
    return false;
  };

  const tryInteract = (): void => {
    if (state.pendingOutcome) return;
    const pos = camera.position;

    // Try wardrobe hide/exit
    for (const w of wardrobes) {
      if (Math.hypot(pos.x - w.pos.x, pos.z - w.pos.z) < 1.0) {
        if (!state.hiding) {
          state.hiding = true;
          w.occupiedByPlayer = true;
          w.doorPivot.rotation.y = -0.05; // slight close gesture
          audio.duckMaster(0.18, 0.4);
          hud.setStatus("Hidden. Don't breathe.");
        } else {
          state.hiding = false;
          for (const ww of wardrobes) ww.occupiedByPlayer = false;
          w.doorPivot.rotation.y = 0;
          audio.restoreMaster(0.4);
          hud.setStatus("You step back out.");
        }
        return;
      }
    }

    if (state.hiding) return;

    // Try key pickup
    if (!state.hasKey && pos.distanceTo(keyMesh.position) < 1.4) {
      state.hasKey = true;
      keyMesh.visible = false;
      keyHalo.visible = false;
      hud.setCounter("Key: HELD");
      hud.setObjective("Reach the cellar hatch");
      hud.setStatus("Brass key in hand.");
      return;
    }

    // Try buff pickup
    for (const b of buffs) {
      if (b.taken) continue;
      if (Math.hypot(pos.x - b.pos.x, pos.z - b.pos.z) < 1.1) {
        b.taken = true;
        b.mesh.visible = false;
        state.saltStored = true;
        hud.setStatus("Salt pocketed. He'll regret touching you.");
        return;
      }
    }

    // Try hatch
    if (state.hasKey && pos.distanceTo(hatchPos) < 1.4) {
      // Lock-in start of hatch hold
      // (handled in update tick; no-op here)
    }
  };

  // ----- Stage interface -----
  const stage: Stage = {
    id: "house",
    update(deltaTime: number, elapsedTime: number): StageOutcome {
      if (state.pendingOutcome) return null;

      if (input.interactPressed) tryInteract();

      // ----- Player movement (with collision) -----
      if (!state.hiding && input.walk.lengthSq() > 0.01) {
        const speed = input.sprint ? 5.2 : 3.1;
        const next = new THREE.Vector3()
          .copy(camera.position)
          .addScaledVector(input.walk, speed * deltaTime);
        // axis-separated slide
        if (!checkCollision(next.x, camera.position.z)) {
          camera.position.x = next.x;
        }
        if (!checkCollision(camera.position.x, next.z)) {
          camera.position.z = next.z;
        }
        // clamp to outer bounds
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -8.5, 8.5);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -9.5, 9.5);
      }

      // ----- Hiding mechanics -----
      if (state.hiding) {
        state.breath -= deltaTime;
        if (state.breath <= 0) {
          state.hiding = false;
          state.breath = 0;
          // Catch
          triggerCatch();
          return state.pendingOutcome;
        }
      } else if (state.breath < HIDE_BREATH_MAX) {
        state.breath = Math.min(HIDE_BREATH_MAX, state.breath + deltaTime * HIDE_REFILL_RATE);
      }

      // ----- Max AI -----
      const elapsed = elapsedTime - state.runStartTime;
      const rage = elapsed > RAGE_TIMER_SECONDS;

      const stunned = elapsedTime < state.maxStunUntil;
      if (!stunned) {
        const targetPos = state.hiding ? state.investigateTarget : camera.position;
        if (state.hiding) {
          if (state.investigateUntil < 0) {
            state.investigateUntil = elapsedTime + HIDE_INVESTIGATE_SECONDS;
            state.investigateTarget.copy(camera.position);
          } else if (elapsedTime > state.investigateUntil) {
            // resume patrol toward player (lazy AI: just chase)
            state.investigateUntil = -1;
          }
        } else {
          state.investigateUntil = -1;
        }
        const dir = new THREE.Vector3(
          targetPos.x - maxSprite.position.x,
          0,
          targetPos.z - maxSprite.position.z,
        );
        const dist = dir.length();
        if (dist > 0.01) {
          dir.divideScalar(dist);
          const speed = rage ? 4.5 : state.hiding ? 2.9 : 3.6;
          maxSprite.position.addScaledVector(dir, speed * deltaTime);
        }
        maxSprite.position.y = MENACE_HEIGHT / 2 + Math.sin(elapsedTime * 4) * 0.12;
      }

      // ----- Painting jumpscare at 3:00 -----
      if (elapsed > 180 && state.flashedAt < 0 && paintings.length > 0) {
        const target = paintings[Math.floor(Math.random() * paintings.length)];
        if (target?.monsterTex) {
          target.material.map = target.monsterTex;
          target.material.needsUpdate = true;
          target.flashed = true;
          state.flashedAt = elapsedTime;
          state.flashUntil = elapsedTime + 0.6;
          audio.playWrongSting();
        }
      }
      if (state.flashedAt > 0 && elapsedTime > state.flashUntil) {
        for (const p of paintings) {
          if (p.flashed) {
            p.material.map = p.defaultTex;
            p.material.needsUpdate = true;
            p.flashed = false;
          }
        }
        state.flashedAt = -2; // never re-fire
      }

      // ----- Catch detection -----
      const distToMax = maxSprite.position.distanceTo(camera.position);
      const pulse = THREE.MathUtils.clamp(1 - distToMax / 8, 0, 1);
      hud.setPulse(pulse * 0.85);
      audio.setIntensity(pulse);

      if (!state.hiding && distToMax < 1.15) {
        if (state.saltStored) {
          state.saltStored = false;
          state.maxStunUntil = elapsedTime + 2.5;
          // Push Max back
          const away = new THREE.Vector3(
            maxSprite.position.x - camera.position.x,
            0,
            maxSprite.position.z - camera.position.z,
          )
            .normalize()
            .multiplyScalar(5);
          maxSprite.position.add(away);
          hud.setStatus("Salt! He recoils.");
          audio.playWrongSting();
        } else {
          triggerCatch();
          return state.pendingOutcome;
        }
      }

      // ----- Hatch hold for win (XZ-only, ignore vertical offset) -----
      if (state.hasKey) {
        const dxh = camera.position.x - hatchPos.x;
        const dzh = camera.position.z - hatchPos.z;
        const distHatch = Math.hypot(dxh, dzh);
        if (distHatch < 1.6) {
          if (state.hatchHoldStart < 0) state.hatchHoldStart = elapsedTime;
          const hold = elapsedTime - state.hatchHoldStart;
          hud.setStatus(`Cellar… ${(HATCH_HOLD_SECONDS - hold).toFixed(1)}s`);
          hatchBoardPivot.rotation.x = -hold * 1.0;
          if (hold >= HATCH_HOLD_SECONDS) {
            triggerWin();
            return state.pendingOutcome;
          }
        } else {
          state.hatchHoldStart = -1;
          hatchBoardPivot.rotation.x = 0;
          hatchRimMat.color.setHex(0x44aa66);
        }
      }

      // ----- Update HUD -----
      const counter = state.hiding
        ? `Breath: ${state.breath.toFixed(1)}s · ${state.hasKey ? "KEY" : "no key"}`
        : `${state.hasKey ? "KEY" : "no key"}${state.saltStored ? " · salt ready" : ""}`;
      hud.setCounter(counter);

      // Update action prompt
      const nearWardrobe = wardrobes.some(
        (w) => Math.hypot(camera.position.x - w.pos.x, camera.position.z - w.pos.z) < 1.0,
      );
      const nearKey = !state.hasKey && camera.position.distanceTo(keyMesh.position) < 1.4;
      const nearBuff = buffs.some(
        (b) =>
          !b.taken && Math.hypot(camera.position.x - b.pos.x, camera.position.z - b.pos.z) < 1.1,
      );
      let promptText: string | null = null;
      if (state.hiding) promptText = ctx.isTouchDevice ? "Tap LIGHT to exit" : "[E] Step out";
      else if (nearWardrobe) promptText = ctx.isTouchDevice ? "Tap LIGHT to hide" : "[E] Hide";
      else if (nearKey) promptText = ctx.isTouchDevice ? "Tap LIGHT to take" : "[E] Take key";
      else if (nearBuff) promptText = ctx.isTouchDevice ? "Tap LIGHT to pocket" : "[E] Pocket";
      hud.setActionPrompt(promptText);
      hud.setActionReady(promptText !== null);

      return null;
    },
    dispose(): void {
      for (const id of timeoutIds) clearTimeout(id);
      timeoutIds.clear();
      // Restore scene state
      scene.fog = prevFog;
      scene.background = prevBackground;
      stageRoot.traverse((obj) => {
        const m = obj as THREE.Mesh | THREE.Sprite;
        if ((m as THREE.Mesh).isMesh || (m as THREE.Sprite).isSprite) {
          const mat = (m as THREE.Mesh).material;
          const mats = Array.isArray(mat) ? mat : [mat];
          for (const mm of mats) {
            if (!mm) continue;
            const std = mm as THREE.MeshStandardMaterial &
              THREE.MeshBasicMaterial &
              THREE.SpriteMaterial;
            std.map?.dispose();
            mm.dispose();
          }
          (m as THREE.Mesh).geometry?.dispose();
        }
        if (
          obj instanceof THREE.DirectionalLight ||
          obj instanceof THREE.SpotLight ||
          obj instanceof THREE.PointLight
        ) {
          obj.shadow?.map?.dispose();
        }
      });
      for (const d of disposables) {
        try {
          d.dispose();
        } catch {
          /* already disposed */
        }
      }
      disposables.length = 0;
      audio.restoreMaster(1);
      hud.setActionPrompt(null);
      hud.setActionReady(false);
      hud.setPulse(0);
    },
  };

  const triggerCatch = (): void => {
    if (state.pendingOutcome) return;
    state.pendingOutcome = "lose";
    audio.playLoseChord();
    audio.duckMaster(0.15, 2);
    maxSprite.scale.set(MENACE_WIDTH * 3.6, MENACE_HEIGHT * 3.6, 1);
    hud.setStatus("Il était dans le cadre.");
    hud.showEndscreen("Il était dans le cadre.", "He was in the frame.");
  };

  const triggerWin = (): void => {
    if (state.pendingOutcome) return;
    state.pendingOutcome = "win";
    audio.playWinChord();
    hud.setStatus("Tu t'es échappé. Encore.");
    hud.showEndscreen("Tu t'es échappé. Encore.", "You escaped. Again.");
  };

  return stage;
};

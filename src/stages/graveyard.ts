import * as THREE from "three";
import { audio } from "../audio.js";
import { DECORATION_IMAGES, getDecorationImageUrl, getRandomMonsterImageUrl } from "../images.js";
import type { Stage, StageOutcome } from "./Stage.js";
import type { StageContext } from "./StageContext.js";

// ---------------------------------------------------------------------------
// Constants — see docs/gameplay.md and docs/stage1-revamp.md
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
const MENACE_HEIGHT = 1.8;
const MENACE_WIDTH = 1.35;

// ---------------------------------------------------------------------------
// Procedural textures (stage 1 revamp)
// ---------------------------------------------------------------------------

const makeFloorTex = (): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#1c2030";
  ctx.fillRect(0, 0, 512, 512);
  // moss specks
  for (let i = 0; i < 600; i += 1) {
    ctx.fillStyle = `rgba(42,58,46,${(0.15 + Math.random() * 0.2).toFixed(2)})`;
    const r = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, r, r);
  }
  // dirt smears
  for (let i = 0; i < 200; i += 1) {
    ctx.fillStyle = `rgba(90,58,38,0.25)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 512,
      Math.random() * 512,
      4 + Math.random() * 6,
      3 + Math.random() * 4,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // wet-stone wash
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(58,74,82,0.2)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 512,
      Math.random() * 512,
      6 + Math.random() * 8,
      6 + Math.random() * 8,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // fallen leaves
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(42,34,24,0.5)`;
    const r = 2 + Math.random() * 2;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, r, r);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 4;
  return tex;
};

const makeStoneTex = (): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#6e7382";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i += 1) {
    ctx.fillStyle = `rgba(${i % 2 ? 122 : 90},${i % 2 ? 128 : 96},${i % 2 ? 143 : 106},0.4)`;
    const r = 1 + Math.random();
    ctx.fillRect(Math.random() * 256, Math.random() * 256, r, r);
  }
  // vertical water streaks
  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = `rgba(58,74,82,0.25)`;
    ctx.fillRect(Math.random() * 256, 0, 1 + Math.random(), 256);
  }
  // bone-yellow lichen blotches (bias bottom half)
  for (let i = 0; i < 25; i += 1) {
    ctx.fillStyle = `rgba(138,122,58,${(0.4 + Math.random() * 0.3).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 256,
      128 + Math.random() * 128,
      3 + Math.random() * 5,
      2 + Math.random() * 4,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // moss bottom-third
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = `rgba(42,58,46,0.5)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 256,
      170 + Math.random() * 86,
      5 + Math.random() * 7,
      4 + Math.random() * 5,
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

const makeIronTex = (): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#3a3d4a";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 30; i += 1) {
    ctx.fillStyle = `rgba(107,58,28,0.6)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 100, 1, 8 + Math.random() * 22);
  }
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = `rgba(138,74,34,0.8)`;
    const r = 2 + Math.random() * 2;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, r, r);
  }
  for (let i = 0; i < 2; i += 1) {
    ctx.fillStyle = `rgba(74,26,26,0.5)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 100, 1, 12);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
};

const makeBarkTex = (): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(42,31,21,0.6)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random(), 256);
  }
  for (let i = 0; i < 15; i += 1) {
    ctx.fillStyle = `rgba(42,58,46,0.4)`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 256,
      Math.random() * 256,
      3 + Math.random() * 5,
      2 + Math.random() * 4,
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
  tex.repeat.set(1, 3);
  tex.anisotropy = 4;
  return tex;
};

// ---------------------------------------------------------------------------
// Stage factory
// ---------------------------------------------------------------------------

export const createGraveyardStage = (ctx: StageContext): Stage => {
  const { scene: _scene, stageRoot, camera, renderer, clock, hud, input } = ctx;
  void _scene;
  const timeoutIds = new Set<number>();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // ------------------------------ Textures ---------------------------------
  const floorTex = track(makeFloorTex());
  const stoneTex = track(makeStoneTex());
  const ironTex = track(makeIronTex());
  const barkTex = track(makeBarkTex());

  // ------------------------------ Ground / perimeter ----------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: floorTex,
      roughness: 0.95,
      metalness: 0.05,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  stageRoot.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2a2c38,
    map: stoneTex.clone(),
    roughness: 0.95,
  });
  wallMat.map!.repeat.set(6, 1.2);
  track(wallMat);
  track(wallMat.map!);
  const wallGeo = new THREE.BoxGeometry(30, 6, 0.8);
  const sideWallGeo = new THREE.BoxGeometry(0.8, 6, 30);

  const northWall = new THREE.Mesh(wallGeo, wallMat);
  northWall.position.set(0, 3, -15);
  stageRoot.add(northWall);
  const southWall = new THREE.Mesh(wallGeo, wallMat);
  southWall.position.set(0, 3, 15);
  stageRoot.add(southWall);
  const eastWall = new THREE.Mesh(sideWallGeo, wallMat);
  eastWall.position.set(15, 3, 0);
  stageRoot.add(eastWall);
  const westWall = new THREE.Mesh(sideWallGeo, wallMat);
  westWall.position.set(-15, 3, 0);
  stageRoot.add(westWall);

  // ------------------------------ Lights ----------------------------------
  const ambientLight = new THREE.AmbientLight(0x4a5680, 0.85);
  stageRoot.add(ambientLight);

  const moonLight = new THREE.DirectionalLight(0x9fb0ff, 1.1);
  moonLight.position.set(-6, 12, 4);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  stageRoot.add(moonLight);

  const flickerLight = new THREE.PointLight(0xb0c8ff, 2.2, 30);
  flickerLight.position.set(0, 4.5, 0);
  stageRoot.add(flickerLight);

  // ------------------------------ Iron fence ------------------------------
  const spikeGeo = new THREE.BoxGeometry(0.06, 2.4, 0.06);
  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: ironTex,
    metalness: 0.5,
    roughness: 0.55,
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
  stageRoot.add(spikes);

  // ------------------------------ Landmarks --------------------------------
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    roughness: 1,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1c24, roughness: 1 });
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: barkTex,
    roughness: 1,
  });

  // Hanging tree
  {
    const tree = new THREE.Group();
    tree.position.set(0, 0, -12);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 5, 8), barkMat);
    trunk.position.y = 2.5;
    tree.add(trunk);
    for (let i = 0; i < 5; i += 1) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 3, 5), barkMat);
      const yaw = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
      branch.rotation.z = Math.PI / 3 + (Math.random() - 0.5) * 0.3;
      branch.rotation.y = yaw;
      branch.position.set(Math.cos(yaw) * 0.4, 4.2, Math.sin(yaw) * 0.4);
      tree.add(branch);
    }
    const horiz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2.6, 5), barkMat);
    horiz.rotation.z = Math.PI / 2;
    horiz.position.set(1.2, 4.5, 0);
    tree.add(horiz);
    const noose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), barkMat);
    noose.position.set(2.3, 4.05, 0);
    tree.add(noose);
    stageRoot.add(tree);
  }

  // Chapel ruin
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
    const wPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 1.0), stoneMat);
    wPillarL.position.set(-2, 1.6, -1.5);
    chapel.add(wPillarL);
    const wPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 1.0), stoneMat);
    wPillarR.position.set(-2, 1.6, 1.5);
    chapel.add(wPillarR);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 4), stoneMat);
    lintel.position.set(-2, 3.0, 0);
    chapel.add(lintel);
    stageRoot.add(chapel);
  }

  // Mausoleum row
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
      // rust hinges
      for (const dy of [-0.5, 0.4]) {
        const hinge = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.12, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x6b3a1c, roughness: 0.7 }),
        );
        hinge.position.set(0.35, 0.8 + dy, 1.5);
        m.add(hinge);
      }
      m.position.set(0, 0, i * 3.4);
      row.add(m);
    }
    stageRoot.add(row);
  }

  // The Gate
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, 14.8);
  stageRoot.add(gateGroup);

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: ironTex.clone(),
    metalness: 0.7,
    roughness: 0.4,
  });
  ironMat.map!.repeat.set(4, 2);
  track(ironMat.map!);

  const pillarGeo = new THREE.BoxGeometry(0.6, 4.2, 0.6);
  const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
  leftPillar.position.set(-2.3, 2.1, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
  rightPillar.position.set(2.3, 2.1, 0);
  gateGroup.add(leftPillar, rightPillar);

  // pillar cornices
  for (const px of [-2.3, 2.3]) {
    const corn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), stoneMat);
    corn.position.set(px, 4.2, 0);
    gateGroup.add(corn);
  }

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
  stageRoot.add(gateSpot);
  stageRoot.add(gateSpot.target);

  // ------------------------------ Graves + nameplates + portraits ---------
  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");

  const graveGeometry = new THREE.BoxGeometry(0.5, 1.3, 0.18);
  const graveMatPlain = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: stoneTex,
    roughness: 0.95,
  });
  const graveMatMossy = new THREE.MeshStandardMaterial({
    color: 0x4a5848,
    map: stoneTex,
    roughness: 0.95,
  });

  const makeNameplateTexture = (name: string, dates: string): THREE.CanvasTexture => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx2d = c.getContext("2d");
    if (!ctx2d) throw new Error("no 2d ctx");
    ctx2d.clearRect(0, 0, 256, 128);
    ctx2d.strokeStyle = "#2a2d38";
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect(6, 6, 244, 116);
    ctx2d.fillStyle = "#1a1820";
    ctx2d.shadowColor = "rgba(0,0,0,0.85)";
    ctx2d.shadowBlur = 2;
    ctx2d.textAlign = "center";
    ctx2d.font = 'bold 30px "Times New Roman", serif';
    ctx2d.fillText(name, 128, 60);
    ctx2d.shadowBlur = 1;
    ctx2d.font = '16px "Times New Roman", serif';
    ctx2d.fillText(dates, 128, 92);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
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
    mossy: boolean,
  ): { group: THREE.Group; plateTex: THREE.CanvasTexture } => {
    const group = new THREE.Group();
    group.position.set(worldX, 0.65, worldZ);
    group.rotation.y = rotY;
    group.rotation.x = tilt;

    const stone = new THREE.Mesh(graveGeometry, mossy ? graveMatMossy : graveMatPlain);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);

    const plateTex = makeNameplateTexture(name, randomDates());
    const plateMat = new THREE.MeshBasicMaterial({
      map: plateTex,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const plate = new THREE.Mesh(nameplateGeo, plateMat);
    plate.position.set(0, 0.18, 0.1);
    group.add(plate);

    return { group, plateTex };
  };

  // -- Portrait support (stage 1 revamp): 8 random decoys get a sepia photo --
  const portraitFrameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: ironTex,
    roughness: 0.6,
    metalness: 0.5,
  });
  const portraitGeo = new THREE.PlaneGeometry(0.22, 0.28);
  const portraitFrameGeo = new THREE.BoxGeometry(0.25, 0.31, 0.015);
  const portraitTextures: THREE.CanvasTexture[] = [];

  const makePortraitTexture = (image: HTMLImageElement): THREE.CanvasTexture => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 320;
    const ctx2d = c.getContext("2d");
    if (!ctx2d) throw new Error("no 2d ctx");
    ctx2d.fillStyle = "#1a1410";
    ctx2d.fillRect(0, 0, 256, 320);
    ctx2d.filter = "sepia(0.85) contrast(0.85) brightness(0.55) saturate(0.6)";
    ctx2d.drawImage(image, 4, 4, 248, 312);
    ctx2d.filter = "none";
    const grad = ctx2d.createRadialGradient(128, 160, 30, 128, 160, 180);
    grad.addColorStop(0, "rgba(20,16,12,0)");
    grad.addColorStop(1, "rgba(20,16,12,0.6)");
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, 256, 320);
    for (let i = 0; i < 200; i += 1) {
      ctx2d.fillStyle = `rgba(42,34,24,0.2)`;
      ctx2d.fillRect(Math.random() * 256, Math.random() * 320, 1, 1);
    }
    ctx2d.strokeStyle = "#1a1410";
    ctx2d.lineWidth = 4;
    ctx2d.strokeRect(2, 2, 252, 316);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };

  const attachPortrait = (graveGroup: THREE.Group, decorationIndex: number): void => {
    const url = getDecorationImageUrl(decorationIndex);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = makePortraitTexture(img);
      portraitTextures.push(tex);
      const plate = new THREE.Mesh(
        portraitGeo,
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.7,
        }),
      );
      plate.position.set(0, 0.42, 0.095);
      const frame = new THREE.Mesh(portraitFrameGeo, portraitFrameMat);
      frame.position.set(0, 0.42, 0.085);
      graveGroup.add(frame, plate);
    };
    img.onerror = (): void => {
      console.warn("portrait image failed to load", url);
    };
    img.src = url;
  };

  const candleGraves: THREE.Group[] = [];
  for (let i = 0; i < 7; i += 1) {
    const slot = CANDLE_POSITIONS[i];
    const name = candleNames[i];
    if (!slot || !name) continue;
    const [x, z] = slot;
    const rotY = Math.atan2(-x, -z) + (Math.random() - 0.5) * 0.3;
    const { group, plateTex } = buildGrave(x, z, rotY, 0, name, false);
    stageRoot.add(group);
    candleGraves.push(group);
    track(plateTex);
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
      if (ok && x < -7.5 && x > -12 && z < 2.5 && z > -2.5) ok = false;
      if (ok && x < -6.5 && x > -10.5 && z < -6 && z > -11) ok = false;
      if (ok && Math.hypot(x, z + 12) < 1.5) ok = false;
      if (!ok) continue;
      const name = decoyNames[placed];
      if (!name) break;
      const tilt = Math.random() < 0.3 ? (Math.random() - 0.5) * 0.6 : 0;
      const mossy = Math.random() < 0.3;
      const { group, plateTex } = buildGrave(x, z, (Math.random() - 0.5) * 0.6, tilt, name, mossy);
      stageRoot.add(group);
      decoyGraves.push(group);
      track(plateTex);
      placed += 1;
    }
  }

  // Portraits on 8 random decoys
  {
    const indices = decoyGraves.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const ai = indices[i];
      const aj = indices[j];
      if (ai === undefined || aj === undefined) continue;
      indices[i] = aj;
      indices[j] = ai;
    }
    const chosen = indices.slice(0, Math.min(8, indices.length));
    for (let i = 0; i < chosen.length; i += 1) {
      const graveIdx = chosen[i];
      if (graveIdx === undefined) continue;
      const grave = decoyGraves[graveIdx];
      if (!grave) continue;
      attachPortrait(grave, i % DECORATION_IMAGES.length);
    }
  }

  // ------------------------------ Decor (a subset of stage1-revamp.md §5) -
  const decor = new THREE.Group();
  stageRoot.add(decor);

  // Fallen lantern + rust puddle
  {
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.18, 6),
      new THREE.MeshStandardMaterial({
        color: 0x6b3a1c,
        map: ironTex,
        roughness: 0.8,
      }),
    );
    lantern.position.set(-8.4, 0.09, 1.6);
    lantern.rotation.z = -1.2;
    decor.add(lantern);
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 12),
      new THREE.MeshBasicMaterial({
        color: 0x4a1a1a,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(-8.4, 0.03, 1.6);
    decor.add(puddle);
  }

  // Rusty bucket
  {
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x8a4a22,
        map: ironTex,
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    bucket.position.set(11.8, 0.13, -6);
    bucket.rotation.x = 0.5;
    decor.add(bucket);
  }

  // Fallen leaves instanced
  {
    const leafGeo = new THREE.CircleGeometry(0.06, 5);
    const leafMat = new THREE.MeshBasicMaterial({
      color: 0x2a2218,
      transparent: true,
      opacity: 0.7,
    });
    const leafCount = 30;
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < leafCount; i += 1) {
      let cx = 0;
      let cz = -12;
      if (i < 15) {
        cx = (Math.random() - 0.5) * 4;
        cz = -12 + (Math.random() - 0.5) * 4;
      } else if (i < 25) {
        cx = -10 + (Math.random() - 0.5) * 4;
        cz = (Math.random() - 0.5) * 4;
      } else {
        cx = (Math.random() - 0.5) * 26;
        cz = (Math.random() - 0.5) * 26;
      }
      dummy.position.set(cx, 0.01 + Math.random() * 0.02, cz);
      dummy.rotation.x = -Math.PI / 2;
      dummy.rotation.z = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;
    decor.add(leaves);
  }

  // ------------------------------ Candles ---------------------------------
  type Candle = {
    index: number;
    name: string;
    pos: THREE.Vector3;
    group: THREE.Group;
    flame: THREE.Mesh;
    light: THREE.PointLight;
    decal: THREE.Mesh;
    lit: boolean;
  };

  const candleBaseMat = new THREE.MeshStandardMaterial({ color: 0x141016, roughness: 0.9 });
  const decalMat = new THREE.MeshBasicMaterial({
    color: 0xff8a3c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });

  const candles: Candle[] = [];
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
      const a = (d / 3) * Math.PI * 2 + Math.random();
      drip.position.set(Math.cos(a) * 0.07, 0.05 + Math.random() * 0.15, Math.sin(a) * 0.07);
      group.add(drip);
    }

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffd084,
        fog: false,
        transparent: true,
        opacity: 0,
      }),
    );
    flame.scale.set(1, 1.6, 1);
    flame.position.y = 0.42;
    flame.visible = false;
    group.add(flame);

    const light = new THREE.PointLight(0xffb24a, 0, 4.5);
    light.position.y = 0.5;
    group.add(light);

    stageRoot.add(group);

    // Ground decal (lights ground warm when candle is lit)
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), decalMat.clone());
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(x, 0.04, z);
    stageRoot.add(decal);

    candles.push({
      index: i,
      name,
      pos: new THREE.Vector3(x, PLAYER_HEIGHT, z),
      group,
      flame,
      light,
      decal,
      lit: false,
    });
  }

  // ------------------------------ Menace ----------------------------------
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
  stageRoot.add(primary.sprite);

  const flanker = makeMenace(0x6a1029, 0.5);
  flanker.sprite.position.set(-13, MENACE_HEIGHT / 2, -13);
  flanker.sprite.visible = false;
  stageRoot.add(flanker.sprite);

  const loadMenaceTexture = (mat: THREE.SpriteMaterial): void => {
    const url = getRandomMonsterImageUrl();
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

  // ------------------------------ Game state ------------------------------
  const state = {
    order: [] as number[],
    currentIndex: 0,
    wrongCount: 0,
    runStartTime: clock.elapsedTime,
    nextWhisperAt: clock.elapsedTime + 1.8,
    whisperHudUntil: 0,
    currentWhisperName: null as string | null,
    gateOpening: false,
    gateProgress: 0,
    flankerEnabled: false,
    winHoldStart: -1,
    litCount: 0,
    pendingOutcome: null as StageOutcome,
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

  state.order = shuffleIndices(7);

  const upAxis = new THREE.Vector3(0, 1, 0);
  void upAxis;
  const nextPosition = new THREE.Vector3();
  const menaceTarget = new THREE.Vector3();

  // place player
  camera.position.set(0, PLAYER_HEIGHT, 8);
  hud.setStatus("Listen for the name…");
  hud.setObjective("—");
  hud.setCounter("0 / 7 · 0/3 wrong");
  hud.setActionPrompt(null);
  hud.setActionReady(false);

  const updateHud = (): void => {
    hud.setCounter(`${state.litCount} / 7 · ${state.wrongCount}/${MAX_WRONG} wrong`);
    if (state.currentWhisperName && state.litCount < 7) {
      hud.setObjective(state.currentWhisperName);
    } else if (state.litCount >= 7) {
      hud.setObjective("Run to the gate!");
    } else {
      hud.setObjective("—");
    }
  };

  const triggerWhisper = (): void => {
    if (state.litCount >= 7) return;
    const idx = state.order[state.currentIndex];
    if (idx === undefined) return;
    const candle = candles[idx];
    if (!candle) return;
    state.currentWhisperName = candle.name;
    state.whisperHudUntil = clock.elapsedTime + 2.5;
    audio.playWhisper(candle.name);
    updateHud();
  };

  const scheduleNextWhisper = (delay: number): void => {
    state.nextWhisperAt = clock.elapsedTime + delay;
  };

  const lightCandle = (candle: Candle): void => {
    if (candle.lit) return;
    candle.lit = true;
    candle.flame.visible = true;
    (candle.flame.material as THREE.MeshBasicMaterial).opacity = 1;
    candle.light.intensity = 1.4;
    (candle.decal.material as THREE.MeshBasicMaterial).opacity = 0.18;
    state.litCount += 1;
    state.currentIndex += 1;
    audio.playLightCandle();
    audio.setCandleProgress(state.litCount);

    if (state.litCount === 5) {
      state.flankerEnabled = true;
      flanker.sprite.visible = true;
      const a = Math.random() * Math.PI * 2;
      flanker.sprite.position.set(Math.cos(a) * 13, MENACE_HEIGHT / 2, Math.sin(a) * 13);
      loadMenaceTexture(flanker.material);
    }

    if (state.litCount >= 7) {
      triggerGateOpen();
    } else {
      scheduleNextWhisper(3 + Math.random() * 6);
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
        (c.decal.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  };

  const triggerWrongCandle = (): void => {
    state.wrongCount += 1;
    audio.playWrongSting();
    if (state.wrongCount >= MAX_WRONG) {
      snuffAllCandles();
      triggerCatch();
    } else {
      hud.setStatus(
        `Wrong name. ${MAX_WRONG - state.wrongCount} mistake${
          MAX_WRONG - state.wrongCount === 1 ? "" : "s"
        } left.`,
      );
      hud.setPulse(0.7);
      const id = ctx.setTimeout(() => {
        if (state.pendingOutcome === null) {
          hud.setStatus("Listen again…");
        }
        timeoutIds.delete(id);
      }, 1500);
      timeoutIds.add(id);
    }
    updateHud();
  };

  const triggerGateOpen = (): void => {
    state.gateOpening = true;
    audio.playGateRumble();
    hud.setStatus("The gate gives way. Run.");
  };

  const tryInteract = (): void => {
    if (state.pendingOutcome) return;
    if (state.litCount >= 7) return;
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
    const expectedIdx = state.order[state.currentIndex];
    if (expectedIdx === undefined) return;
    if (nearest.index === expectedIdx) {
      lightCandle(nearest);
    } else {
      triggerWrongCandle();
    }
  };

  const triggerCatch = (): void => {
    if (state.pendingOutcome) return;
    state.pendingOutcome = "lose";
    audio.playLoseChord();
    audio.duckMaster(0.15, 2);
    primary.sprite.scale.set(MENACE_WIDTH * 3.6, MENACE_HEIGHT * 3.6, 1);
    hud.setStatus("Max t'a trouvé.");
    hud.showEndscreen("Max t'a trouvé.", "Your trespass ends here.");
  };

  const triggerWin = (): void => {
    if (state.pendingOutcome) return;
    state.pendingOutcome = "win";
    audio.playWinChord();
    hud.setStatus("Tu t'es échappé.");
    hud.showEndscreen("Stage 1 cleared", "The house waits across the dead grass…");
  };

  const applyPhaseTuning = (): void => {
    const t = state.litCount / 7;
    ambientLight.intensity = 0.85 - t * 0.3;
    moonLight.intensity = 1.1 - t * 0.65;
    moonLight.color.lerpColors(new THREE.Color(0x9fb0ff), new THREE.Color(0x7a8aff), t);
    const fog = ctx.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.far = 38 - t * 14;
    }
    flickerLight.distance = state.litCount >= 5 ? 18 : 30;
    flickerLight.color.lerpColors(new THREE.Color(0xb0c8ff), new THREE.Color(0xc8b890), t);
    if (state.litCount >= 7) {
      flickerLight.intensity = 0;
    }
  };

  const updatePlayer = (deltaTime: number): void => {
    if (input.walk.lengthSq() > 0.01) {
      const speed = input.sprint ? 5.2 : 3.1;
      nextPosition.copy(camera.position).addScaledVector(input.walk, speed * deltaTime);
      const maxZ = state.gateProgress > 0.7 ? 15.6 : 14;
      nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -14, 14);
      nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -14, maxZ);
      camera.position.copy(nextPosition);
    }
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
    if (!state.gateOpening) return;
    state.gateProgress = THREE.MathUtils.clamp(state.gateProgress + deltaTime / 1.8, 0, 1);
    const eased = 1 - Math.pow(1 - state.gateProgress, 3);
    westLeafPivot.rotation.y = -eased * (Math.PI / 2);
    eastLeafPivot.rotation.y = eased * (Math.PI / 2);
    gateSpot.intensity = eased * 3;
    if (state.gateProgress < 0.25) {
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

  const updateActionPrompt = (): void => {
    if (state.pendingOutcome || state.litCount >= 7) {
      hud.setActionPrompt(null);
      hud.setActionReady(false);
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
      hud.setActionPrompt(
        ctx.isTouchDevice ? "Tap LIGHT to light this candle" : "[E] Light this candle",
      );
      hud.setActionReady(true);
    } else {
      hud.setActionPrompt(null);
      hud.setActionReady(false);
    }
  };

  updateHud();

  // ------------------------------ Stage interface implementation ----------
  const stage: Stage = {
    id: "graveyard",
    update(deltaTime: number, elapsedTime: number): StageOutcome {
      if (state.pendingOutcome) {
        return null; // wait for endscreen click; orchestrator handles transition
      }

      flickerLight.intensity =
        state.litCount >= 7 ? 0 : 2.0 + Math.sin(elapsedTime * 11) * 0.25 + Math.random() * 0.15;

      // Handle interact press
      if (input.interactPressed) {
        tryInteract();
      }

      updatePlayer(deltaTime);

      if (state.litCount < 7 && elapsedTime >= state.nextWhisperAt && state.nextWhisperAt > 0) {
        triggerWhisper();
        state.nextWhisperAt = Number.POSITIVE_INFINITY;
      }

      const elapsed = elapsedTime - state.runStartTime;
      const rage = elapsed > RAGE_TIMER_SECONDS ? 1 : 0;

      applyPhaseTuning();

      const t = state.litCount / 7;
      const primarySpeed = (2.4 + t * 2.4) * (1 + rage);
      const primaryLerp = 0.012 + t * 0.016;
      updateMenace(primary.sprite, primarySpeed, primaryLerp, elapsedTime, deltaTime, 0);

      if (state.flankerEnabled) {
        updateMenace(
          flanker.sprite,
          primarySpeed * 0.6,
          primaryLerp * 0.7,
          elapsedTime,
          deltaTime,
          1.7,
        );
      }

      const distP = primary.sprite.position.distanceTo(camera.position);
      const distF = state.flankerEnabled
        ? flanker.sprite.position.distanceTo(camera.position)
        : Infinity;
      const dist = Math.min(distP, distF);
      const pulse = THREE.MathUtils.clamp(1 - dist / 10, 0, 1);
      hud.setPulse(pulse * 0.85);
      audio.setIntensity(pulse);

      if (dist < 1.25) {
        triggerCatch();
        return state.pendingOutcome;
      }

      for (const candle of candles) updateFlame(candle, elapsedTime);

      updateGate(deltaTime);

      if (state.litCount >= 7 && state.gateProgress > 0.6) {
        const dxg = camera.position.x;
        const dzg = camera.position.z - 14.5;
        const dGate = Math.hypot(dxg, dzg);
        if (dGate < GATE_TRIGGER_RADIUS) {
          if (state.winHoldStart < 0) state.winHoldStart = elapsedTime;
          const hold = elapsedTime - state.winHoldStart;
          hud.setStatus(`Escaping… ${(GATE_HOLD_SECONDS - hold).toFixed(1)}s`);
          if (hold >= GATE_HOLD_SECONDS) {
            triggerWin();
            return state.pendingOutcome;
          }
        } else {
          state.winHoldStart = -1;
        }
      }

      updateActionPrompt();

      return null;
    },
    dispose(): void {
      // Clear timers
      for (const id of timeoutIds) clearTimeout(id);
      timeoutIds.clear();

      // Walk stageRoot disposing geometries, materials, textures
      stageRoot.traverse((obj) => {
        const m = obj as THREE.Mesh | THREE.Sprite | THREE.InstancedMesh;
        if ((m as THREE.Mesh).isMesh || (m as THREE.Sprite).isSprite) {
          const mat = (m as THREE.Mesh).material;
          const mats = Array.isArray(mat) ? mat : [mat];
          for (const mm of mats) {
            if (!mm) continue;
            const stdMat = mm as THREE.MeshStandardMaterial &
              THREE.MeshBasicMaterial &
              THREE.SpriteMaterial;
            stdMat.map?.dispose();
            stdMat.normalMap?.dispose();
            stdMat.alphaMap?.dispose();
            stdMat.emissiveMap?.dispose();
            mm.dispose();
          }
          (m as THREE.Mesh).geometry?.dispose();
        }
        if (m instanceof THREE.InstancedMesh) {
          m.geometry.dispose();
          m.dispose();
        }
        if (
          obj instanceof THREE.DirectionalLight ||
          obj instanceof THREE.SpotLight ||
          obj instanceof THREE.PointLight
        ) {
          obj.shadow?.map?.dispose();
        }
      });

      // Explicitly dispose tracked textures (some were cloned)
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

  return stage;
};

# Stage 1 revamp — color & texture pass

Companion to [art-direction.md](./art-direction.md). Output of an environment
art-director pass on 2026-05-15, addressing user feedback: _"it's basically
two colors, black and dark blue."_ Gameplay (see [gameplay.md](./gameplay.md))
is locked — layout, candle positions, mechanics unchanged.

**Touchstone**: _Bloodborne_'s Old Yharnam — wet cold stone with rust, moss,
and bone-yellow lichen breaking up the blue. Caspar David Friedrich's
_Cemetery in the Snow_ keeps the warm/cold balance honest. Still a
night-graveyard, still cold-dominant. We are adding **muted tertiary
accents**, not a daylight pass.

## 1. Palette additions

Keep the 3-hue contract (cold blue-grey base · `#ffb24a` warm candle ·
`#a0134f` Max wound-red). All new colors are **low-sat, low-value**.

| Hex       | Role               | Why                                                                |
| --------- | ------------------ | ------------------------------------------------------------------ |
| `#2a3a2e` | Moss / dead lichen | Grey-green that reads "wet & growing" without breaking cold mood.  |
| `#5a3a26` | Wet earth / dirt   | Dark umber under graves, in cracks. Warmer than the floor.         |
| `#6b3a1c` | Rust (deep)        | Iron decay on fence, hinges, bucket.                               |
| `#8a4a22` | Rust (highlight)   | Bright edge of rust streaks. Used sparingly.                       |
| `#8a7a3a` | Bone lichen        | Dull yellow-ochre crust on stone. Reads at distance as old-paper.  |
| `#3a4a52` | Wet stone          | Slightly blue-green stone wash, breaks the flat grey of mausoleum. |
| `#4a1a1a` | Dried blood-rust   | Iron-stain near gate hinges and the noose tip. Discreet.           |
| `#2a2218` | Dead leaves        | Brown for scattered leaves, wreaths.                               |

`#a0134f` and `#ff8a3c/#ffb24a` remain reserved (Max, candles). The new
palette never approaches their saturation.

## 2. Procedural texture techniques (CanvasTexture recipes)

All textures generated once at boot via helper `makeNoiseTex(opts)`. Keep
canvas size ≤ 512 px. All use `wrapS = wrapT = RepeatWrapping`,
`colorSpace = SRGBColorSpace`, `anisotropy = 4`.

**Floor** — `512×512`. Fill `#1c2030`. Then:

- 600 dots `#2a3a2e` (1–3 px), opacity `rand 0.15–0.35` → moss specks.
- 200 ellipse patches `#5a3a26` (4–10 px, opacity 0.25) → dirt smears.
- 80 patches `#3a4a52` (6–14 px, opacity 0.20) → wet-stone wash.
- 40 brown dots `#2a2218` (2–4 px, opacity 0.5) → fallen leaves.
- `repeat.set(8, 8)`. Floor stops looking like a void.

**Stone (graves / mausoleum / chapel / gate pillars)** — `256×256`. Fill
`#6e7382`. Then:

- 300 grey dots `#5a606a` and `#7a808f` (1–2 px, opacity 0.4) → grain.
- 12 vertical streaks (1–2 px wide, full height, `#3a4a52`, opacity 0.25) →
  water staining.
- 25 lichen blotches `#8a7a3a` (3–8 px ellipses, opacity 0.4–0.7) →
  bone-yellow crust. Bias toward bottom half of canvas.
- 8 moss blotches `#2a3a2e` (5–12 px, opacity 0.5), bottom third only.
- `repeat.set(1, 1)` on graves, `(2, 2)` on bigger walls.

**Iron** — `128×128`. Fill `#3a3d4a`. Then:

- 30 rust streaks `#6b3a1c` (1 px wide × 8–30 px tall, opacity 0.6).
- 8 brighter rust flecks `#8a4a22` (2–4 px, opacity 0.8).
- 2 dried-blood-rust drips `#4a1a1a` (1 px × 12 px, opacity 0.5).
- `repeat.set(1, 4)` on fence spikes (vertical), `(4, 2)` on gate leaves.

**Floor leaves overlay** (optional, for variety) — a second 256×256 alpha
canvas of ~120 small `#2a2218`/`#8a7a3a` leaf shapes, blended additively as
a separate `Plane(30,30) y=0.02 opacity 0.35`. One draw call.

## 3. Per-element changes

| Element             | Was                          | Now                                                                                                                                           |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Floor**           | flat `#1c2030`               | `floorTex` (above) `+ aoMap` trick: multiply by faint `#5a3a26` corners via vertex colors. Roughness 0.95.                                    |
| **Perimeter walls** | flat `#363846`               | `stoneTex`, repeat `(6, 1.2)`. Darken color to `#2a2c38` so texture reads.                                                                    |
| **Gravestones**     | flat `#5a606a`               | `stoneTex` per-mesh (share material — same `map`). 8 "broken" graves get tilt + a `#2a3a2e` moss tint via `material.color.setHex(0x4a5848)`.  |
| **Mausoleum row**   | flat `#6e7382`               | `stoneTex`. Roof gets `repeat(1.2, 0.5)` darker tint `#4a4d56`. Door stays `#1a1c24` but adds two `#6b3a1c` 0.02×0.6×0.02 rust-hinge boxes.   |
| **Chapel ruin**     | flat `#6e7382`               | `stoneTex`, more lichen-biased variant (`repeat(1.5, 1.5)`). West archway pillars get an ivy strand (see decor §5).                           |
| **Hanging tree**    | flat `#1a1410`               | bark via `barkTex`: 256×256 fill `#1a1410` + 80 vertical streaks `#2a1f15` (opacity 0.6) + 15 moss patches `#2a3a2e` (opacity 0.4). `(1, 3)`. |
| **Iron fence**      | flat `#3a3d4a` metalness 0.6 | `ironTex` instanced. Same draw call count (still 1 InstancedMesh per side). Metalness 0.5, roughness 0.55.                                    |
| **Gate leaves**     | flat `#3a3d4a` metalness 0.7 | `ironTex` `(4, 2)`. Add 4 `#4a1a1a` 0.04×0.04×0.02 blood-rust flecks near hinges.                                                             |
| **Gate pillars**    | flat `#6e7382`               | `stoneTex` (1, 1.5). Cap each pillar with a `BoxGeometry(0.7, 0.1, 0.7)` cornice `#5a606a` — silhouette break.                                |
| **Candle base**     | flat `#141016`               | Unchanged (wax stays black). Add tiny `#8a7a3a` wax-drip dot via 1×1 px varying — skip, not worth the cost. Keep as-is.                       |

## 4. Grave portrait system

A subset of decoy graves display a small face — "they had loved ones, now
they're stones." Use existing `src/images.ts` portraits.

**Reservation**: image at `images[0]` is **reserved for Max** (Max loads via
`getRandomImageUrl` already; restrict `getRandomImageUrl` to indices
`0..15`, and the portrait system to **indices 1..15** = 15 portraits.).
Alternatively, when Max loads, track which index he uses for the run and
exclude it from portrait pool. Either way: **the player must not see Max's
face mounted on a grave**.

**Count**: **8 of the 25 decoy graves** get a portrait. Randomly chosen at
boot, no repeats. Distribute across the map — at least one in each quadrant.

**Plane**:

- `PlaneGeometry(0.22, 0.28)` (portrait-orientation, slightly taller).
- Local position on grave group: `(0, 0.42, 0.095)` — above the nameplate,
  on the front face, offset 0.005 m forward of the plate to avoid z-fight.
- `material.transparent = false`, `depthWrite = true` (it's not transparent).
- `material.fog = true`.

**Texture treatment** — sepia + desaturation + vignette so the image reads
as "an old photograph", not a recognizable modern face:

1. Load image via existing `TextureLoader`.
2. Render it into a `256×320` canvas with `ctx.filter = "sepia(0.85)
contrast(0.85) brightness(0.55) saturate(0.6)"`.
3. Overlay a radial-gradient vignette `rgba(20, 16, 12, 0.6)` corners → 0
   center.
4. Overlay 200 noise dots `#2a2218` (1 px, opacity 0.2) — film grain.
5. Border: 4 px `#1a1410` stroke (the photo edge).
6. Resulting `CanvasTexture`, `colorSpace = SRGBColorSpace`.

**Frame mesh** (cheap, gives the portrait weight):

- `BoxGeometry(0.25, 0.31, 0.015)`, `MeshStandardMaterial({ color:
0x3a3d4a, roughness: 0.6, metalness: 0.5, map: ironTex })` — pewter frame.
- Position behind the plane at local `(0, 0.42, 0.09)`. The plane sits in
  front of the frame.

**Anti-Max-recognition**: heavy sepia + 55% brightness + 60% saturation
makes the portraits look like 19th-century daguerreotypes. Max's sprite is
shown full-color, full-bright, full-scale at 1.8 m tall — the cognitive
gap is wide enough. If the user wants more safety: exclude Max's chosen
texture index from the portrait pool for the run (1-line filter in
`startRun`).

**Performance**: 8 plates × 2 meshes (plane + frame) = 16 extra meshes, 1
extra material per (texture differs). Acceptable within the 80-mesh budget.

## 5. New decorative props (≤ 10)

All grouped under a single `Group("decor")` for easy toggling. Counts
inclusive of multiplicity.

1. **Fallen oil lantern** ×1 — near chapel ruin at `(-8.4, 0.05, 1.6)`.
   `CylinderGeometry(0.08, 0.10, 0.18, 6)` + `BoxGeometry(0.14, 0.14, 0.14)`
   glass top. Material `ironTex`. Tipped 70° on z. Beside it: a
   `CircleGeometry(0.25, 12)` flat at `y = 0.03`, color `#4a1a1a` opacity
   0.7 — oil/rust puddle.
2. **Rusty bucket** ×1 — at `(11.8, 0.13, -6)`. `CylinderGeometry(0.18,
0.14, 0.26, 10, 1, true)` open-ended, `ironTex` with rust bias,
   `side: DoubleSide`. Tipped 30° on x.
3. **Ivy strand** ×2 — one down the chapel west pillar, one down the
   north-east mausoleum corner. `BoxGeometry(0.04, 1.8, 0.04)` color
   `#2a3a2e` with 4 little `BoxGeometry(0.10, 0.04, 0.04)` "leaves"
   randomly offset along it.
4. **Dead-flower wreath** ×3 — on three random decoy graves at local
   `(0, 0.95, 0.10)`. `TorusGeometry(0.12, 0.025, 4, 12)` color `#2a2218`,
   with 6 `SphereGeometry(0.025, 4, 4)` "petals" `#8a7a3a` arrayed around.
5. **Burned-out offering candles** ×2 cluster — beside chapel altar stub
   at `(-10, 0.05, 1.8)`. 4 stub `CylinderGeometry(0.04, 0.05, 0.10, 6)`
   color `#8a7a3a` (bone-yellow wax), no flames. Visually pre-tells the
   candle mechanic.
6. **Fallen leaves scatter** ×30 instances — `InstancedMesh` of
   `CircleGeometry(0.06, 5)`, color `#2a2218`, y between 0.01–0.03, random
   rotation. 1 draw call. Cluster near tree (15) and chapel (10), 5 random.
7. **Mausoleum offerings** ×1 per mausoleum — a `BoxGeometry(0.18, 0.05,
0.12)` "stone offering" `#5a606a` at door base, plus a single
   `SphereGeometry(0.04)` `#8a7a3a` (bone) on top.

Total decorative draw calls: ~6 (lantern, bucket, ivy×2 → batched if same
material, leaves instanced = 1, wreaths × 3 = 3 but shared geo). Stays well
under +4 draw call ceiling if we share materials.

## 6. Lighting palette update

- **Central flickerLight** — color shifts from pure `#b0c8ff` to
  `#c0c0e0` (a hair warmer / less blue). At 5+ candles, when its range
  shrinks, color drifts further toward `#c8b890` (bone-warm) at intensity
  0.6 — a dying-moon hint. Kept subtle.
- **Ambient** — unchanged `#4a5680` for run start; at 5+ candles, lerp
  toward `#3a3a3e` (warmer-neutral as moonlight dies). Color, not just
  intensity.
- **Moonlight** — unchanged.
- **Candle PointLights** — unchanged `#ffb24a`.
- **Per-candle ground decal** (new, optional): under each lit candle add a
  `CircleGeometry(0.6, 12)` `y = 0.04`, `MeshBasicMaterial({ color:
0xff8a3c, transparent: true, opacity: 0.18, fog: false, depthWrite:
false })`. 7 max meshes, BasicMaterial cheap. Makes lit candles paint the
  ground warm — biggest visible color shift.

## 7. New 5-second screenshot (from spawn, looking north)

From the spawn point at `(0, 1.6, 8)`, the flagstone floor is no longer a
single charcoal slab — it shows clusters of dull moss-green dots and
scattered brown leaf shapes, with darker dirt smears tracking from the
graves outward. The two side hedge rows still flank a central nave, but
between the player and the chapel ruin, three crooked graves on the left
lean tipsy, their pale-grey stones streaked with bone-yellow lichen
running down from the tops and a wet-blue stain running vertically. One of
those graves holds a small framed portrait — a sepia-toned face the player
must squint to read at this distance, ringed in pewter, almost
daguerreotype. The chapel ruin's west pillar trails a strand of
desaturated ivy down its stonework. To the right, the mausoleum row's
nearest door shows two rust-orange hinges glinting. Further out, the
hanging tree's trunk now reads as banded bark with a single moss patch
near the base. The first lit candle (somewhere left-middle) casts a
small orange disc on the ground around its grave — a warm pool you can
spot from 14 m. Everything is still cold-dominant, the sky is still
black-violet, the fog still eats the far walls — but every surface now
has color in it. Cold blue-grey wins; rust, lichen, moss, dirt, and one
warm pool give the eye something to land on.

## Mesh / draw call budget check

- Decor props: ~10 meshes new + 1 InstancedMesh (leaves, 30 instances).
- Portraits: 8 planes + 8 frame boxes = 16 meshes.
- Per-candle ground decals: up to 7 planes.
- Cornices on gate pillars: 2 boxes.
- Total new geometry: ~36 meshes + 1 instanced = ~3 new draw calls if
  material-sharing is respected (stone, iron, decor-share).
- Textures: 4 new CanvasTextures (floor, stone, iron, bark) ≈ 1.5 MB GPU
  total. Mobile-safe.

Within the 80-mesh / +4-draw-call ceiling.

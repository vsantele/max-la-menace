# Art direction — "The Seventh Candle"

Companion to [gameplay.md](./gameplay.md). Output of an environment art pass
on 2026-05-15. The implementation should match this — if you deviate, update
this file so future Claude has the right reference.

**Touchstones**

- Caspar David Friedrich — _Cemetery in the Snow / Cemetery Entrance_
  (silhouetted iron gate, bone-white stone, leaden sky).
- Junji Ito monochrome density for the grave fields.
- _Bloodborne_ — Hemwick lantern flames for the candle pinpoints.

## Map layout (top-down, 30 × 30, +z = south where the gate sits)

```
###############X##############
#............T.............#
#..MMMM..............H H H.#
#..MMMM...g....C5....H...g.#
#..MMMM.......S......H.g...#
#........g...........H.....#
#....C1....g....g....HHHH..#
#..g.....g.....T.....g..g..#
#......g....C3....g........#
#.g........g....g....g..C4.#
#..####...........g........#
#..#  #....g....C7....g....#
#..#  ....S....g...........#
#..####.g........g....g....#
#......g....T............g.#
#.g........C6.....g........#
#....g........g........g...#
#..............P...........#
#.....g....g.......g..g....#
#..........C2..............#
#..g..........S....g....g..#
#..............T...........#
#######################X####
```

Legend: `P` spawn (0, 1.6, +8) facing north, `X` gate (south), `g` decoy
grave, `C1..C7` candle grave, `M` mausoleum, `H` hedge, `T` tree, `S`
statue, `#` perimeter wall.

**Candle positions** (XZ, within ±1.5 of the original spec): `C1 (-11,-9)`,
`C2 (3,11)`, `C3 (-2,-7)`, `C4 (12,4)`, `C5 (-6,-12)`, `C6 (-6,6)`,
`C7 (3,1)`.

### Four micro-zones — each with one tall silhouette

1. **Mausoleum Row** (NW, x≈−10, z≈−10) — three stone "buildings".
   Holds C1.
2. **Chapel Ruin** (W-center, x≈−10, z≈0) — broken cruciform footprint.
   Holds C7 inside; C6 outside east.
3. **Hanging Tree** (N-center, x≈0, z≈−12) — tallest object on the map.
   Branches splay over C5 and C3.
4. **Iron Hedge Maze** (NE, x≈10, z≈−8) — blind corners around C4.
   C2 sits exposed on the gate path.

**Sightlines** — spawn sees clean down the central north-south axis (the
"nave") — chapel-ruin gap framing the hanging tree. Blind corners: behind
every mausoleum, inside the chapel ruin, between hedges. Max ambushes from
those four spots.

## Palette

| Hex       | Role                                    | Notes                                                   |
| --------- | --------------------------------------- | ------------------------------------------------------- |
| `#0a0a14` | Sky / fog                               | Black-violet, swallows distant geo. Keep existing.      |
| `#1c2030` | Floor                                   | Darker than current `0x2a2d38`. More contrast vs stone. |
| `#6e7382` | Grave / mausoleum / chapel stone        | Bone-grey, reads at distance.                           |
| `#3a3d4a` | Wrought iron (fence, gate, hedge-frame) | Cold near-black w/ blue cast.                           |
| `#1a2820` | Hedge / dead grass                      | Desaturated green — green should not read as "alive".   |
| `#ffb24a` | Candle flame core                       | The only warm color in the scene.                       |
| `#9fb0ff` | Moonlight                               | Cold rim light. Keep existing.                          |
| `#a0134f` | Dread accent (Max's halo)               | Reserved for the menace. Never appears in environment.  |

**3-hue rule**: cold blue-grey (everything), one warm orange (candles), one
wound-red (Max). Three colors = readable.

## Lighting plan

- **Ambient** `0x4a5680` — animate `0.85 → 0.55` over 7 candles.
- **Moonlight** directional, position `(-6, 12, 4)`. Intensity `1.1 → 0.45`,
  color shift toward colder `0x7a8aff` as it dims.
- **Central flickerLight** `0xb0c8ff`, intensity `2.2`, range `30 → 18`
  after candle 5; disabled after candle 7.
- **Each lit candle** — `PointLight(0xffb24a, 1.6, 4.5)` at `y = 1.05`,
  flicker `1.4 + sin(t*17 + i)*0.25 + rand()*0.15`. No shadows.
- **Gate spotlight** — `SpotLight(0x9fb0ff, 0, 18, π/5, 0.6)` at
  `(0, 6, 16)` aimed at `(0, 0, 14.8)`. Intensity `0 → 3.0` over 1.2 s
  when candle 7 fires. Color → `0xeaf0ff` during opening.

Nothing fills the void as moonlight dies — that's the horror. The candles
compensate locally, so the player feels safer near candles and exposed in
moonlight-lost dead zones between zones.

## Landmarks & set dressing (primitive specs)

**Chapel Ruin** (anchor x=−10, z=0). Four broken `BoxGeometry` walls:

- North wall `(4, 2.8, 0.4)` at `(-10, 1.4, -2)`.
- East wall `(0.4, 1.6, 4)` at `(-8, 0.8, 0)`, top jagged via two stacked
  boxes of differing heights.
- South wall `(4, 0.6, 0.4)` — stub.
- West wall `(0.4, 3.2, 4)` at `(-12, 1.6, 0)` — tallest, hollow archway
  via two narrow pillars + lintel.
- Material `MeshStandardMaterial({ color: 0x6e7382, roughness: 1 })`.

**Hanging Tree** at `(0, -12)`:

- Trunk `CylinderGeometry(0.35, 0.55, 5, 8)` at `y=2.5`, color `0x1a1410`.
- 5 branches `CylinderGeometry(0.06, 0.12, 3, 5)`, rotated 60–80° from
  vertical, all at `y ≈ 4.2`. One horizontal branch holds a small noose hint
  — a `(0.04, 0.7, 0.04)` box hanging from its tip.

**Mausoleum Row** (NW, x=−10..−7, z=−10..−7) — 3 buildings, each:

- Base `BoxGeometry(2.2, 2.4, 2.6)`
- Roof `BoxGeometry(2.4, 0.3, 2.8)` on top
- Door recess `BoxGeometry(0.8, 1.6, 0.3)` material `0x1a1c24`.
- Spaced 0.8 m apart along z.

**Iron fence perimeter** (decorative, keep existing box walls for collision):

- Behind each wall, `BoxGeometry(0.06, 2.4, 0.06)` spikes every 0.5 m via
  `InstancedMesh` (60 per wall × 4 walls = 240 instances, 4 draw calls).
- Material `0x3a3d4a`, metalness 0.6, roughness 0.4.
- Top cap: one `BoxGeometry(30, 0.12, 0.08)` horizontal bar at `y = 2.3`.

**The Gate** (south wall center, `x=0, z=14.8`):

- Two pillars `BoxGeometry(0.6, 4.2, 0.6)` at `x=±2.3, y=2.1`, color `0x6e7382`.
- Two iron leaves `BoxGeometry(2.2, 3.6, 0.08)` each, pivoted on the outer
  edge via a Group at the pillar's inner face. Material `0x3a3d4a`,
  metalness 0.7. 4 cross-bars per leaf via thin boxes.
- Arch: `TorusGeometry(2.4, 0.08, 6, 16, Math.PI)` rotated vertical.
- Opening: leaves rotate `y` `0 → ∓π/2` over 1.8 s with `easeOutCubic`,
  pillars wobble `±0.02` sin for 0.4 s, 30 `Points` particles rise.

**Crooked crosses (×12)** — Group with vertical `CylinderGeometry(0.04, 0.04,
1.0)` + cross-arm `BoxGeometry(0.5, 0.06, 0.06)`. Rotate group `(rand-0.5)*0.4`
on z. Scattered among decoys.

**Broken graves (8 of 25 decoys)** — tilt existing grave `rotation.x = ±0.3

- rand\*0.2`, lower `y` to 0.35.

**Low fog patches** — 3× `PlaneGeometry(8, 8)` flat at `y=0.05`,
`MeshBasicMaterial({ color: 0xb0c8ff, transparent: true, opacity: 0.06,
fog: false, depthWrite: false })`. Animate UV offset `0.003/frame`.

**Candles (per candle grave)**:

- Base `CylinderGeometry(0.06, 0.07, 0.35, 8)` at grave-top `y=1.35`, color
  `0x141016`.
- 3 "drip" boxes `(0.02, 0.08, 0.02)` welded asymmetrically.
- Wick `CylinderGeometry(0.005, 0.005, 0.04)` at top, color `0x000000`.
- Flame (when lit) `SphereGeometry(0.06, 6, 6)` with
  `MeshBasicMaterial({ color: 0xffd084, fog: false })`, scale `(1, 1.6, 1)`,
  animated `scale.y = 1.5 + sin(t*22)*0.15`. Plus the orange point light.

## Grave nameplate style

- **CanvasTexture** 256 × 128 px. Transparent background. Border 2 px
  `#2a2d38`.
- Text `bold 26px "IM Fell English SC", "Times New Roman", serif`, fill
  `#1a1820`, 1 px black shadow. Two lines: name (bigger), `"1842 — 1899"`
  date (16 px).
- `texture.colorSpace = SRGBColorSpace`, `texture.anisotropy = 8`.
- **Plane** `PlaneGeometry(0.42, 0.21)` at `(0, 0.85, 0.10)` local to grave
  (front face). `material.transparent = true, depthWrite: false`.
- **Readable at 1.5 m, illegible at 8 m** — by design.

## Visual feedback for game state

**Lit vs unlit at 10 m**

- Unlit: black wax silhouette on grey stone — almost invisible.
- Lit: bright orange flame sphere (BasicMaterial ignores fog) + warm 4.5 m
  point-light pool. From 10 m: a single warm dot in a cold field.

**Gate opening** (when 7/7 lit and player approaches `z > 10`)

- 0.0 s — camera shake ±0.04 on y for 0.4 s.
- 0.0–0.4 s — pillars wobble, dust particles spawn.
- 0.4–1.8 s — leaves swing outward, spotlight ramps 0 → 3.0.
- 1.8 s+ — spotlight stays on, dawn tint
  `scene.fog.color.lerp(0x2a2a4a)` bleeds in over 4 s.

**Phase shifts**

- **Setup** (0–1 candles) — current look. Fog far 38, moonlight 1.1,
  ambient 0.85.
- **Hunt** (2–4) — fog far → 32, ambient → 0.7, moonlight → 0.85.
- **Collapse** (5–6, flanker spawns) — fog far → 24, fog color shifts
  toward `0x140a0a` (8 % red-black bias), moonlight → 0.55, central flicker
  range cut to 18. Add low-y `PlaneGeometry(30, 30)` "blood mist" at
  `y=0.04`, opacity 0.04, color `0x3a0a14`.
- **Exit** (all 7) — fog far snaps back to 30 (dawn coming), gate spotlight
  engages, background lerps to `0x1a1a2e` over 3 s. Faint vertical "godray"
  cone at the gate: `CylinderGeometry(2, 2, 8, 12, 1, true)` open-ended,
  `MeshBasicMaterial({ color: 0xeaf0ff, transparent: true, opacity: 0.08,
side: DoubleSide, fog: false })`.

## 5-second screenshot

**Looking south from spawn (toward the gate)** — a long flagstone path
between two ragged hedge rows. The iron fence runs east-west, spiked
silhouettes biting up against a black-violet sky. Dead-center: the **gate**
— two pale stone pillars, a half-circle iron arch, two cross-barred leaves
locked shut, deeper black behind. Three crooked crosses lean inward along
the path like spectators. Low pale-blue fog hugs the ground around the
player's boots. Silent moonlight: every stone, hedge, and fence spike is
rim-lit cold steel-blue from the upper-left, floor a charcoal void. No
warm color anywhere. Two tones — bone and ink.

**Looking north (pivot 180°)** — the path continues into a deeper graveyard
that gets murkier with every meter. The chapel ruin's broken cruciform wall
rises on the left, arched gap framing stones beyond. To the right, the boxy
stack of three mausoleums hunches in the haze, recessed doors reading as
empty eye-sockets. Centered at the back: **the hanging tree**, bare
cylindrical trunk, five splayed branches, one horizontal branch with a
small rope-like thing dangling motionless. A faint warm pinprick (the first
candle) glows somewhere left-middle at ground level — the only orange in
180 degrees. Beyond 24 m the fog eats everything.

## Mesh budget

~200 fence spikes (instanced, 4 draw calls) + 12 mausoleum parts + 11
chapel parts + 7 tree parts + 12 crooked crosses + 7 candles × 5 parts ≈ 80
unique meshes. Under 200 draw calls with instancing. Mobile-safe: no extra
shadow casters beyond moonlight, particles capped at 30, no
post-processing.

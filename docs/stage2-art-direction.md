# Stage 2 art direction — "The House of Many Maxes"

Companion to [stage2-gameplay.md](./stage2-gameplay.md) and
[art-direction.md](./art-direction.md). Output of a stage-2 environment pass on
2026-05-15. If the implementation deviates, update this file.

**Touchstones** — P.T.'s L-corridor (paintings as gauntlet), RE1 mansion
entrance hall (warm wood + tall portraits), _Sharp Objects_ Victorian dread
(florals turned sickly).

## Palette (12 hex)

Stage 1 was 3 hues. Stage 2 is 12 — still cold and desaturated overall, with
warm pinpricks. Every value below intentionally muddy: nothing saturates above
S=55.

| Hex       | Role                                | Notes                                                                       |
| --------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `#0a0a14` | Sky beyond windows / dead mirror    | Carried from stage 1. The "outside" still reads as void.                    |
| `#2d2a26` | Floorboard dark stain (Hall, Study) | Black-brown oak. Receives warm light richly.                                |
| `#5a4632` | Mid wood (furniture, doors)         | Walnut. Wardrobes, doors, picture frames.                                   |
| `#8b6a3f` | Light wood / parquet (Parlor)       | Honeyed oak. Reads warm under lamps.                                        |
| `#a9a190` | Old paper / wallpaper base (Study)  | Yellowed cream. Foxing-prone.                                               |
| `#6e5a52` | Parlor wallpaper base               | Dusty mauve-rose, faded.                                                    |
| `#3c4a3e` | Curtain green / Kitchen wainscot    | Bottle-green, mildewed.                                                     |
| `#5c1d22` | Burgundy damask accent / curtains   | Drained blood color — close to but distinct from Max-red.                   |
| `#b89968` | Brass / candle warmth               | Handles, hatch hinges, lamp bases. Carried-forward "warm" from stage 1.     |
| `#d9d4c8` | China porcelain (tub, sink, plates) | Cold off-white. Reads dead under blue kitchen light.                        |
| `#7a8aff` | Cold ceiling light (Kitchen)        | Carried from stage 1 moonlight. Now it's the buzzy bulb.                    |
| `#a0134f` | Max-red halo                        | RESERVED. Never on wallpaper, never on curtains. Hatch lock rim, halo only. |

3-tone wood rule: floor (dark) → furniture (mid) → frames/doors (mid, same SKU as furniture for batching).

## Per-room art bible

Coordinates per the floor plan (22×22 grid centered on origin; Hall is the
entry strip at z≈−5..0, Parlor north at z≈4..9, Bathroom south at z≈−10..−7).

### Hallway (entry, 8 × 4 m, z = −5..0)

- **Floor**: dark oak planks. `CanvasTexture` 512×512. Base `#2d2a26`; draw 8
  horizontal plank rows, each tinted ±6 % brightness for variation; 1 px black
  gap between planks; sparse 2–3 elliptical "stain" blobs of `#1a1612` alpha
  0.5; faint noise overlay. Repeat 4×4 over the floor plane.
- **Wallpaper**: muddy striped damask (see canvas recipe below, _Hallway_).
- **Props (5)**:
  1. Long runner rug — `PlaneGeometry(1.4, 7.0)` at `y=0.01`, color `#5c1d22`
     with woven CanvasTexture (diamond pattern, dull gold thread `#b89968`).
  2. Console table — `BoxGeometry(1.6, 0.05, 0.4)` top at `y=0.85`; 4 turned
     legs `CylinderGeometry(0.04, 0.04, 0.85)` mid-wood `#5a4632`.
  3. Brass candelabra on console — 3 stick candles, `CylinderGeometry`, with
     a tiny `PointLight(0xffb24a, 0.4, 2.5)` at `y=1.1`. Counts as one
     dynamic light (the Hall's only practical).
  4. Coat tree — `CylinderGeometry(0.04, 0.05, 1.9)` + four 0.25 m pegs at
     top. A single dark coat (drape via `BoxGeometry(0.55, 0.9, 0.15)`).
  5. Floor clock stopped at 3:00 — `BoxGeometry(0.45, 1.95, 0.25)` mid-wood;
     `CircleGeometry(0.16)` face CanvasTexture with painted hands at 3:00.
- **Story beat**: the clock face. At T=2:55 the second-hand sprite flickers,
  syncing the 3:00 painting flash.

### Parlor (north, 10 × 5 m, z = 4..9)

- **Floor**: honey parquet. `CanvasTexture` 512×512. Base `#8b6a3f`. Draw
  herringbone: alternating short rectangles 64×16 px at +45° / −45°, each
  ±5 % brightness, 1 px joint lines `#3a2d1c`. Light scuff streaks via 3
  low-alpha bright slashes.
- **Wallpaper**: rose-burgundy damask (recipe below, _Parlor_).
- **Props (5)**:
  1. Stone hearth — stack of 3 `BoxGeometry` (mantel `1.6×0.15×0.45`,
     surround `1.4×1.0×0.55`, hearthstone `1.8×0.08×0.6`), grey `#6e7382`
     carried from stage 1. Inside firebox: 6 small "ember" boxes
     `(0.08,0.06,0.08)` color `#3a1208`. **Ember light**:
     `PointLight(0xff4422, 0.5, 3.5)`, flickering `0.4 + sin(t*9)*0.1`.
  2. Wingback chair ×2 — `BoxGeometry(0.7, 0.5, 0.7)` seat + tall
     `BoxGeometry(0.7, 1.0, 0.15)` back, burgundy `#5c1d22`. Slightly
     askew (rot.y ±0.2). One has a draped throw `PlaneGeometry` curling
     over the arm.
  3. Tea table — `CylinderGeometry(0.45, 0.45, 0.05)` top at y=0.6 on a
     turned column leg. On top: porcelain teacup `CylinderGeometry(0.04,
0.05, 0.04)` + saucer (china `#d9d4c8`), and a salt-vial **buff**.
  4. Phonograph — `BoxGeometry(0.4, 0.15, 0.4)` mid-wood base, vertical
     brass horn (`CylinderGeometry(0.05, 0.25, 0.5)` flared) tilted 25°.
     The record (`CircleGeometry(0.15)` black) sits half on the platter.
  5. Floor lamp — tripod `CylinderGeometry` legs + cream fabric shade
     `CylinderGeometry(0.18, 0.25, 0.3)` MeshBasicMaterial `#b89968` so it
     glows even when its `PointLight(0xffd9a8, 0.6, 4)` is dim.
- **Story beat**: the phonograph + the second untouched teacup across the
  table. Someone was here a minute ago. The needle still hisses (audio loop
  faintly in this room only).

### Study (west of Parlor, 6 × 5 m, z = 4..9, x = −8..−2)

- **Floor**: same dark oak planks as the Hall (shared material — saves a
  texture).
- **Wallpaper**: vertical pinstripe with foxing (recipe below, _Study_).
- **Props (5)**:
  1. Rolltop desk — 3 stacked boxes: base `1.4×0.78×0.65`, top hutch
     `1.4×0.5×0.3`, curved roll `BoxGeometry(1.35, 0.45, 0.05)` tilted 20°.
     On the desk surface: a guttered candle (mid-wood holder + black stub),
     an open `BoxGeometry(0.2, 0.01, 0.3)` "book" with CanvasTexture pages
     showing handwritten gibberish.
  2. Bookshelves — `BoxGeometry(1.8, 2.4, 0.3)` mid-wood, with an
     **InstancedMesh** of 40 book spines per shelf × 4 shelves = 160 boxes
     `(0.04, 0.22, 0.13)`, colors sampled from `[#5c1d22, #3c4a3e, #2d2a26,
#5a4632, #a9a190]`. 2 draw calls.
  3. Globe on a stand — `SphereGeometry(0.2)` mid-wood ring + sphere with a
     simple 2-color land/sea CanvasTexture.
  4. Wardrobe (hide spot) — see _Wardrobes_ section. Backed into NE corner.
  5. Buff pickup: laudanum bottle on the desk (see _Buffs_).
- **Story beat**: the open ledger. Every entry on the visible page is the
  same name in a different hand. (Render via CanvasTexture: 12 lines, all
  "Max", each scrawled with a different jitter/rotation.)
- **Practical light**: green-shaded `PointLight(0x88ff99, 0.5, 3)` at desk
  height. Shade box uses `MeshBasicMaterial({ color: 0x4a7a55 })` so it
  glows.

### Kitchen (east of Parlor, 6 × 5 m, x = 2..8, z = 4..9)

- **Floor**: cracked checker tile. `CanvasTexture` 512×512. Draw 8×8 grid of
  alternating `#d9d4c8` / `#6e5a52` tiles; add 1–2 px dark grout lines; in 6
  random tiles draw a thin black crack polyline + a brown stain.
- **Wallpaper**: tongue-and-groove green wainscot lower half (`#3c4a3e`),
  cream plaster upper half (`#a9a190`). Implemented as two
  `BoxGeometry` planks per wall section, no CanvasTexture needed — saves
  a texture slot.
- **Props (5)**:
  1. Long farmhouse table — `BoxGeometry(2.4, 0.05, 0.9)` top at y=0.8 with
     4 leg boxes. **Brass key** (50 % spawn) sits dead center.
  2. Wood-burning stove — `BoxGeometry(0.7, 0.9, 0.6)` near-black `#1a1612`,
     plus a `CylinderGeometry(0.1, 0.1, 1.5)` chimney pipe rising to
     ceiling. A single ember dot inside (no light — saves budget).
  3. Hanging copper pots — **InstancedMesh** of 6 hemispheres
     `SphereGeometry(0.14, 8, 6, 0, Math.PI*2, 0, Math.PI/2)` brass
     `#b89968`, suspended from a `BoxGeometry(1.5, 0.04, 0.04)` rail under
     the ceiling.
  4. Sink + drying rack — `BoxGeometry(0.6, 0.15, 0.5)` china, with 3
     stacked dish `CircleGeometry(0.12)` plates on a wire rack
     (`BoxGeometry(0.4, 0.3, 0.05)` lattice via CanvasTexture).
  5. Wardrobe (hide spot) — backed into SW corner.
- **Story beat**: a single bowl on the table with a spoon still upright in
  it (`CylinderGeometry(0.005, 0.005, 0.12)` brass, leaning). The meal is
  half-eaten. A buzzing fly sprite (`Sprite` 0.04 m, dark, jittering) hovers
  over it — costs 1 sprite slot, no light.
- **Practical light**: single dangling bulb `PointLight(0xb0c8ff, 0.6, 5)`
  at `y=2.4`, intensity jittered ±0.05 with a 60 Hz buzz audio cue.

### Bathroom (south of Hall, 5 × 4 m, z = −10..−7)

- **Floor**: small white-and-black hex tiles. CanvasTexture 256×256. Draw a
  hex grid (~24 px hexes); 80 % `#d9d4c8`, 20 % `#0a0a14`. Add 2 dark
  hairline cracks.
- **Wallpaper**: subway tile upper, beadboard lower. Two flat box layers per
  wall section, materials only. White-grout `#d9d4c8` brick CanvasTexture
  for the tile band.
- **Props (5)**:
  1. Clawfoot tub — long `BoxGeometry(1.4, 0.5, 0.7)` china + 4 short
     `CylinderGeometry(0.06, 0.08, 0.12)` brass feet. Inside: a darker
     `BoxGeometry(1.3, 0.02, 0.6)` "water" plane in `#1a1a22` (looks like
     stagnant water). NOT reflective.
  2. Pedestal sink — `CylinderGeometry(0.12, 0.18, 0.7)` china column +
     `BoxGeometry(0.5, 0.1, 0.4)` basin on top. **Polaroid buff** sits at
     the lip.
  3. Dead mirror — `PlaneGeometry(0.6, 0.8)` with
     `MeshBasicMaterial({ color: 0x0a0a14 })`. Mounted at y=1.7. No
     reflection. A thin brass `BoxGeometry` frame.
  4. Pull-chain toilet — `BoxGeometry(0.4, 0.35, 0.55)` china bowl +
     vertical `CylinderGeometry(0.08, 0.1, 0.4)` tank up at y=1.8,
     connected by a thin pipe. Brass chain hint via a single thin
     vertical box.
  5. Wall sconce — `CylinderGeometry(0.06, 0.1, 0.15)` brass
     `MeshBasicMaterial` glowing, with `PointLight(0xffeedd, 0.4, 3)` at
     y=1.9. The dim practical.
- **Story beat**: one painting on the bathroom wall is rotated 180°
  (per gameplay doc). It's the only painting where Max's face is
  _upside-down_ — the tell.

## Paintings — the central decoration

### Frame style variations (3 SKUs)

Cycle deterministically per painting index so frame style is stable across
respawns. All frames share one mid-wood material `frameMaterial` (`#5a4632`)
to keep dispose lists short.

1. **Rect-classic** (50 %) — `PlaneGeometry(0.55, 0.75)` portrait or
   `(0.75, 0.55)` landscape. Frame `BoxGeometry(W+0.06, H+0.06, 0.03)`
   behind. Mat (visible border around the image): inner `PlaneGeometry`
   at 0.92× the image size, color `#a9a190` (old paper mat).
2. **Oval-inscribed** (30 %) — same outer frame box; the image plane uses
   a CanvasTexture pre-baked with an oval alpha mask (paint the
   `DECORATION_IMAGE` into a 512×512 canvas, then `ctx.globalCompositeOperation
= 'destination-in'` an ellipse). Material `transparent: true`.
3. **Tall-narrow** (20 %) — `PlaneGeometry(0.4, 0.85)`, frame slightly
   chunkier (`BoxGeometry(W+0.08, H+0.08, 0.04)`), used for the
   "ancestral" full-body Victorian portraits in the Hall.

Every painting gets a small random tilt `rotation.z = (rand−0.5)*0.06` and
a y-jitter of ±0.04 — no two paintings level. Mat color varies between
`#a9a190`, `#6e5a52`, and `#3c4a3e` (a darker velvet mat).

### Per-room placement (24 paintings total)

- **Hall**: 8 paintings — 4 per long wall, evenly spaced along z =
  [−4, −2.5, −1, 0.5], at `y = 1.55`. Mix all 3 styles. The center pair
  (z = −2.5 and z = −1 on opposite walls) are larger Rect-classic — these
  are the eye-candidates for the **Max-flash** swap.
- **Parlor**: 4 paintings — all above the mantel, in a vertical column of
  2 stacked rows × 2 columns, y = [1.7, 2.3]. Above the laudanum's
  former Parlor mantel slot.
- **Study**: 4 paintings — 3 above the bookshelf at y=2.4, 1 (Tall-narrow)
  next to the wardrobe, **guaranteed above the laudanum bottle**.
- **Kitchen**: 3 paintings — 1 above the sink, 1 above the stove
  (slightly scorched mat, color `#3c4a3e`), 1 above the **brass key**'s
  table position so the player meets Max's eyes while grabbing the key.
- **Bathroom**: 3 paintings — 1 above the sink (above the polaroid
  buff), 1 above the tub, 1 above the toilet **rotated 180°** (the tell).
- **Spare**: 2 floor-leaning paintings against the Study wall, frame
  bottom at y=0.05, leaning at rot.x = 0.12 — props the player thinks
  about picking up but cannot.

### Eye-tracking gimmick

Per gameplay doc: each painting carries a tiny child plane
`PlaneGeometry(0.05, 0.05)` 0.02 m in front of the image, with
`MeshBasicMaterial({ map: pupilCanvas, transparent: true })`. Each frame,
its local y is set to `clamp((cameraY − paintingY) * 0.06, −0.06, 0.06)`.
One shared `pupilCanvas` (a black ellipse on transparent) keeps it cheap.
Skip on mobile if perf dips — the trick still reads with just textures.

### The Max-flash painting (3:00)

- Same geometry/frame as a normal Rect-classic in the **Hall**, centered
  at `z = −2.0` on the east wall. By default shows
  `getDecorationImageUrl(7)` rendered through a sepia filter (CanvasTexture
  with `ctx.filter = 'sepia(0.85) contrast(0.9) brightness(0.85)'`).
- At T = 3:00, swap method: **texture swap on the existing
  `MeshBasicMaterial`**. Keep a second `THREE.Texture` (the monster image
  pre-loaded at stage start via `getRandomMonsterImageUrl`) cached on the
  painting object as `painting.userData.flashTex`. On trigger:
  `mat.map = painting.userData.flashTex; mat.needsUpdate = true; mat.color.set(0xffffff);`
  and add a 0.04 m × 0.04 m random offset to `frame.position` for 0.6 s
  (subtle shake), with `mat.opacity` flickering 0.7→1 at 18 Hz for the
  first 0.15 s. After 0.6 s, swap back.
- Audio: trigger `playPaintingJumpscare()`.

## Wardrobes (4 hide spots)

Visual spec — one shared geometry & material set, batchable.

- **Body** — `BoxGeometry(1.2, 2.1, 0.8)` mid-wood `#5a4632`. Position so
  back face is flush with the wall.
- **Door** — `BoxGeometry(1.1, 1.95, 0.04)` mid-wood, slightly inset
  (z + 0.41 local). Two doors (split down the middle) for the Hall pair;
  single door for Study and Kitchen.
- **Door panel insets** — two `BoxGeometry(0.4, 0.6, 0.01)` recessed
  panels per door, color `#3a2d1c` (slightly darker), to read as
  carpentry detail at 2 m.
- **Brass handle** — `CylinderGeometry(0.02, 0.02, 0.06)` horizontal +
  `SphereGeometry(0.025)` knob, brass `#b89968`,
  `MeshStandardMaterial({ metalness: 0.8, roughness: 0.3 })`. The single
  glint a player can find in a dark room.
- **Skirt molding** — `BoxGeometry(1.25, 0.08, 0.82)` at the base, darker
  wood — sells "this is furniture not a box".

Positions:

- Hall NW corner `(−3.0, 1.05, −4.4)`, door faces +z.
- Hall SE corner `( 3.0, 1.05, −0.6)`, door faces −z.
- Study NE corner `(−2.8, 1.05,  8.4)`, door faces −z (player can hide
  while watching the doorway).
- Kitchen SW corner `( 2.4, 1.05,  4.6)`, door faces +x.

When the player hides: tween the door box's local `rotation.y` from 0 →
−π/2.4 over 0.4 s, then back to 0 once camera is "inside".

## Cellar hatch (the exit)

- **Location**: floor of the Hall, `(0, 0.04, −2.5)` (matches gameplay
  doc's `(0, 0, 10.5)` — note the doc uses a different origin; in the
  22×22 grid centered on origin, the exit is in the Hall floor, not the
  parlor side).
- **Geometry**: `BoxGeometry(1.4, 0.08, 1.4)` mid-wood, sitting 0.04 m
  above the planks. Surface detail via a CanvasTexture: 4 plank stripes,
  4 brass nailhead dots at corners.
- **Brass ring handle** — `TorusGeometry(0.08, 0.015, 6, 16)` brass,
  mounted flat in the center, slightly raised.
- **Locked rim** — a thin `BoxGeometry(1.42, 0.02, 1.42)` frame around the
  hatch with `MeshBasicMaterial({ color: 0xa0134f })` and `opacity: 0.6`
  pulsing while locked. This is the Max-red accent — it tells the player
  "exit" without spelling it out.
- **On key pickup**: lerp the rim color to `#2da34f` (green) over 0.8 s.
- **On use (1.5 s hold + key)**: rotate the hatch box around its hinge
  edge (back edge) from `rotation.x = 0 → −1.4` over 1.2 s with
  easeOutCubic; spawn 12 dust particles (`Points`, color `#a9a190`,
  rising); camera tweens down 1.2 m as per gameplay doc.

## The 3 buff pickups

Each buff has a small `PointLight` to draw the eye in dim rooms — these
count toward the 8-light budget; see _Lighting plan_.

1. **Salt circle vial** (×2 — Parlor tea table, Kitchen sink edge).
   - Saucer: `CylinderGeometry(0.06, 0.06, 0.01)` china `#d9d4c8`.
   - Vial: `SphereGeometry(0.045)` china top + a tiny cork
     `CylinderGeometry(0.012, 0.012, 0.025)`.
   - Glow: `PointLight(0xfff4d4, 0.25, 1.2)` at y=0.95. Warm sparkle.
   - Idle anim: rotation.y += 0.6 \* dt.
2. **Laudanum bottle** (×1 — Study desk).
   - Body: `CylinderGeometry(0.07, 0.08, 0.22)` deep-brown glass `#3a1c14`
     with `transparent: true, opacity: 0.85`.
   - Cap: thin `CylinderGeometry(0.05, 0.05, 0.03)` `#5c1d22` (dried red).
   - Label: small `PlaneGeometry(0.06, 0.08)` CanvasTexture with apothecary
     cross + "LAUDANUM" in `#1a1612` serif.
   - Glow: `PointLight(0x5c1d22, 0.2, 1.0)` — sickly red, makes the bottle
     visible without spoiling Max-red.
3. **Polaroid of yourself** (×1 — Bathroom sink).
   - Flat `PlaneGeometry(0.15, 0.10)` CanvasTexture: white border (`#d9d4c8`)
     with an interior 0.10×0.07 dark image of an indistinct face that
     resembles the player's silhouette (just a vague oval head + shoulders
     in `#1a1612` on `#3a2d2a`).
   - Tilted on the sink at rot.z = 0.4.
   - Glow: `PointLight(0xffeedd, 0.18, 0.8)` — same warm as the sconce, so
     it integrates rather than screams "video game pickup".

## Lighting plan (≤ 8 dynamic)

| #   | Light                              | Room     | Color     | Intensity   | Range |
| --- | ---------------------------------- | -------- | --------- | ----------- | ----- |
| 1   | Ambient                            | global   | `#1a1c28` | 0.35        | —     |
| 2   | Hall candelabra `PointLight`       | Hall     | `#ffb24a` | 0.4 flicker | 2.5   |
| 3   | Parlor floor-lamp `PointLight`     | Parlor   | `#ffd9a8` | 0.6         | 4.0   |
| 4   | Parlor hearth-ember `PointLight`   | Parlor   | `#ff4422` | 0.4 flicker | 3.5   |
| 5   | Study desk-lamp `PointLight`       | Study    | `#88ff99` | 0.5         | 3.0   |
| 6   | Kitchen dangling-bulb `PointLight` | Kitchen  | `#b0c8ff` | 0.6 buzz    | 5.0   |
| 7   | Bathroom sconce `PointLight`       | Bathroom | `#ffeedd` | 0.4         | 3.0   |
| 8   | Buff glow (shared, repositioned)   | wherever | varies    | 0.18–0.25   | 1.2   |

No `DirectionalLight` (no moonlight indoors). Buff glows share a single
`PointLight` instance reparented when the player nears (saves draw cost).
The hatch lock rim and shade boxes use `MeshBasicMaterial` for their
emissive look — not lights. House should feel darker than stage 1's moonlit
exterior but with more warm color _clusters_ per room.

## CanvasTexture wallpaper recipes (pseudo-code)

### Parlor — rose-burgundy damask (512 × 512, tiles 4× per wall)

```js
ctx.fillStyle = "#6e5a52";
ctx.fillRect(0, 0, 512, 512);
// faint vertical stripes
for (let x = 0; x < 512; x += 32) {
  ctx.fillStyle = "rgba(58, 36, 38, 0.18)";
  ctx.fillRect(x, 0, 1, 512);
}
// damask diamonds: 4-col × 4-row, center each diamond's quatrefoil
ctx.fillStyle = "#5c1d22";
for (let row = 0; row < 4; row += 1) {
  for (let col = 0; col < 4; col += 1) {
    const cx = col * 128 + (row % 2) * 64;
    const cy = row * 128;
    // quatrefoil = 4 circles + center diamond
    for (const [dx, dy] of [
      [0, -22],
      [0, 22],
      [-22, 0],
      [22, 0],
    ]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 14, cy);
    ctx.lineTo(cx, cy + 14);
    ctx.lineTo(cx - 14, cy);
    ctx.closePath();
    ctx.fill();
  }
}
// water-stain blotches near the floor
ctx.fillStyle = "rgba(20, 12, 16, 0.35)";
for (let i = 0; i < 6; i += 1) {
  const x = Math.random() * 512,
    y = 380 + Math.random() * 120;
  ctx.beginPath();
  ctx.ellipse(x, y, 30 + Math.random() * 40, 8 + Math.random() * 16, 0, 0, Math.PI * 2);
  ctx.fill();
}
```

### Study — pinstripe with foxing (512 × 512)

```js
ctx.fillStyle = "#a9a190";
ctx.fillRect(0, 0, 512, 512);
// vertical pinstripe every 12 px
ctx.fillStyle = "#6e5a4e";
for (let x = 8; x < 512; x += 12) ctx.fillRect(x, 0, 1, 512);
// foxing — sepia-brown blooms
for (let i = 0; i < 30; i += 1) {
  const x = Math.random() * 512,
    y = Math.random() * 512;
  const r = 4 + Math.random() * 14;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, "rgba(110, 60, 30, 0.4)");
  grad.addColorStop(1, "rgba(110, 60, 30, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
// torn lower corner (only on bottom edge — UV map walls so this aligns)
ctx.fillStyle = "#5a4632";
ctx.beginPath();
ctx.moveTo(0, 460);
ctx.lineTo(80, 480);
ctx.lineTo(40, 500);
ctx.lineTo(0, 512);
ctx.closePath();
ctx.fill();
```

### Hallway — drab damask (variant of Parlor's, base `#5a4632`, accent `#3a2d1c`, quatrefoils duller, no water stains). Reuses the Parlor function with a palette parameter.

## 5-second screenshot

You climb up out of the cellar door and the hatch closes behind you with a
soft thud. You are at the south end of a narrow oak-floored hallway.
**Eight portraits** stagger down two walls — Victorian sitters in oval and
rectangular frames, mat-paper yellowed, every face the same face — _his_
face, in fifteen different lighting setups, at fifteen different ages.
A single brass candelabra burns at the far end on a console table, its
warm orange pool barely reaching the picture rails. The wallpaper is a
muddy ochre damask with a hairline tear near the wainscot. A burgundy runner
rug bleeds down the corridor toward your boots. To your right, a tall
**floor clock** stopped at _3:00_, brass pendulum still. To your left, the
faint glow of a green desk lamp leaks from the **Study** doorway; ahead and
north, embers pulse orange behind the **Parlor** door, and you can hear a
phonograph hissing through it. A square of paler wood in the floor at your
feet — the **hatch** — rims faintly red. The house smells like wet wool
and old tea, even through the screen.

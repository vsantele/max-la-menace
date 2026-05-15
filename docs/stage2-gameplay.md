# Stage 2 gameplay — "The House of Many Maxes"

Output of a stage-2 design pass on 2026-05-15. Companion to
[gameplay.md](./gameplay.md) (stage 1) and [art-direction.md](./art-direction.md).
Keep numbers in sync with `src/main.ts`.

## Concept

The gate slammed shut behind you. Across a strip of dead grass crouches a
narrow two-up-two-down farmhouse — your grandmother's, you think; you are
no longer sure. Every window is lit warm from inside. Inside, Max is
already home: he is on the wall, in every frame, in every era of a family
that does not exist. One of those Maxes is not a painting. You need to
find a **brass key**, hidden in one of four rooms, and unlock the cellar
hatch — the only way out. The mood pivots from "open dread" to "claustrophobic
hide-and-seek": tight corridors, sightline games, doors as tools.

## Win condition

Pick up the **brass key** (one of three random spawn points, see floor plan),
return to the **cellar hatch** at world `(0, 0, 10.5)`, and stand within
1.4 m of it for **1.5 continuous seconds** while holding the key.

## Lose conditions

- The Max sprite intersects the camera within 1.1 m.
- Breath meter hits 0 _while hiding_ (Max drags you out of the wardrobe).
- Soft timer: at **5:00** elapsed, Max ignores closed doors and gains +35 %
  speed — a forced ending.

## Core mechanic loop

Moment-to-moment:

1. Walk slow corridors, scan paintings (every painting has Max's face — the
   _primary photo_, image index 0). Listen for footsteps panning L/R.
2. Open or close a **door** (`E` / action button) — closed doors block Max
   for **2.2 s**, then he shoulders through them with a wood-crack sound.
3. Find one of three **buff pickups** scattered across the rooms; consume on
   pickup (no inventory).
4. **Escape mechanic — Wardrobes (×4).** Each wardrobe is a closed
   `BoxGeometry(1.2, 2.1, 0.8)` with a trigger zone of radius 0.9 m. Walk
   into the zone + press action → camera tweens inside (0.4 s), screen
   letterboxes 12 %, audio low-passes at 600 Hz. Max **loses line of sight
   after 1.2 s**; if he hasn't seen you enter, he investigates the last
   known position for **6 s**, then resumes patrol. While hidden, a thin
   **breath bar** drains: 12 s max, 8 s typical safe duration. Exit with
   action; breath refills at 1.5×real-time while standing outside.
5. Find the **brass key** (golden cylinder on a table), then sprint for the
   cellar hatch in the hallway.

Single-button on mobile: same **action** button does "open/close door",
"hide/unhide", "pick up buff", "pick up key", "use hatch" — context is the
nearest interactable within 1.4 m.

## Buffs (3 types, 4 pickups total)

All buffs auto-consume on touch (radius 0.7 m) with a soft chime.

1. **Salt circle vial** (×2 spawns) — small white `SphereGeometry(0.08)` on
   a saucer. Effect: next time Max would catch you, he is pushed back 5 m
   and stunned for **2.5 s**. Stacks to 1. Audio: bright triangle wave
   523 Hz → 784 Hz, 0.4 s.
2. **Laudanum bottle** (×1 spawn, Parlor mantel) — dark
   `CylinderGeometry(0.07, 0.08, 0.22)` with a `MeshBasicMaterial` red cap.
   Effect: **slows Max by 40 %** for **8 s**. Audio: detuned sine pair
   220/233 Hz with a slow tremolo.
3. **Polaroid of yourself** (×1 spawn, Bathroom) — flat 0.15 × 0.10
   `PlaneGeometry` on the sink. Effect: **brief invisibility**. Max's lerp
   target freezes for **4 s**; he wanders to last-seen point and pauses.
   Audio: reverse-tail noise burst, 0.6 s.

Buff icon appears bottom-left of HUD with a countdown ring when active.

## Floor plan (top-down, 22×22, 1 cell ≈ 1 m)

```
######################
#       Parlor       #
#  T  M     B     T  #
#                    #
#####D#######D########
#  Study     | Kit-  #
#  T    H    |  chen #
#            |   T   #
#   B        D   B   #
#            |       #
#####D########D#######
#  Hall (entry corridor)
#       T            #
#  H        O    H   #
#         X          #
#  H                 #
#                    #
########D#############
#  Bathroom          #
#       P            #
#  T   B             #
######################
```

Legend: `P` player spawn (entry from stage 1 cellar door), `X` cellar hatch
exit (target), `D` door, `B` buff spawn, `H` wardrobe hide spot, `T` table,
`M` Max patrol start, `O` alt-spawn. World coords: spawn `(0, 1.6, -9)`
facing north; hatch `(0, 0, 10.5)`.

## Rooms (5 distinct, +hall)

1. **Hallway** (entry, 8 × 4 m). Prop: long runner rug, the cellar hatch
   (BoxGeometry(1.4, 0.08, 1.4) flat on floor, glowing red rim when locked,
   green when keyed). Light: single bare `PointLight(0xffc88a, 0.7, 6)` at
   `(0, 2.2, 0)`. Wardrobes flanking N and S walls.
2. **Parlor** (north, 10 × 5 m). Prop: stone hearth (BoxGeometry stack)
   with dead embers (`PointLight(0xff4422, 0.15, 3)`, flickering). 4
   paintings of Max above mantel.
3. **Study** (west of parlor, 6 × 5 m). Prop: rolltop desk (3 stacked
   boxes), one buff. Light: green-shaded desk lamp
   `PointLight(0x88ff99, 0.5, 3)` at `(−5, 1.1, 4)`. One wardrobe.
4. **Kitchen** (east of parlor, 6 × 5 m). Prop: long table with the
   **brass key** (50 % spawn chance here). Light: cold ceiling
   `PointLight(0xb0c8ff, 0.6, 5)`, buzzes via tiny 0.05 intensity wobble.
5. **Bathroom** (south of hall, 5 × 4 m). Prop: clawfoot tub
   (HalfSphereGeometry approx via two boxes), mirror that reflects nothing
   (a flat `MeshBasicMaterial({ color: 0x0a0a14 })` plane — players notice).
   Polaroid buff sits on the sink. Light: dim `PointLight(0xffeedd, 0.4, 3)`.

## Max behavior in this stage (AI pseudo-code)

```
state: PATROL | INVESTIGATE | CHASE | STUNNED
target = next waypoint OR last-seen OR player

each frame:
  if STUNNED: timer--; if 0 -> PATROL; skip
  hasLOS = raycast(maxPos -> camera) not blocked by wall/door
  if hasLOS and !playerInWardrobe and !playerInvisible:
    state = CHASE; target = camera.pos; lastSeen = camera.pos
  elif state == CHASE and (no LOS for 1.2s):
    state = INVESTIGATE; target = lastSeen; investigateTimer = 6s
  elif state == INVESTIGATE and (reached target or timer up):
    state = PATROL; pick next waypoint in {Parlor, Kitchen, Study, Hall}
  baseSpeed = 2.4 m/s (PATROL) | 2.9 (INVESTIGATE) | 3.6 (CHASE)
  speed *= slowBuffMult (0.6 if laudanum active)
  if door closed in path: stop 2.2s, play crack, doorOpen = true
  moveToward(target, speed * dt)
```

Max uses one sprite, image index 0 (locked). He does **not** use the
random pool — that pool now decorates the walls.

## Paintings — Max everywhere

- **Count**: 24 frames total across the house.
- **Texture pool**: the existing `images` array (currently 15 entries +
  the primary). Treat as `images[]` even if length grows. Index 0 is
  reserved for Max-the-monster; paintings cycle through indices `1..N−1`.
  If pool < 24, repeat with random rotation (±π each) to disguise.
- **Geometry**: `PlaneGeometry(0.55, 0.75)` (portrait) or
  `(0.75, 0.55)` (landscape), with a `BoxGeometry(W+0.06, H+0.06, 0.03)`
  dark wood frame behind it.
- **Placement rule**:
  - Every room gets **at least 3** paintings.
  - **Hall** gets **8** paintings (the gauntlet) — Max watches you walk in.
  - Paintings above each **buff** are guaranteed (so the player meets Max's
    eyes when reaching for help).
  - One painting in the bathroom is rotated **upside down** — a tell.
- **Eye gimmick**: each frame, a 0.05 m square translucent plane in front
  of the painting tracks the camera on the Y axis (±0.06 m). Cheap fake
  "eyes follow you".
- **Jump scare**: at 3:00 elapsed, **one random painting** swaps its
  texture for image[0] (Max-monster) for 0.6 s with a dissonant sting,
  then back. Player learns: paintings can become him.

## Win / lose feedback

- **Win**: hatch flips open with a wood-creak, camera tweens down 1.2 m,
  fade to white, sustained C-major sine triad (262/330/392 Hz, 4 s),
  text: _"Tu t'es échappé. Encore."_ (You escaped. Again.)
- **Lose (caught)**: red vignette, Max sprite scales 4× over 0.3 s,
  cluster of sawtooths at 55/58/82 Hz (reuses `playLoseChord`), text:
  _"Il était dans le cadre."_ (He was in the frame.) Auto-restart 2.5 s.
- **Lose (breath out in wardrobe)**: camera shakes violently, wardrobe
  door slams open from outside, then standard catch sequence.

## Length & pacing

Target **3–5 min** per run.

- **0:00–0:45 Settle** — hallway, first painting gauntlet. Max audible in
  parlor but not visible. Heartbeat 65 BPM.
- **0:45–2:30 Search** — rooms unlocked, two doors closed by default; buff
  pickups discoverable. Max enters CHASE on first sighting. Heartbeat 80.
- **2:30–4:00 Pressure** — jump-scare painting fires; key spawns reveal a
  guaranteed clue (the table glows faintly). Max patrols faster. 100 BPM.
- **4:00–5:00 Endgame / forced** — keyed run for the hatch. Doors no
  longer slow Max. 115 BPM, dronesweep up.

## Implementation hooks

New state fields in `main.ts`:

- `stage: 1 | 2` (route by URL hash or post-win transition).
- `rooms: { name, bounds, lights }[]`
- `doors: { mesh, pivot, open, lastInteractAt }[]`
- `wardrobes: { mesh, pos, occupied }[]`
- `hiding: { active, wardrobe, breath: 12, sinceEntered }`
- `buffs: { kind: 'salt'|'laudanum'|'polaroid', mesh, pos, taken }[]`
- `activeBuff: { kind, expiresAt } | null`
- `key: { mesh, pos, held }`
- `paintings: { mesh, frame, textureIndex, rotated180 }[]`
- `max: { state, target, lastSeen, stunnedUntil, doorCrashUntil }`

New audio events to add to `src/audio.ts`:

- `playDoorClose()` / `playDoorCrack()` (wood snap, 200 ms).
- `playWardrobeEnter()` / `playWardrobeExit()` (cloth rustle + low-pass duck).
- `playSaltUse()`, `playLaudanumUse()`, `playPolaroidUse()` (each above).
- `playKeyPickup()` (single bright bell, 880 Hz).
- `playPaintingJumpscare()` (wraps `playWrongSting` + reverse swell).
- `setMaxFootsteps(distance, panX)` — schedule muffled thumps panned by
  the player-relative bearing.

New HUD elements:

- **Breath bar** — 4 px tall bar bottom-center, visible only while hiding;
  fills from green → red as it drains.
- **Buff icon** — 36 × 36 box bottom-left, with circular SVG countdown ring.
- **Key indicator** — small brass dot next to "Candles" counter, lit when
  held.
- **Action prompt** stays the same; verb swaps by context ("HIDE", "OPEN",
  "TAKE", "UNLOCK").

## Sources

- _P.T._ — the L-corridor loop and the watching-portrait gag.
- _Visage_ — paintings-as-presence.
- _Outlast_ — wardrobe hiding, breath meter.
- _Resident Evil 1_ mansion — keyed-door rhythm across small rooms.

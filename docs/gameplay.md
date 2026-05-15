# Gameplay design — "The Seventh Candle"

Single-run, 4–6 minute horror game. Output of a creative gameplay-design pass
on 2026-05-15. Keep this in sync with the implementation; if you change a
number in the game, change it here.

## Concept

You are trespassing in a graveyard at the witching hour. A spirit named
**Max** — your guilt made flesh — has woken with you. Seven black candles are
buried at specific graves. Light them **in the correct order** (revealed by
the names whispered to you) before Max catches you. Each lit candle weakens
the moonlight, awakens Max further, and pulls the iron gate at spawn open one
notch — the gate is your only exit.

Tension comes from a spatial dilemma: candles are scattered far from the
gate, and every lit one makes Max faster and the world darker.

## Win condition

Light all 7 candles in the whispered order, then return to the gate at
`(0, 0, 14.5)` and stand within 1.5 m of it for **2 continuous seconds**.

## Lose conditions

- Max sprite intersects camera within 1.25 m.
- Light candles in the wrong order: a "wrong" pulses the screen. **3 wrong
  total** = instant loss (Max screams and teleports onto you).
- Soft timer: at **6:00** elapsed, Max's speed doubles and ignores fog
  occlusion — effectively a forced ending.

## Core moment-to-moment loop

1. A whisper plays the name of the next candle (e.g., "…Élodie…"). The name
   also appears as faint HUD text for 2 s.
2. Player navigates the graveyard reading engraved names on graves
   (`CanvasTexture` planes on the front face).
3. Player walks within 1.2 m of the matching grave's candle and presses
   **E** on desktop or taps the **action** button on mobile. Candle ignites
   (small flickering `PointLight`, range 4, intensity 1.2, warm orange
   `0xff8a3c`).
4. Audio sting + heartbeat tempo bumps. Max's chase speed increases.
   Moonlight directional intensity drops.
5. Next whisper plays after a 4–9 s random delay. Repeat.
6. After candle 7, the gate visibly swings open, a low brass-like sub
   stinger plays, and the exit objective activates.

Action button: **E** on desktop, an on-screen "✦" button bottom-right on
mobile (next to the existing SPRINT button). Single-key, no combos.

## Progression / escalation (per lit candle, 0 → 7)

| Property            | At 0 candles | At 7 candles           |
| ------------------- | ------------ | ---------------------- |
| Max base speed      | 2.6 m/s      | 5.6 m/s (+0.43/candle) |
| Max lerp factor     | 0.012        | 0.028                  |
| Moonlight intensity | 1.1          | 0.45                   |
| Fog `far`           | 38           | ~24                    |
| Heartbeat BPM base  | 60           | 110                    |
| Whisper inter-delay | 9 s          | 3 s                    |

- At candle **5**, a **second Max sprite** spawns at the farthest wall and
  moves at 60% speed — a flanker, not a swarmer.
- At candle **7**, the flickering central point light disables permanently;
  only lit candles + moonlight remain.

Phases:

- **0:00–1:00 Setup** — 1–2 candles lit, calm drone, learning the loop.
- **1:00–3:30 Hunt** — 3–5 candles, Max audibly closer, real near-misses.
- **3:30–5:30 Collapse** — world darkens, fog thickens, flanker appears.
- **5:30–6:30 Exit** — gate opens, sprint to spawn through the dark.

## Game objects

- **Candle (×7)** — `CylinderGeometry(0.06, 0.07, 0.35)` on top of a
  designated grave. Unlit = no light. Lit = `PointLight(0xff8a3c, 1.2, 4)`
  flickering via `Math.sin(t*13) + noise`. Fixed XZ positions (each within
  ±1.5 of the proposed):

  ```
  C1 (-11, -9)    C2 ( 3,  11)    C3 (-2, -7)    C4 (12,  4)
  C5 ( -6, -12)   C6 (-6,  6)     C7 ( 3,  1)
  ```

- **Grave nameplate (×32)** — every grave gets a procedural name from a
  ~40-name pool (Élodie, Henri, Margaux, Théodore, …). 7 of them match
  candle graves. Rendered via `CanvasTexture` on a 0.42 × 0.21 plane offset
  to the grave's front, lit only by nearby candles.
- **The Gate** — `BoxGeometry` arch at `(0, 1.5, 14.8)`. Closed = collider
  blocks movement past `z = 14`. Opens with a 1.8 s rotational tween after
  candle 7. Win trigger zone: cylinder `r = 1.5` at `(0, 0, 14.5)`.
- **Whisper system** — filtered white noise (bandpass ~800 Hz, Q=8) amplitude-
  modulated by an LFO at syllable rate, panned slightly L/R at random,
  ~1.2 s duration.
- **Max (primary)** — existing sprite, respawns 18–25 m from player on
  wrong-candle or 1.8 s post-catch.
- **Max (flanker, candle 5+)** — second sprite using a different image from
  the CDN pool, spawns at farthest wall, slower.
- **Wisp hint (optional, anti-stuck)** — if player is idle > 20 s with no
  progress, a faint blue `PointLight(0xb0c8ff, 0.4, 2)` pulses at the
  next-candle grave for 2 s.

No weapon. Player power is **correctness**, not violence.

## Win/lose feedback

- **Win**: gate slams behind you, audio cuts to a sustained low sawtooth
  (220 Hz → 110 Hz glide over 3 s), white-on-black "Tu t'es échappé. Pour
  cette nuit." Click to restart.
- **Lose (caught)**: red vignette pegs full, Max sprite scales 4× over
  0.4 s, dissonant cluster (3 detuned sawtooths at 55/58/82 Hz), screen
  black, "Max t'a trouvé." Auto-restart after 2.5 s.
- **Lose (3 wrong)**: all candles snuff simultaneously, 1 s of total
  silence, then catch sequence.

## Implementation hooks

State to add (kept in `main.ts`):

- `candles: { mesh, light, flame, lit, name, pos }[]`
- `correctOrder: number[]` (shuffled at start)
- `currentIndex: number`
- `wrongCount: number`
- `gameState: 'idle' | 'playing' | 'won' | 'caught'`
- `runStartTime: number`
- `nextWhisperAt: number`
- `currentWhisperName: string | null`
- `flankerMenace?: Sprite`

`getNextCandle()` → `candles[correctOrder[currentIndex]]`. Each frame, on
E / tap, check the closest candle within 1.2 m; if it's the next-in-order →
light + ramp; else → `wrongCount++`.

## Sources

- Iron Lung — minimalist horror tension design.
- Phasmophobia — clue/audio-cue mechanics.
- Faith, P.T., short itch.io horror jam winners — short-form pacing.

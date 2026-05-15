import type * as THREE from "three";
import type { CreepyAudio } from "../audio.js";

/**
 * Read-only per-frame player intent, derived in main.ts from keyboard + joystick + look.
 * Stages read this; they never write to it.
 */
export interface PlayerInput {
  /** XZ walk vector in world space, already yaw-rotated, magnitude 0..1. */
  readonly walk: THREE.Vector3;
  readonly sprint: boolean;
  /** True for exactly one frame on E / action button press. */
  readonly interactPressed: boolean;
}

export interface StageHud {
  setStatus(text: string): void;
  setObjective(text: string): void;
  setCounter(text: string): void;
  setActionPrompt(text: string | null): void;
  setActionReady(ready: boolean): void;
  /**
   * Big, transient center-screen hint. Pass a string to show, `null` to hide.
   * Useful when the stage needs to announce something the player cannot miss
   * (e.g. the next whispered name in stage 1).
   */
  setStageHint(text: string | null): void;
  showEndscreen(title: string, sub: string): void;
  setPulse(opacity: number): void;
}

export interface StageContext {
  readonly scene: THREE.Scene;
  readonly stageRoot: THREE.Group;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly clock: THREE.Clock;
  readonly audio: CreepyAudio;
  readonly hud: StageHud;
  readonly input: PlayerInput;
  readonly isTouchDevice: boolean;
  /** Stage-local timeout helper. The orchestrator clears all of these on stage dispose. */
  setTimeout(handler: () => void, ms: number): number;
}

import type { StageContext } from "./StageContext.js";

export type StageOutcome = "win" | "lose" | null;
export type StageId = "graveyard" | "house";

export interface Stage {
  readonly id: StageId;
  /**
   * Per-frame tick. Return "win" / "lose" to request a transition; null otherwise.
   */
  update(deltaTime: number, elapsedTime: number): StageOutcome;
  /**
   * Tear down everything this stage added: meshes, materials, textures, lights,
   * listeners, timers. After dispose() the stage must be unreachable from GC roots.
   */
  dispose(): void;
}

export type StageFactory = (ctx: StageContext) => Stage;

const FADE_IN_SECONDS = 4;
const MASTER_VOLUME = 0.55;

export class CreepyAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private heartbeatTimer = 0;
  private intensity = 0;
  private playing = false;

  async start(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      this.playing = true;
      return;
    }

    const ctx = new AudioContext();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(MASTER_VOLUME, ctx.currentTime + FADE_IN_SECONDS);
    master.connect(ctx.destination);
    this.master = master;

    this.buildDrone(ctx, master);
    this.buildPad(ctx, master);
    this.buildWind(ctx, master);
    this.scheduleHeartbeat(ctx, master);

    this.playing = true;
  }

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  isRunning(): boolean {
    return this.ctx?.state === "running";
  }

  hasStarted(): boolean {
    return this.ctx !== null;
  }

  async toggle(): Promise<boolean> {
    if (!this.ctx) {
      await this.start();
      return true;
    }
    if (this.ctx.state === "running") {
      await this.ctx.suspend();
      this.playing = false;
      return false;
    }
    await this.ctx.resume();
    this.playing = true;
    return true;
  }

  private buildDrone(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    filter.Q.value = 3;
    filter.connect(dest);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.04;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    gain.connect(filter);

    for (const freq of [55, 55.6, 82.5]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
    }
  }

  private buildPad(ctx: AudioContext, dest: AudioNode): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.connect(dest);

    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    gain.connect(filter);

    // Dissonant cluster — D3, D#3, G#3 (minor 2nd + tritone) for unease.
    for (const freq of [146.83, 155.56, 207.65]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain).connect(osc.detune);
      lfo.start();

      osc.connect(gain);
      osc.start();
    }
  }

  private buildWind(ctx: AudioContext, dest: AudioNode): void {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.6;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.03;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.value = 0.1;

    src.connect(filter).connect(gain).connect(dest);
    src.start();
  }

  private scheduleHeartbeat(ctx: AudioContext, dest: AudioNode): void {
    const beat = (): void => {
      if (!this.playing) {
        this.heartbeatTimer = window.setTimeout(beat, 400);
        return;
      }
      const t = ctx.currentTime;
      const peak = 0.4 + this.intensity * 0.5;
      this.thump(ctx, dest, t, peak);
      this.thump(ctx, dest, t + 0.18, peak * 0.7);
      const interval = 1600 - this.intensity * 900;
      this.heartbeatTimer = window.setTimeout(beat, interval);
    };
    beat();
  }

  private thump(ctx: AudioContext, dest: AudioNode, time: number, peak: number): void {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(70, time);
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.3);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(g).connect(dest);
    osc.start(time);
    osc.stop(time + 0.45);
  }
}

export const audio = new CreepyAudio();

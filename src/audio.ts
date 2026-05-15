const FADE_IN_SECONDS = 4;
const MASTER_VOLUME = 0.55;

export class CreepyAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private heartbeatTimer = 0;
  private intensity = 0;
  private candleProgress = 0;
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

  setCandleProgress(litCount: number): void {
    this.candleProgress = Math.max(0, Math.min(1, litCount / 7));
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

  playWhisper(name: string): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const duration = 1.2;

    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 820;
    filter.Q.value = 7;

    const gain = ctx.createGain();
    const vowels = name.match(/[aeiouyàâäéèêëïîôöùûüœæ]+/gi);
    const syllables = Math.max(2, vowels ? vowels.length : 2);
    gain.gain.setValueAtTime(0, t0);
    for (let i = 0; i < syllables; i += 1) {
      const slotStart = t0 + (i / syllables) * duration;
      const slotMid = slotStart + (duration / syllables) * 0.35;
      const slotEnd = slotStart + (duration / syllables) * 0.85;
      gain.gain.linearRampToValueAtTime(0.32, slotMid);
      gain.gain.linearRampToValueAtTime(0.04, slotEnd);
    }
    gain.gain.linearRampToValueAtTime(0, t0 + duration);

    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 0.6;

    src.connect(filter).connect(gain).connect(pan).connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }

  playLightCandle(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes: Array<[number, number]> = [
      [392, 0],
      [523.25, 0.08],
      [659.25, 0.18],
    ];
    for (const [freq, delay] of notes) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const start = t + delay;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.13, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
      osc.connect(g).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.75);
    }
  }

  playWrongSting(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const freq of [110, 116.5, 165]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.75);
    }
  }

  playGateRumble(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    filter.Q.value = 1;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.25);
    g.gain.linearRampToValueAtTime(0.5, t + 1.4);
    g.gain.linearRampToValueAtTime(0, t + 2);

    src.connect(filter).connect(g).connect(this.master);
    src.start(t);

    // brass-like sub stinger
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(82, t + 1.5);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.25, t + 0.2);
    og.gain.linearRampToValueAtTime(0.25, t + 1.2);
    og.gain.linearRampToValueAtTime(0, t + 2);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 2.05);
  }

  playWinChord(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 3);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.5);
    g.gain.linearRampToValueAtTime(0.22, t + 2.5);
    g.gain.linearRampToValueAtTime(0, t + 4);

    osc.connect(filter).connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 4.1);
  }

  playLoseChord(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const freq of [55, 58.3, 82.4]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.05);
      g.gain.linearRampToValueAtTime(0.28, t + 1.6);
      g.gain.linearRampToValueAtTime(0, t + 2.6);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 2.7);
    }
    // High shriek band-passed noise
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    filter.Q.value = 12;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  duckMaster(target: number, seconds: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(target, t + seconds);
  }

  restoreMaster(seconds: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(MASTER_VOLUME, t + seconds);
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
      const peak = 0.35 + this.intensity * 0.5 + this.candleProgress * 0.15;
      this.thump(ctx, dest, t, peak);
      this.thump(ctx, dest, t + 0.18, peak * 0.7);
      // Candle progress drives base BPM 60 → 110; proximity adds up to +25 BPM.
      const bpm = 60 + this.candleProgress * 50 + this.intensity * 25;
      const interval = Math.max(380, 60000 / bpm);
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

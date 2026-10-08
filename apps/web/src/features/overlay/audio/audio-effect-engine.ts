export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, startTime: number): void;
  linearRampToValueAtTime(value: number, endTime: number): void;
  exponentialRampToValueAtTime(value: number, endTime: number): void;
}

export interface OscillatorNodeLike {
  type: OscillatorType;
  frequency: AudioParamLike;
  onended: (() => void) | null;
  connect(destination: unknown): void;
  disconnect(): void;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface GainNodeLike {
  gain: AudioParamLike;
  connect(destination: unknown): void;
  disconnect(): void;
}

export interface AudioContextLike {
  currentTime: number;
  state: AudioContextState;
  destination: unknown;
  createOscillator(): OscillatorNodeLike;
  createGain(): GainNodeLike;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface AudioEffectEngineOptions {
  readonly contextFactory?: () => AudioContextLike;
  readonly cooldownMs?: number;
  readonly maxPolyphony?: number;
  readonly initialVolume?: number;
  readonly initialMuted?: boolean;
}

interface ActiveVoice {
  readonly id: number;
  readonly soundKey: string;
  readonly oscillator: OscillatorNodeLike;
  readonly gain: GainNodeLike;
  currentFreq: number;
  currentGain: number;
  lastTriggeredTime: number;
}

export class AudioEffectEngine {
  private readonly context: AudioContextLike | null = null;
  private readonly masterGain: GainNodeLike | null = null;
  private readonly cooldownMs: number;
  private readonly maxPolyphony: number;

  private volume: number;
  private muted: boolean;
  private voiceCounter = 0;
  private activeVoices: ActiveVoice[] = [];
  private fanfareVoices: OscillatorNodeLike[] = [];

  constructor(options?: AudioEffectEngineOptions) {
    this.cooldownMs = options?.cooldownMs ?? 80;
    this.maxPolyphony = options?.maxPolyphony ?? 4;
    this.volume = Math.min(1, Math.max(0, options?.initialVolume ?? 0.6));
    this.muted = options?.initialMuted ?? false;

    if (options?.contextFactory) {
      this.context = options.contextFactory();
    } else if (typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.context = new AudioCtx() as unknown as AudioContextLike;
      }
    }

    if (this.context) {
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.applyMasterGain();
    }
  }

  public get state(): AudioContextState | 'unavailable' {
    return this.context ? this.context.state : 'unavailable';
  }

  public isSuspended(): boolean {
    return this.context?.state === 'suspended';
  }

  public async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyMasterGain();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
  }

  public playContribution(resourceKey: string): void {
    if (!this.context || !this.masterGain) return;

    const nowMs = this.context.currentTime * 1000;
    const existingVoice = this.activeVoices.find(
      (v) => v.soundKey === resourceKey,
    );

    if (
      existingVoice &&
      nowMs - existingVoice.lastTriggeredTime < this.cooldownMs
    ) {
      // Cooldown rule: escalate pitch (+20Hz) and gain (+1dB)
      const newFreq = Math.min(2400, existingVoice.currentFreq + 20);
      existingVoice.currentFreq = newFreq;
      existingVoice.oscillator.frequency.setValueAtTime(
        newFreq,
        this.context.currentTime,
      );

      // +1dB ~ multiplier 1.122, max 1.0 safe ceiling
      const newGain = Math.min(1.0, existingVoice.currentGain * 1.122);
      existingVoice.currentGain = newGain;
      existingVoice.gain.gain.setValueAtTime(newGain, this.context.currentTime);
      existingVoice.lastTriggeredTime = nowMs;
      return;
    }

    // Polyphony limit check: FIFO eviction
    if (this.activeVoices.length >= this.maxPolyphony) {
      const oldest = this.activeVoices.shift();
      if (oldest) {
        this.stopVoice(oldest);
      }
    }

    const voiceId = ++this.voiceCounter;
    const { frequency, waveType } = this.deriveTimbre(resourceKey);

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(frequency, this.context.currentTime);

    const initialGain = 0.35;
    gain.gain.setValueAtTime(initialGain, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.context.currentTime + 0.45,
    );

    osc.connect(gain);
    gain.connect(this.masterGain);

    const voice: ActiveVoice = {
      id: voiceId,
      soundKey: resourceKey,
      oscillator: osc,
      gain,
      currentFreq: frequency,
      currentGain: initialGain,
      lastTriggeredTime: nowMs,
    };

    osc.onended = () => {
      this.removeVoice(voiceId);
    };

    this.activeVoices.push(voice);
    osc.start(this.context.currentTime);
    osc.stop(this.context.currentTime + 0.48);
  }

  public playFanfare(): void {
    if (!this.context || !this.masterGain) return;

    // Interrupt all active contribution voices
    for (const voice of this.activeVoices) {
      this.stopVoice(voice);
    }
    this.activeVoices = [];

    // Interrupt previous fanfare voices if any
    for (const osc of this.fanfareVoices) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Safe ignore
      }
    }
    this.fanfareVoices = [];

    // Triad / Arpeggio C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const startTime = this.context.currentTime;
    const noteDuration = 0.18;

    notes.forEach((freq, index) => {
      if (!this.context || !this.masterGain) return;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = index === notes.length - 1 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + index * noteDuration);

      const noteStart = startTime + index * noteDuration;
      const noteEnd =
        index === notes.length - 1
          ? noteStart + noteDuration * 3
          : noteStart + noteDuration * 1.2;

      gain.gain.setValueAtTime(0.4, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(this.masterGain);

      this.fanfareVoices.push(osc);
      osc.start(noteStart);
      osc.stop(noteEnd);
    });
  }

  public async dispose(): Promise<void> {
    for (const voice of this.activeVoices) {
      this.stopVoice(voice);
    }
    this.activeVoices = [];

    for (const osc of this.fanfareVoices) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Safe ignore
      }
    }
    this.fanfareVoices = [];

    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
    }
  }

  private stopVoice(voice: ActiveVoice): void {
    try {
      voice.oscillator.stop();
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    } catch {
      // Already stopped or disconnected
    }
  }

  private removeVoice(id: number): void {
    const index = this.activeVoices.findIndex((v) => v.id === id);
    if (index !== -1) {
      this.activeVoices.splice(index, 1);
    }
  }

  private applyMasterGain(): void {
    if (!this.masterGain || !this.context) return;
    const effectiveGain = this.muted ? 0 : this.volume;
    this.masterGain.gain.setValueAtTime(
      effectiveGain,
      this.context.currentTime,
    );
  }

  private deriveTimbre(key: string): {
    frequency: number;
    waveType: OscillatorType;
  } {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    // Pentatonic scale base frequencies: 330, 392, 440, 523, 587, 659
    const pentatonic = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const frequency = pentatonic[absHash % pentatonic.length];

    const waves: OscillatorType[] = ['sine', 'triangle', 'sawtooth'];
    const waveType = waves[absHash % waves.length];

    return { frequency, waveType };
  }
}

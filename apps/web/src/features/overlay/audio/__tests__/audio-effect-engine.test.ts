import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AudioEffectEngine,
  type AudioContextLike,
  type OscillatorNodeLike,
  type GainNodeLike,
  type AudioParamLike,
} from '../audio-effect-engine';

class MockAudioParam implements AudioParamLike {
  constructor(public value: number = 1) {}
  setValueAtTime = vi.fn((val: number) => {
    this.value = val;
  });
  linearRampToValueAtTime = vi.fn((val: number) => {
    this.value = val;
  });
  exponentialRampToValueAtTime = vi.fn((val: number) => {
    this.value = val;
  });
}

class MockGainNode implements GainNodeLike {
  gain = new MockAudioParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode implements OscillatorNodeLike {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam(440);
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext implements AudioContextLike {
  currentTime = 0;
  state: AudioContextState = 'suspended';
  destination = {};
  createdOscillators: MockOscillatorNode[] = [];
  createdGains: MockGainNode[] = [];

  createOscillator = vi.fn(() => {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  });

  createGain = vi.fn(() => {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain;
  });

  resume = vi.fn(async () => {
    this.state = 'running';
  });

  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

describe('AudioEffectEngine', () => {
  let mockContext: MockAudioContext;
  let engine: AudioEffectEngine;

  beforeEach(() => {
    mockContext = new MockAudioContext();
    engine = new AudioEffectEngine({
      contextFactory: () => mockContext,
      cooldownMs: 80,
      maxPolyphony: 4,
    });
  });

  it('initializes with master gain node connected to destination', () => {
    expect(mockContext.createGain).toHaveBeenCalled();
    const masterGain = mockContext.createdGains[0];
    expect(masterGain.connect).toHaveBeenCalledWith(mockContext.destination);
  });

  it('adjusts master volume and respects mute status', () => {
    const masterGain = mockContext.createdGains[0];

    engine.setVolume(0.8);
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
      0.8,
      mockContext.currentTime,
    );

    engine.setMuted(true);
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
      0,
      mockContext.currentTime,
    );

    engine.setMuted(false);
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
      0.8,
      mockContext.currentTime,
    );

    engine.setVolume(2.0);
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
      1.0,
      mockContext.currentTime,
    );

    engine.setVolume(-1.0);
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
      0,
      mockContext.currentTime,
    );
  });

  it('reports state and suspended status correctly', () => {
    expect(engine.state).toBe('suspended');
    expect(engine.isSuspended()).toBe(true);
  });

  it('plays a contribution sound and starts oscillator', () => {
    engine.playContribution('rose');

    expect(mockContext.createOscillator).toHaveBeenCalledTimes(1);
    expect(mockContext.createGain).toHaveBeenCalledTimes(2); // Master + voice gain
    const osc = mockContext.createdOscillators[0];
    expect(osc.start).toHaveBeenCalled();
  });

  it('applies cooldown and pitch/gain scaling when same key is played within 80ms', () => {
    mockContext.currentTime = 1.0;
    engine.playContribution('rose');
    const initialOsc = mockContext.createdOscillators[0];
    const initialFreq = initialOsc.frequency.value;

    expect(mockContext.createOscillator).toHaveBeenCalledTimes(1);

    // Play again at 1.05s (50ms later < 80ms cooldown)
    mockContext.currentTime = 1.05;
    engine.playContribution('rose');

    // Should NOT create a second oscillator
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(1);
    // Pitch escalated (+20Hz)
    expect(initialOsc.frequency.setValueAtTime).toHaveBeenCalledWith(
      initialFreq + 20,
      1.05,
    );
  });

  it('creates new voice when cooldown expires', () => {
    mockContext.currentTime = 1.0;
    engine.playContribution('rose');
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(1);

    // Advance beyond cooldown (100ms > 80ms)
    mockContext.currentTime = 1.1;
    engine.playContribution('rose');
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('limits polyphony to max 4 voices using FIFO eviction', () => {
    mockContext.currentTime = 1.0;
    engine.playContribution('gift_1');
    engine.playContribution('gift_2');
    engine.playContribution('gift_3');
    engine.playContribution('gift_4');

    expect(mockContext.createOscillator).toHaveBeenCalledTimes(4);
    const firstOsc = mockContext.createdOscillators[0];
    // Initially, stop was only called once for scheduled stop at +0.48s
    expect(firstOsc.stop).toHaveBeenCalledTimes(1);

    // 5th voice: oldest (firstOsc) should be prematurely stopped (call count becomes 2)
    engine.playContribution('gift_5');
    expect(firstOsc.stop).toHaveBeenCalledTimes(2);
    expect(firstOsc.disconnect).toHaveBeenCalled();
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(5);
  });

  it('playFanfare interrupts all active contribution voices and plays fanfare', () => {
    engine.playContribution('gift_1');
    engine.playContribution('gift_2');

    const osc1 = mockContext.createdOscillators[0];
    const osc2 = mockContext.createdOscillators[1];

    expect(osc1.stop).toHaveBeenCalledTimes(1);
    expect(osc2.stop).toHaveBeenCalledTimes(1);

    engine.playFanfare();

    // Both contribution voices were prematurely stopped (call count becomes 2)
    expect(osc1.stop).toHaveBeenCalledTimes(2);
    expect(osc2.stop).toHaveBeenCalledTimes(2);
    // Fanfare creates oscillators for the fanfare melody / chord
    expect(mockContext.createOscillator.mock.calls.length).toBeGreaterThan(2);
  });

  it('resumes audio context when requested', async () => {
    expect(mockContext.state).toBe('suspended');
    await engine.resume();
    expect(mockContext.resume).toHaveBeenCalled();
    expect(mockContext.state).toBe('running');
  });

  it('disposes engine, stops all active voices and closes audio context', async () => {
    engine.playContribution('gift_1');
    const osc = mockContext.createdOscillators[0];

    await engine.dispose();

    expect(osc.stop).toHaveBeenCalledTimes(2);
    expect(mockContext.close).toHaveBeenCalled();
  });
});

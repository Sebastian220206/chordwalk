/**
 * Web Audio API synthesizer for Chordwalk.
 * - Triangle wave + quiet sine an octave up
 * - Short attack, exponential decay
 * - Lowpass filter and master compressor
 * - Audio starts ONLY after user gesture
 * - Mute / sound toggle supported
 */

export interface PlayNoteOptions {
  duration?: number;
  time?: number;
  gain?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private _isMuted = false;
  private _hasStarted = false;

  constructor() {
    // Check initial mute state from localStorage if available
    try {
      const saved = localStorage.getItem('chordwalk_muted');
      if (saved !== null) {
        this._isMuted = saved === 'true';
      }
    } catch {
      // localStorage may be disabled
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public get hasStarted(): boolean {
    return this._hasStarted;
  }

  public setMuted(muted: boolean): void {
    this._isMuted = muted;
    try {
      localStorage.setItem('chordwalk_muted', String(muted));
    } catch {
      // ignore
    }
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.85, now);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this._isMuted);
    return this._isMuted;
  }

  /**
   * Initializes the AudioContext after a user gesture (tap/click/key).
   */
  public async ensureContext(): Promise<AudioContext | null> {
    if (this._isMuted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // Master Compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      // Lowpass Filter
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : 0.85, this.ctx.currentTime);

      // Graph: Voice -> Filter -> Compressor -> MasterGain -> Destination
      this.filter.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // user gesture might be pending
      }
    }

    this._hasStarted = true;
    return this.ctx;
  }

  public midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Synthesize a single tone: triangle wave + quiet sine an octave up,
   * short attack, exponential decay.
   */
  public playMidi(
    midi: number,
    options: PlayNoteOptions = {}
  ): void {
    if (this._isMuted) return;

    this.ensureContext().then((ctx) => {
      if (!ctx || !this.filter) return;

      const now = options.time !== undefined ? options.time : ctx.currentTime;
      const duration = options.duration ?? 0.8;
      const baseGain = options.gain ?? 0.28;
      const freq = this.midiToFreq(midi);

      // Voice gain envelope
      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0.0001, now);
      // Short attack: 15ms
      const attack = 0.015;
      voiceGain.gain.linearRampToValueAtTime(baseGain, now + attack);
      // Exponential decay
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Primary oscillator: Triangle
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      // Secondary oscillator: Quiet sine an octave higher (+12 semitones = 2 * freq)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.2, now); // quiet overtone

      osc1.connect(voiceGain);
      osc2.connect(osc2Gain);
      osc2Gain.connect(voiceGain);

      voiceGain.connect(this.filter);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + duration);
      osc2.stop(now + duration);

      // Disconnect after finished to release resources
      setTimeout(() => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          osc2Gain.disconnect();
          voiceGain.disconnect();
        } catch {
          // ignore
        }
      }, (duration + 0.1) * 1000);
    });
  }

  /**
   * Plays a pitch class node tap (MIDI 60 + pitch class) with a warm marimba/bubble pop transient.
   */
  public playTap(pc: number): void {
    const midi = 60 + ((pc % 12 + 12) % 12);
    this.playMidi(midi, { duration: 0.7, gain: 0.32 });
    this.playPopTransient();
  }

  /**
   * Short physical bubble/marimba pop click for tactile game-feel.
   */
  private playPopTransient(): void {
    if (this._isMuted) return;
    this.ensureContext().then((ctx) => {
      if (!ctx || !this.filter) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.04);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 0.05);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      }, 70);
    });
  }

  /**
   * Plays a star achievement chime for star #1, #2, or #3.
   */
  public playStarSound(starIndex: number): void {
    if (this._isMuted) return;
    const pitches = [72, 76, 84]; // C5, E5, C6
    const midi = pitches[Math.min(Math.max(starIndex - 1, 0), pitches.length - 1)];
    this.playMidi(midi, { duration: 0.8, gain: 0.35 });
    // Add bright high overtone
    this.playMidi(midi + 12, { duration: 0.5, gain: 0.18 });
  }

  /**
   * Plays a chord voiced: bass note first, upper voices stacked ascending.
   * If `staggerMs` > 0, rolls the chord slightly (e.g. 50ms per note)
   */
  public async playVoicedChord(
    midiNotes: number[],
    staggerMs = 55,
    holdDuration = 1.3
  ): Promise<void> {
    if (this._isMuted || midiNotes.length === 0) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + 0.02;
    midiNotes.forEach((midi, idx) => {
      const noteTime = startTime + (idx * staggerMs) / 1000;
      this.playMidi(midi, {
        time: noteTime,
        duration: holdDuration,
        gain: 0.24,
      });
    });
  }

  /**
   * Plays two notes melodically, then together harmonically (for ear interval levels).
   */
  public async playIntervalMelodicAndHarmonic(
    rootMidi: number,
    targetMidi: number
  ): Promise<void> {
    if (this._isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const t0 = ctx.currentTime + 0.05;
    // Note 1 melodically
    this.playMidi(rootMidi, { time: t0, duration: 0.65, gain: 0.3 });
    // Note 2 melodically
    const t1 = t0 + 0.6;
    this.playMidi(targetMidi, { time: t1, duration: 0.65, gain: 0.3 });
    // Both together
    const t2 = t1 + 0.75;
    this.playMidi(rootMidi, { time: t2, duration: 1.1, gain: 0.24 });
    this.playMidi(targetMidi, { time: t2, duration: 1.1, gain: 0.24 });
  }

  /**
   * Plays a full chord progression (array of voiced chord MIDI arrays).
   */
  public async playProgression(
    chordsMidi: number[][],
    chordDuration = 0.9,
    gap = 0.25
  ): Promise<void> {
    if (this._isMuted || chordsMidi.length === 0) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    let time = ctx.currentTime + 0.05;
    for (const chord of chordsMidi) {
      chord.forEach((midi, i) => {
        this.playMidi(midi, {
          time: time + i * 0.035,
          duration: chordDuration,
          gain: 0.23,
        });
      });
      time += chordDuration + gap;
    }
  }

  /**
   * Quick pleasant cue on level success.
   */
  public async playSuccessCue(): Promise<void> {
    if (this._isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;
    // Ascending arpeggio
    [72, 76, 79, 84].forEach((midi, i) => {
      this.playMidi(midi, {
        time: now + i * 0.07,
        duration: 0.5,
        gain: 0.2,
      });
    });
  }

  /**
   * Gentle error thud/dissonant cue.
   */
  public async playMistakeCue(): Promise<void> {
    if (this._isMuted) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;
    this.playMidi(53, { time: now, duration: 0.35, gain: 0.25 });
    this.playMidi(54, { time: now + 0.02, duration: 0.35, gain: 0.22 });
  }
}

export const audio = new SoundEngine();

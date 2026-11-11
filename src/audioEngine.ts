import { MidiNote, PluginParameters } from './types';
import { arpeggiateNotes } from './arpUtils';

class AudioSynthesizerEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentPpq = 0;
  private sequenceLengthPpq = 16;
  private currentNotes: MidiNote[] = [];
  private effectiveNotes: MidiNote[] = [];
  private isEffectiveDirty = true;

  private params: PluginParameters = {
    transpose: 0,
    speedMultiplier: 1.0,
    velocityScale: 1.0,
    velocityOffset: 0,
    syncMode: 'audition',
    loop: true,
    targetKeyRoot: 0,
    targetKeyIsMinor: false,
    targetScaleType: 'minor',
    projectKeyRoot: 0,
    projectScaleType: 'minor',
    scaleRoot: 0,
    scaleType: 'minor',
    scaleLock: true,
    quantizeGrid: '1/16',
    arpEnabled: false,
    arpMode: 'up',
    arpRate: '1/16',
    arpOctaves: 1,
    arpGate: 0.75,
  };

  private tempoBpm = 120;
  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private onPlayheadCallback: ((ppq: number) => void) | null = null;
  private onStateChangeCallback: ((playing: boolean) => void) | null = null;
  private onActivePitchesCallback: ((pitches: number[]) => void) | null = null;

  // Active sounding pitches
  private soundingPitchesMap: Map<string, number> = new Map();

  // Active oscillator voices to stop cleanly
  private activeVoices: Array<{
    noteId: number;
    pitch: number;
    stop: () => void;
  }> = [];

  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(3200, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.75;

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    this.initContext();
    return this.analyserNode;
  }

  public setOnActivePitches(cb: (pitches: number[]) => void) {
    this.onActivePitchesCallback = cb;
  }

  public setSequence(notes: MidiNote[], totalPpq: number, bpm: number) {
    this.currentNotes = [...notes];
    this.sequenceLengthPpq = Math.max(1, totalPpq);
    this.tempoBpm = Math.min(320, Math.max(20, bpm));
    this.isEffectiveDirty = true;
  }

  public setTempo(bpm: number) {
    this.tempoBpm = Math.min(320, Math.max(20, bpm));
  }

  public getTempo(): number {
    return this.tempoBpm;
  }

  public setParameters(params: PluginParameters) {
    const prevArp = this.params.arpEnabled;
    const prevMode = this.params.arpMode;
    const prevRate = this.params.arpRate;
    const prevOct = this.params.arpOctaves;
    const prevGate = this.params.arpGate;

    this.params = { ...params };

    if (
      prevArp !== params.arpEnabled ||
      prevMode !== params.arpMode ||
      prevRate !== params.arpRate ||
      prevOct !== params.arpOctaves ||
      prevGate !== params.arpGate
    ) {
      this.isEffectiveDirty = true;
    }
  }

  private getEffectiveNotes(): MidiNote[] {
    if (!this.isEffectiveDirty) {
      return this.effectiveNotes;
    }

    if (this.params.arpEnabled) {
      this.effectiveNotes = arpeggiateNotes(this.currentNotes, this.sequenceLengthPpq, {
        mode: this.params.arpMode,
        rate: this.params.arpRate,
        octaves: this.params.arpOctaves,
        gate: this.params.arpGate,
      });
    } else {
      this.effectiveNotes = [...this.currentNotes];
    }
    this.isEffectiveDirty = false;
    return this.effectiveNotes;
  }

  public setOnPlayheadUpdate(cb: (ppq: number) => void) {
    this.onPlayheadCallback = cb;
  }

  public setOnStateChange(cb: (playing: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  public play() {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    if (this.onStateChangeCallback) this.onStateChangeCallback(true);

    this.tickLoop();
  }

  public pause() {
    this.isPlaying = false;
    this.killAllVoices();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onStateChangeCallback) this.onStateChangeCallback(false);
  }

  public stop() {
    this.pause();
    this.currentPpq = 0;
    if (this.onPlayheadCallback) this.onPlayheadCallback(0);
    this.notifyActivePitches();
  }

  public seek(ppq: number) {
    this.currentPpq = Math.max(0, Math.min(this.sequenceLengthPpq, ppq));
    this.killAllVoices();
    if (this.onPlayheadCallback) this.onPlayheadCallback(this.currentPpq);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentPpq(): number {
    return this.currentPpq;
  }

  public auditionNote(pitch: number, velocity: number = 0.75, durationSeconds: number = 0.35) {
    this.initContext();
    this.playSynthesizerVoice({
      id: -999,
      pitch,
      startPpq: 0,
      durationPpq: (durationSeconds * (this.tempoBpm || 120)) / 60,
      velocity,
      channel: 1,
    });
  }

  private tickLoop = () => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const deltaMs = now - this.lastTimestamp;
    this.lastTimestamp = now;

    const effectiveBpm = this.tempoBpm * Math.max(0.1, this.params.speedMultiplier);
    const ppqPerMs = effectiveBpm / (60 * 1000);
    const deltaPpq = deltaMs * ppqPerMs;

    const prevPpq = this.currentPpq;
    let nextPpq = prevPpq + deltaPpq;

    // Check for note triggers in the current time step
    if (nextPpq >= this.sequenceLengthPpq) {
      if (this.params.loop) {
        // Trigger notes in tail of loop
        this.triggerNotesInRange(prevPpq, this.sequenceLengthPpq);
        nextPpq = nextPpq % this.sequenceLengthPpq;
        // Trigger notes at start of loop
        this.triggerNotesInRange(0, nextPpq);
      } else {
        this.triggerNotesInRange(prevPpq, this.sequenceLengthPpq);
        this.stop();
        return;
      }
    } else {
      this.triggerNotesInRange(prevPpq, nextPpq);
    }

    this.currentPpq = nextPpq;
    if (this.onPlayheadCallback) {
      this.onPlayheadCallback(this.currentPpq);
    }

    this.animFrameId = requestAnimationFrame(this.tickLoop);
  };

  private triggerNotesInRange(startPpq: number, endPpq: number) {
    const notesToPlay = this.getEffectiveNotes();
    for (const note of notesToPlay) {
      if (note.startPpq >= startPpq && note.startPpq < endPpq) {
        this.playSynthesizerVoice(note);
      }
    }
  }

  private playSynthesizerVoice(note: MidiNote) {
    if (!this.ctx || !this.filterNode) return;

    const transposedPitch = Math.min(127, Math.max(0, note.pitch + this.params.transpose));
    const rawVel = note.velocity;
    const finalVel = Math.min(1.0, Math.max(0.05, rawVel * this.params.velocityScale + this.params.velocityOffset / 127));

    // Frequency from MIDI pitch
    const freq = 440 * Math.pow(2, (transposedPitch - 69) / 12);

    const now = this.ctx.currentTime;
    const effectiveBpm = this.tempoBpm * Math.max(0.1, this.params.speedMultiplier);
    const durationSeconds = (note.durationPpq * 60) / effectiveBpm;

    // Oscillator 1: Warm saw
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);

    // Oscillator 2: Slightly detuned sub/triangle
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 0.998, now);

    // Voice Gain Envelope (ADSR)
    const voiceGain = this.ctx.createGain();
    const attack = 0.015;
    const release = 0.08;
    const sustainLevel = finalVel * 0.45;

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(finalVel * 0.6, now + attack);
    voiceGain.gain.exponentialRampToValueAtTime(sustainLevel, now + attack + 0.08);

    const stopTime = now + Math.max(0.05, durationSeconds);
    voiceGain.gain.setValueAtTime(sustainLevel, stopTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + release);

    osc1.connect(voiceGain);
    osc2.connect(voiceGain);
    voiceGain.connect(this.filterNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(stopTime + release + 0.05);
    osc2.stop(stopTime + release + 0.05);

    const voiceIdKey = `${note.id}-${now}-${Math.random()}`;
    this.soundingPitchesMap.set(voiceIdKey, transposedPitch);
    this.notifyActivePitches();

    const voiceEntry = {
      noteId: note.id,
      pitch: transposedPitch,
      stop: () => {
        try {
          voiceGain.gain.cancelScheduledValues(this.ctx!.currentTime);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, this.ctx!.currentTime);
          voiceGain.gain.linearRampToValueAtTime(0.0001, this.ctx!.currentTime + 0.01);
          osc1.stop(this.ctx!.currentTime + 0.02);
          osc2.stop(this.ctx!.currentTime + 0.02);
        } catch {
          // ignore already stopped
        }
      },
    };

    this.activeVoices.push(voiceEntry);

    setTimeout(() => {
      this.activeVoices = this.activeVoices.filter((v) => v !== voiceEntry);
      this.soundingPitchesMap.delete(voiceIdKey);
      this.notifyActivePitches();
    }, (durationSeconds + release + 0.05) * 1000);
  }

  private notifyActivePitches() {
    if (this.onActivePitchesCallback) {
      const uniquePitches = Array.from(new Set(this.soundingPitchesMap.values()));
      this.onActivePitchesCallback(uniquePitches);
    }
  }

  private killAllVoices() {
    for (const v of this.activeVoices) {
      v.stop();
    }
    this.activeVoices = [];
    this.soundingPitchesMap.clear();
    this.notifyActivePitches();
  }
}

export const synthAudioEngine = new AudioSynthesizerEngine();

import { MidiNote, MidiSequence } from './types';

// Preset MIDI patterns for instant auditioning
export const PRESET_SEQUENCES: MidiSequence[] = [
  {
    name: 'Neo-Soul Groove (C Minor)',
    bpm: 104,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 16,
    notes: [
      // Bar 1: Cm9
      { id: 1, pitch: 36, startPpq: 0.0, durationPpq: 3.8, velocity: 0.82, channel: 1 },
      { id: 2, pitch: 63, startPpq: 0.0, durationPpq: 3.8, velocity: 0.74, channel: 1 },
      { id: 3, pitch: 67, startPpq: 0.0, durationPpq: 3.8, velocity: 0.76, channel: 1 },
      { id: 4, pitch: 70, startPpq: 0.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },
      { id: 5, pitch: 74, startPpq: 0.0, durationPpq: 3.8, velocity: 0.85, channel: 1 },
      // Bar 2: Fm9
      { id: 6, pitch: 41, startPpq: 4.0, durationPpq: 3.8, velocity: 0.84, channel: 1 },
      { id: 7, pitch: 63, startPpq: 4.0, durationPpq: 3.8, velocity: 0.72, channel: 1 },
      { id: 8, pitch: 68, startPpq: 4.0, durationPpq: 3.8, velocity: 0.77, channel: 1 },
      { id: 9, pitch: 72, startPpq: 4.0, durationPpq: 3.8, velocity: 0.79, channel: 1 },
      { id: 10, pitch: 79, startPpq: 4.0, durationPpq: 3.8, velocity: 0.86, channel: 1 },
      // Bar 3: Bb13
      { id: 11, pitch: 46, startPpq: 8.0, durationPpq: 3.8, velocity: 0.85, channel: 1 },
      { id: 12, pitch: 62, startPpq: 8.0, durationPpq: 3.8, velocity: 0.75, channel: 1 },
      { id: 13, pitch: 68, startPpq: 8.0, durationPpq: 3.8, velocity: 0.76, channel: 1 },
      { id: 14, pitch: 72, startPpq: 8.0, durationPpq: 3.8, velocity: 0.8, channel: 1 },
      { id: 15, pitch: 79, startPpq: 8.0, durationPpq: 3.8, velocity: 0.88, channel: 1 },
      // Bar 4: EbMaj9
      { id: 16, pitch: 39, startPpq: 12.0, durationPpq: 3.8, velocity: 0.83, channel: 1 },
      { id: 17, pitch: 62, startPpq: 12.0, durationPpq: 3.8, velocity: 0.74, channel: 1 },
      { id: 18, pitch: 67, startPpq: 12.0, durationPpq: 3.8, velocity: 0.78, channel: 1 },
      { id: 19, pitch: 70, startPpq: 12.0, durationPpq: 3.8, velocity: 0.79, channel: 1 },
      { id: 20, pitch: 77, startPpq: 12.0, durationPpq: 3.8, velocity: 0.87, channel: 1 },
    ],
  },
  {
    name: 'Synth Bass Riff (F# Dorian)',
    bpm: 124,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 8,
    notes: [
      { id: 21, pitch: 42, startPpq: 0.0, durationPpq: 0.45, velocity: 0.9, channel: 1 },
      { id: 22, pitch: 42, startPpq: 0.75, durationPpq: 0.45, velocity: 0.85, channel: 1 },
      { id: 23, pitch: 45, startPpq: 1.5, durationPpq: 0.45, velocity: 0.88, channel: 1 },
      { id: 24, pitch: 47, startPpq: 2.0, durationPpq: 0.45, velocity: 0.92, channel: 1 },
      { id: 25, pitch: 49, startPpq: 2.75, durationPpq: 0.7, velocity: 0.89, channel: 1 },
      { id: 26, pitch: 47, startPpq: 3.5, durationPpq: 0.4, velocity: 0.84, channel: 1 },
      { id: 27, pitch: 42, startPpq: 4.0, durationPpq: 0.45, velocity: 0.95, channel: 1 },
      { id: 28, pitch: 54, startPpq: 4.75, durationPpq: 0.45, velocity: 0.92, channel: 1 },
      { id: 29, pitch: 52, startPpq: 5.5, durationPpq: 0.45, velocity: 0.86, channel: 1 },
      { id: 30, pitch: 49, startPpq: 6.0, durationPpq: 0.45, velocity: 0.89, channel: 1 },
      { id: 31, pitch: 45, startPpq: 6.75, durationPpq: 0.45, velocity: 0.84, channel: 1 },
      { id: 32, pitch: 47, startPpq: 7.25, durationPpq: 0.7, velocity: 0.88, channel: 1 },
    ],
  },
  {
    name: 'Jazz 2-5-1 Lead (Bb Major)',
    bpm: 118,
    timeSigNumerator: 4,
    timeSigDenominator: 4,
    totalLengthPpq: 8,
    notes: [
      { id: 33, pitch: 60, startPpq: 0.0, durationPpq: 0.9, velocity: 0.78, channel: 1 },
      { id: 34, pitch: 63, startPpq: 1.0, durationPpq: 0.9, velocity: 0.8, channel: 1 },
      { id: 35, pitch: 67, startPpq: 2.0, durationPpq: 0.9, velocity: 0.84, channel: 1 },
      { id: 36, pitch: 70, startPpq: 3.0, durationPpq: 0.9, velocity: 0.86, channel: 1 },
      { id: 37, pitch: 68, startPpq: 4.0, durationPpq: 0.9, velocity: 0.82, channel: 1 },
      { id: 38, pitch: 65, startPpq: 5.0, durationPpq: 0.9, velocity: 0.79, channel: 1 },
      { id: 39, pitch: 62, startPpq: 6.0, durationPpq: 0.9, velocity: 0.83, channel: 1 },
      { id: 40, pitch: 70, startPpq: 7.0, durationPpq: 1.0, velocity: 0.9, channel: 1 },
    ],
  },
];

/**
 * Parses binary ArrayBuffer of a .mid file into MidiSequence
 */
export function parseMidiFile(arrayBuffer: ArrayBuffer, fileName: string): MidiSequence {
  const data = new DataView(arrayBuffer);
  let offset = 0;

  // Verify Header chunk 'MThd'
  const headerId = String.fromCharCode(
    data.getUint8(offset++),
    data.getUint8(offset++),
    data.getUint8(offset++),
    data.getUint8(offset++)
  );

  if (headerId !== 'MThd') {
    throw new Error('Not a valid MIDI file: Missing MThd header chunk');
  }

  const headerLength = data.getUint32(offset);
  offset += 4;
  offset += 2; // format (0, 1, or 2)
  const numTracks = data.getUint16(offset);
  offset += 2;
  const timeDivision = data.getUint16(offset);
  offset += 2;

  const ticksPerQuarter = (timeDivision & 0x8000) === 0 ? timeDivision : 480;

  let bpm = 120;
  let timeSigNum = 4;
  let timeSigDen = 4;
  const rawEvents: Array<{ tick: number; type: 'on' | 'off'; pitch: number; vel: number; ch: number }> = [];

  // Advance past any remaining header bytes
  offset = 8 + 4 + headerLength;

  for (let t = 0; t < numTracks && offset < data.byteLength; t++) {
    if (offset + 8 > data.byteLength) break;
    const trackId = String.fromCharCode(
      data.getUint8(offset++),
      data.getUint8(offset++),
      data.getUint8(offset++),
      data.getUint8(offset++)
    );

    const trackLength = data.getUint32(offset);
    offset += 4;
    const trackEnd = offset + trackLength;

    if (trackId !== 'MTrk') {
      offset = trackEnd;
      continue;
    }

    let currentTick = 0;
    let runningStatus = 0;

    while (offset < trackEnd && offset < data.byteLength) {
      // Read variable-length delta time
      let delta = 0;
      let b = 0;
      do {
        b = data.getUint8(offset++);
        delta = (delta << 7) | (b & 0x7f);
      } while (b & 0x80);

      currentTick += delta;

      let status = data.getUint8(offset);
      if (status & 0x80) {
        runningStatus = status;
        offset++;
      } else {
        status = runningStatus;
      }

      const msgType = status & 0xf0;
      const channel = (status & 0x0f) + 1;

      if (msgType === 0x90) {
        // Note On
        const pitch = data.getUint8(offset++);
        const vel = data.getUint8(offset++);
        if (vel > 0) {
          rawEvents.push({ tick: currentTick, type: 'on', pitch, vel: vel / 127, ch: channel });
        } else {
          rawEvents.push({ tick: currentTick, type: 'off', pitch, vel: 0, ch: channel });
        }
      } else if (msgType === 0x80) {
        // Note Off
        const pitch = data.getUint8(offset++);
        const vel = data.getUint8(offset++);
        rawEvents.push({ tick: currentTick, type: 'off', pitch, vel: vel / 127, ch: channel });
      } else if (status === 0xff) {
        // Meta event
        const metaType = data.getUint8(offset++);
        let metaLen = 0;
        let mb = 0;
        do {
          mb = data.getUint8(offset++);
          metaLen = (metaLen << 7) | (mb & 0x7f);
        } while (mb & 0x80);

        if (metaType === 0x51 && metaLen === 3) {
          // Set Tempo: 3 bytes microseconds per quarter note
          const mpqn = (data.getUint8(offset) << 16) | (data.getUint8(offset + 1) << 8) | data.getUint8(offset + 2);
          bpm = Math.round(60000000 / mpqn);
        } else if (metaType === 0x58 && metaLen >= 2) {
          // Time Signature
          timeSigNum = data.getUint8(offset);
          timeSigDen = Math.pow(2, data.getUint8(offset + 1));
        }
        offset += metaLen;
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        let sysLen = 0;
        let sb = 0;
        do {
          sb = data.getUint8(offset++);
          sysLen = (sysLen << 7) | (sb & 0x7f);
        } while (sb & 0x80);
        offset += sysLen;
      } else if (msgType === 0xa0 || msgType === 0xb0 || msgType === 0xe0) {
        // 2 data bytes
        offset += 2;
      } else if (msgType === 0xc0 || msgType === 0xd0) {
        // 1 data byte
        offset += 1;
      }
    }

    offset = trackEnd;
  }

  // Sort and pair Note-On with Note-Off
  rawEvents.sort((a, b) => a.tick - b.tick);

  const notes: MidiNote[] = [];
  let nextId = 1;
  const active: Record<string, { tick: number; vel: number }> = {};

  for (const ev of rawEvents) {
    const key = `${ev.ch}_${ev.pitch}`;
    if (ev.type === 'on') {
      active[key] = { tick: ev.tick, vel: ev.vel };
    } else if (ev.type === 'off' && active[key]) {
      const startTick = active[key].tick;
      const durationTick = Math.max(ticksPerQuarter * 0.1, ev.tick - startTick);
      notes.push({
        id: nextId++,
        pitch: ev.pitch,
        startPpq: startTick / ticksPerQuarter,
        durationPpq: durationTick / ticksPerQuarter,
        velocity: active[key].vel,
        channel: ev.ch,
      });
      delete active[key];
    }
  }

  // Calculate length rounded to bar boundaries
  let maxPpq = 4;
  for (const n of notes) {
    maxPpq = Math.max(maxPpq, n.startPpq + n.durationPpq);
  }
  const barPpq = timeSigNum * (4 / timeSigDen);
  const totalLengthPpq = Math.ceil(maxPpq / barPpq) * barPpq;

  return {
    name: fileName.replace(/\.[^/.]+$/, ''),
    bpm,
    timeSigNumerator: timeSigNum,
    timeSigDenominator: timeSigDen,
    totalLengthPpq,
    notes,
  };
}

/**
 * Serializes sequence with transpose, velocity scale/offset, and tempo to .mid binary
 */
export function serializeMidiFile(
  sequence: MidiSequence,
  transpose: number,
  velocityScale: number,
  velocityOffset: number,
  bpm: number
): Uint8Array {
  const ticksPerQuarter = 960;
  const bytes: number[] = [];

  const writeUint16 = (val: number) => {
    bytes.push((val >> 8) & 0xff, val & 0xff);
  };

  const writeUint32 = (val: number) => {
    bytes.push((val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff);
  };

  const writeVarLength = (val: number) => {
    const buffer: number[] = [];
    buffer.push(val & 0x7f);
    let shifted = val >> 7;
    while (shifted > 0) {
      buffer.push((shifted & 0x7f) | 0x80);
      shifted >>= 7;
    }
    for (let i = buffer.length - 1; i >= 0; i--) {
      bytes.push(buffer[i]);
    }
  };

  // Header chunk: 'MThd', length 6, format 0, 1 track, 960 ticks
  bytes.push(0x4d, 0x54, 0x68, 0x64);
  writeUint32(6);
  writeUint16(0); // format 0
  writeUint16(1); // 1 track
  writeUint16(ticksPerQuarter);

  // Track data
  const trackBytes: number[] = [];

  const trackVarLength = (val: number) => {
    const buffer: number[] = [];
    buffer.push(val & 0x7f);
    let shifted = val >> 7;
    while (shifted > 0) {
      buffer.push((shifted & 0x7f) | 0x80);
      shifted >>= 7;
    }
    for (let i = buffer.length - 1; i >= 0; i--) {
      trackBytes.push(buffer[i]);
    }
  };

  // Tempo meta event at tick 0
  trackVarLength(0);
  trackBytes.push(0xff, 0x51, 0x03);
  const mpqn = Math.round(60000000 / Math.max(20, bpm));
  trackBytes.push((mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff);

  // Time signature meta event
  trackVarLength(0);
  trackBytes.push(0xff, 0x58, 0x04);
  const denPow = Math.round(Math.log2(sequence.timeSigDenominator || 4));
  trackBytes.push(sequence.timeSigNumerator || 4, denPow, 24, 8);

  // Prepare note events
  interface MidiRawEvent {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
    velocity: number;
    channel: number;
  }
  const events: MidiRawEvent[] = [];

  for (const n of sequence.notes) {
    const pitch = Math.min(127, Math.max(0, n.pitch + transpose));
    const vel = Math.min(127, Math.max(1, Math.round(n.velocity * 127 * velocityScale + velocityOffset)));
    const startTick = Math.round(n.startPpq * ticksPerQuarter);
    const endTick = Math.round((n.startPpq + n.durationPpq) * ticksPerQuarter);

    events.push({ tick: startTick, type: 'on', pitch, velocity: vel, channel: n.channel || 1 });
    events.push({ tick: endTick, type: 'off', pitch, velocity: 0, channel: n.channel || 1 });
  }

  events.sort((a, b) => a.tick - b.tick);

  let lastTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;

    trackVarLength(delta);
    const status = (ev.type === 'on' ? 0x90 : 0x80) | ((ev.channel - 1) & 0x0f);
    trackBytes.push(status, ev.pitch, ev.velocity);
  }

  // End of Track meta event
  trackVarLength(ticksPerQuarter);
  trackBytes.push(0xff, 0x2f, 0x00);

  // Track Chunk 'MTrk'
  bytes.push(0x4d, 0x54, 0x72, 0x6b);
  writeUint32(trackBytes.length);
  for (const b of trackBytes) {
    bytes.push(b);
  }

  return new Uint8Array(bytes);
}

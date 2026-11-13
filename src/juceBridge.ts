// Native JUCE 8 WebBrowserComponent bidirectional bridge utilities

export interface JuceBackend {
  addEventListener: (eventId: string, fn: (payload: any) => void) => [string, number] | unknown;
  removeEventListener?: (token: any) => void;
  emitEvent: (eventId: string, payload: any) => void;
}

declare global {
  interface Window {
    __JUCE__?: {
      backend?: JuceBackend;
      initialisationData?: Record<string, unknown>;
    };
  }
}

export function getJuceBackend(): JuceBackend | null {
  if (typeof window !== 'undefined' && window.__JUCE__?.backend) {
    return window.__JUCE__.backend;
  }
  return null;
}

export function isJuceNative(): boolean {
  return getJuceBackend() !== null;
}

export function emitToJuce(eventId: string, payload: unknown = {}): boolean {
  const backend = getJuceBackend();
  if (!backend) return false;
  try {
    backend.emitEvent(eventId, payload);
    return true;
  } catch (err) {
    console.error(`[MidiLens JUCE Bridge] Failed to emit "${eventId}":`, err);
    return false;
  }
}

export function onJuceEvent(eventId: string, handler: (payload: any) => void): () => void {
  const backend = getJuceBackend();
  if (!backend) return () => {};
  const token = backend.addEventListener(eventId, handler);
  return () => {
    try {
      if (backend.removeEventListener && token !== undefined) {
        backend.removeEventListener(token);
      }
    } catch {
      // ignore cleanup errors
    }
  };
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(slice)));
  }
  return btoa(chunks.join(''));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

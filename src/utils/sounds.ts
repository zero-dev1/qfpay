// Synthesized sound effects using Web Audio API
// No external files needed — generates clean, premium-sounding tones

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Burn sound — low rumble with crackle, fading out
 * Evokes destruction/dissolve
 */
export function playBurnSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Low rumble via filtered noise
    const bufferSize = ctx.sampleRate * 0.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.8);
  } catch {
    // Silently fail if audio not available
  }
}

/**
 * Send sound — quick ascending whoosh
 * Evokes movement/transfer
 */
export function playSendSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.setValueAtTime(0.12, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Silently fail
  }
}

/**
 * Success sound — two-tone ascending chime (like Apple Pay confirmation)
 * Clean, premium, satisfying
 */
export function playSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First tone — E5
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second tone — G#5 (slightly delayed, slightly louder)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);

    // Third tone — B5 (final, highest, most satisfying)
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.24);

    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0, now + 0.24);
    gain3.gain.linearRampToValueAtTime(0.18, now + 0.26);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.8);
  } catch {
    // Silently fail
  }
}

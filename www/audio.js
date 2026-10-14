/**
 * ZenHitori Procedural Audio Synthesizer
 * Pure Web Audio API — No external audio files or network requests.
 * Features:
 * - River stone placement click (tactile stone on slate)
 * - Singing bowl ring harmonic (when marking safe white)
 * - Bamboo stick clack (unmarking / neutral)
 * - Wind chime shimmer (hints)
 * - Deep resonant Zen temple gong / victory bell (level clear)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZenAudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let ctx = null;
  let isMuted = false;

  // Initialize Web Audio Context on first user gesture
  function initAudio() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        ctx = new AudioContext();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function setMuted(muted) {
    isMuted = muted;
    try {
      localStorage.setItem('zenhitori_muted', isMuted ? '1' : '0');
    } catch (e) {}
  }

  function toggleMute() {
    setMuted(!isMuted);
    return isMuted;
  }

  function getMuted() {
    return isMuted;
  }

  // Load mute setting from localStorage
  try {
    const saved = localStorage.getItem('zenhitori_muted');
    if (saved !== null) {
      isMuted = saved === '1';
    }
  } catch (e) {}

  /**
   * Tactile stone click (shading a cell with a black river stone)
   */
  function playStoneClick() {
    if (isMuted) return;
    initAudio();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Wood/stone transient pitch drop
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    // Subtle click burst
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    }
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.Q.setValueAtTime(2, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
    noise.start(t);
  }

  /**
   * Tibetan singing bowl ring harmonic (circling safe white)
   */
  function playWhiteCircle() {
    if (isMuted) return;
    initAudio();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Harmonic frequencies for a gentle singing bowl
    const freqs = [528, 1056, 1584];
    const gains = [0.15, 0.06, 0.02];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() * 2 - 1), t);

      // Gentle envelope with lingering bell sustain
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(gains[idx], t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      osc.connect(g);
      g.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  /**
   * Bamboo clack (clearing cell back to neutral or undo)
   */
  function playBambooClack() {
    if (isMuted) return;
    initAudio();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.05);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Wind chime shimmer (hint revealed)
   */
  function playHintChime() {
    if (isMuted) return;
    initAudio();
    if (!ctx) return;

    const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * Resonant Zen Temple Victory Bell & Gong
   */
  function playVictoryGong() {
    if (isMuted) return;
    initAudio();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Deep fundamental and peaceful upper partials (Japanese temple bell)
    const partials = [
      { f: 216, gain: 0.35, decay: 2.8 },
      { f: 432, gain: 0.28, decay: 2.2 },
      { f: 648, gain: 0.16, decay: 1.6 },
      { f: 864, gain: 0.10, decay: 1.2 },
      { f: 1296, gain: 0.05, decay: 0.8 }
    ];

    partials.forEach(p => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(p.gain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);

      osc.connect(g);
      g.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + p.decay + 0.1);
    });
  }

  return {
    initAudio,
    setMuted,
    toggleMute,
    getMuted,
    playStoneClick,
    playWhiteCircle,
    playBambooClack,
    playHintChime,
    playVictoryGong
  };
});

/*
 * audio.js — a minimal WebAudio synth. No asset files; every sound is
 * generated. Must be unlocked by a user gesture (mobile autoplay policy);
 * input.js calls FD.audio.unlock() on the first interaction.
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';

  const Audio = {
    ctx: null,
    master: null,
    muted: false,
    _ambient: null,

    unlock() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
    },

    // Core blip: an oscillator with an envelope.
    blip(freq, dur, type, vol, slideTo) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    noise(dur, vol, filterFreq) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq || 1200;
      const g = this.ctx.createGain();
      g.gain.value = vol || 0.3;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t);
    },

    eat() {
      this.blip(620, 0.12, 'sine', 0.28, 880);
    },
    combo(n) {
      this.blip(520 + n * 60, 0.12, 'triangle', 0.3, 760 + n * 60);
    },
    hit() {
      this.noise(0.22, 0.4, 700);
      this.blip(180, 0.18, 'sawtooth', 0.25, 80);
    },
    shield() {
      this.blip(300, 0.2, 'square', 0.25, 660);
    },
    powerup() {
      this.blip(440, 0.1, 'square', 0.25);
      setTimeout(() => this.blip(660, 0.12, 'square', 0.25), 90);
      setTimeout(() => this.blip(880, 0.14, 'square', 0.25), 190);
    },
    plunger() {
      this.blip(120, 0.1, 'sine', 0.4, 60);
      this.noise(0.08, 0.3, 500);
    },
    death() {
      this.blip(400, 0.5, 'sawtooth', 0.35, 60);
      this.noise(0.5, 0.3, 600);
    },
    win() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.3), i * 140));
    },
    click() {
      this.blip(660, 0.06, 'square', 0.2);
    },
    zone() {
      this.blip(330, 0.18, 'triangle', 0.25, 494);
    },
  };

  FD.audio = Audio;
})(window.FD);

/*
 * music.js — background music. A pool of tracks lives in www/assets/music/;
 * a fresh one is chosen at random every time a run starts (see game.start()).
 * Uses a single HTMLAudioElement (streams + loops one track at a time) so we
 * never preload 40 MB of audio up front. Honours the global mute toggle.
 *
 * To add/remove songs, drop an .mp3 in assets/music/ and edit TRACKS below.
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';

  const TRACKS = [
    { src: 'assets/music/sewer-fish.mp3', title: 'Sewer Fish' },
    { src: 'assets/music/sewer-fish-2.mp3', title: 'Sewer Fish II' },
    { src: 'assets/music/bubbles-in-the-sewer.mp3', title: 'Bubbles in the Sewer' },
    { src: 'assets/music/bubbles-in-the-sewer-2.mp3', title: 'Bubbles in the Sewer II' },
    { src: 'assets/music/sewer-surf.mp3', title: 'Sewer Surf' },
    { src: 'assets/music/sewer-surf-2.mp3', title: 'Sewer Surf II' },
    { src: 'assets/music/sewer-surf-3.mp3', title: 'Sewer Surf III' },
    { src: 'assets/music/sewer-surf-4.mp3', title: 'Sewer Surf IV' },
    { src: 'assets/music/sewer-surf-5.mp3', title: 'Sewer Surf V' },
    { src: 'assets/music/sewer-surf-6.mp3', title: 'Sewer Surf VI' },
    { src: 'assets/music/sewer-surf-7.mp3', title: 'Sewer Surf VII' },
    { src: 'assets/music/surfing-the-waves.mp3', title: 'Surfing the Waves' },
    { src: 'assets/music/island-of-the-sun.mp3', title: 'Island of the Sun' },
    { src: 'assets/music/island-of-the-sun-2.mp3', title: 'Island of the Sun II' },
    { src: 'assets/music/mystery-of-the-surf.mp3', title: 'The Mystery of the Surf' },
    { src: 'assets/music/mystery-of-the-surf-2.mp3', title: 'The Mystery of the Surf II' },
  ];

  const Music = {
    el: null,
    idx: -1,
    volume: 0.4,
    tracks: TRACKS,
    _fails: 0,

    _ensure() {
      if (this.el) return;
      const a = new Audio();
      a.loop = true;
      a.preload = 'none';
      a.volume = FD.audio && FD.audio.muted ? 0 : this.volume;
      // a track started fine — clear the failure streak
      a.addEventListener('playing', () => {
        this._fails = 0;
      });
      // if a track 404s or fails to decode, try another — but give up after a
      // few consecutive failures so a missing assets folder can't spin forever
      a.addEventListener('error', () => {
        if (TRACKS.length > 1 && this._fails++ < TRACKS.length) this.playRandom();
      });
      this.el = a;
    },

    // Pick a random track (never the one that just played) and start it.
    // Returns the chosen title. Called from a user-gesture path (game start),
    // which satisfies mobile autoplay policies.
    playRandom() {
      this._ensure();
      let i = Math.floor(Math.random() * TRACKS.length);
      if (TRACKS.length > 1) {
        let guard = 0;
        while (i === this.idx && guard++ < 8) i = Math.floor(Math.random() * TRACKS.length);
      }
      this.idx = i;
      this.el.src = TRACKS[i].src;
      try {
        this.el.currentTime = 0;
      } catch (e) {
        /* not ready yet — fine */
      }
      this.el.volume = FD.audio && FD.audio.muted ? 0 : this.volume;
      const p = this.el.play();
      if (p && p.catch) p.catch(() => {});
      return TRACKS[i].title;
    },

    stop() {
      if (!this.el) return;
      this.el.pause();
      try {
        this.el.currentTime = 0;
      } catch (e) {
        /* ignore */
      }
    },

    pause() {
      if (this.el) this.el.pause();
    },

    resume() {
      if (this.el && this.el.src && !(FD.audio && FD.audio.muted)) {
        const p = this.el.play();
        if (p && p.catch) p.catch(() => {});
      }
    },

    setMuted(m) {
      if (this.el) this.el.volume = m ? 0 : this.volume;
    },

    currentTitle() {
      return this.idx >= 0 ? TRACKS[this.idx].title : '';
    },
  };

  FD.music = Music;
})(window.FD);

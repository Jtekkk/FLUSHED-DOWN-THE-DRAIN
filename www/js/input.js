/*
 * input.js — one-button input. Anything that means "swim up" (key, mouse,
 * touch) flips a single `thrust` flag. The game reads `FD.input.thrust` each
 * frame and uses `consumePress()` for menu/restart taps.
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';

  const Input = {
    thrust: false,
    _pressed: false, // edge: a new press happened since last consume
    pointers: new Set(),

    init(canvas) {
      const down = (e) => {
        FD.audio.unlock();
        this._press();
        // Avoid the browser turning a hold into scroll/zoom/select.
        if (e.cancelable) e.preventDefault();
      };
      const up = () => this._release();

      // Keyboard: space / up / W / enter all act as the one button.
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) {
          e.preventDefault();
          FD.audio.unlock();
          this._press();
        } else if (e.code === 'KeyM') {
          FD.toggleMute && FD.toggleMute();
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
          FD.togglePause && FD.togglePause();
        }
      });
      window.addEventListener('keyup', (e) => {
        if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) this._release();
      });

      // Pointer events cover mouse + touch + pen uniformly.
      const target = canvas;
      target.addEventListener('pointerdown', (e) => {
        this.pointers.add(e.pointerId);
        down(e);
      });
      target.addEventListener('pointerup', (e) => {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size === 0) up();
      });
      target.addEventListener('pointercancel', (e) => {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size === 0) up();
      });
      target.addEventListener('pointerleave', (e) => {
        // Only release if no touches remain (mouse leaving canvas).
        if (this.pointers.size === 0) up();
      });
      // Block context menu / gesture zoom on long press.
      target.addEventListener('contextmenu', (e) => e.preventDefault());
      target.addEventListener('touchmove', (e) => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
    },

    _press() {
      this.thrust = true;
      this._pressed = true;
    },
    _release() {
      this.thrust = false;
    },

    // Returns true once per press; used for menu/start/restart.
    consumePress() {
      if (this._pressed) {
        this._pressed = false;
        return true;
      }
      return false;
    },
  };

  FD.input = Input;
})(window.FD);

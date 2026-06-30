/*
 * util.js — tiny helpers + a particle system.
 * Everything hangs off the global `FD` namespace so the plain <script> tags
 * in index.html can share state without a bundler (works in browser, Electron
 * and a Capacitor WebView alike).
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;

  // Circle vs axis-aligned rectangle overlap.
  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= cr * cr;
  }

  const circleCircle = (ax, ay, ar, bx, by, br) => {
    const dx = ax - bx;
    const dy = ay - by;
    const r = ar + br;
    return dx * dx + dy * dy <= r * r;
  };

  // Pick a weighted key from { key: weight, ... }
  function weighted(table) {
    let total = 0;
    for (const k in table) total += table[k];
    let r = Math.random() * total;
    for (const k in table) {
      r -= table[k];
      if (r <= 0) return k;
    }
    return Object.keys(table)[0];
  }

  // Lightweight particle pool. One system instance lives on the game.
  class Particles {
    constructor() {
      this.list = [];
    }
    spawn(opts) {
      this.list.push({
        x: opts.x,
        y: opts.y,
        vx: opts.vx || 0,
        vy: opts.vy || 0,
        life: opts.life || 0.6,
        age: 0,
        r: opts.r || 3,
        rEnd: opts.rEnd != null ? opts.rEnd : opts.r || 3,
        color: opts.color || '#fff',
        gravity: opts.gravity || 0,
        drag: opts.drag != null ? opts.drag : 1,
        shape: opts.shape || 'circle', // circle | spark | ring
        rot: opts.rot || 0,
        spin: opts.spin || 0,
      });
    }
    burst(x, y, n, opts) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(opts.speedMin || 40, opts.speedMax || 160);
        this.spawn(
          Object.assign({}, opts, {
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
          })
        );
      }
    }
    update(dt) {
      const l = this.list;
      for (let i = l.length - 1; i >= 0; i--) {
        const p = l[i];
        p.age += dt;
        if (p.age >= p.life) {
          l.splice(i, 1);
          continue;
        }
        p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
      }
    }
    draw(ctx) {
      const l = this.list;
      for (let i = 0; i < l.length; i++) {
        const p = l[i];
        const t = p.age / p.life;
        const r = lerp(p.r, p.rEnd, t);
        const alpha = 1 - t;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.shape === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.shape === 'spark') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-r, -r * 0.35, r * 2, r * 0.7);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    clear() {
      this.list.length = 0;
    }
  }

  // Rounded-rect path helper.
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  FD.util = {
    clamp,
    lerp,
    rand,
    randInt,
    pick,
    chance,
    circleRect,
    circleCircle,
    weighted,
    roundRect,
    Particles,
  };
})(window.FD);

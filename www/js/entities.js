/*
 * entities.js — Sir Reginald Bubbles III and everything trying to kill or feed
 * him. Each spawnable returns a plain object exposing update(dt, g), draw(ctx,
 * g) and collides(p). The game loop (game.js) owns collision resolution; these
 * objects only describe their own shape, motion and looks.
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';
  const U = FD.util;
  const { clamp, lerp, rand, randInt, circleRect, circleCircle, roundRect } = U;

  /* ----------------------------------------------------------------- Player */
  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vy = 0;
      this.r = 22;
      this.maxHealth = 100;
      this.health = 100;
      this.invuln = 0; // brief i-frames after a hit
      this.shield = 0; // antacid charges (absorb a hit)
      this.soap = 0; // soap-bubble timer (invincible + fast + slippery)
      this.hot = 0; // hot-sauce timer (fast + twitchy)
      this.tail = 0; // tail-wag phase
      this.tilt = 0;
      this.alive = true;
      this.bubbleT = 0;
    }

    get invincible() {
      return this.soap > 0 || this.invuln > 0;
    }

    update(dt, g, thrust) {
      // Effect timers.
      this.invuln = Math.max(0, this.invuln - dt);
      this.soap = Math.max(0, this.soap - dt);
      this.hot = Math.max(0, this.hot - dt);

      // Control feel changes with active power-ups.
      let gravity = 1250;
      let thrustA = 2550;
      let vyCap = 560;
      if (this.soap > 0) {
        // slippery: sluggish to change direction
        gravity = 820;
        thrustA = 1500;
        vyCap = 700;
      } else if (this.hot > 0) {
        // twitchy: harder to hold a line
        thrustA = 2050;
        gravity = 1400;
        vyCap = 620;
      }

      // Canvas y grows downward: thrusting pushes vy negative (up), otherwise
      // gravity pulls it positive (sink).
      this.vy += (thrust ? -thrustA : gravity) * dt;
      this.vy = clamp(this.vy, -vyCap, vyCap);
      this.y += this.vy * dt;

      // Pipe walls: clamp + chip damage while scraping (unless invincible).
      const top = g.wallTop + this.r;
      const bot = g.wallBottom - this.r;
      if (this.y < top) {
        this.y = top;
        if (this.vy < 0) this.vy = 0;
        this.scrape(dt, g, 'wall');
      } else if (this.y > bot) {
        this.y = bot;
        if (this.vy > 0) this.vy = 0;
        this.scrape(dt, g, 'wall');
      }

      // Animation.
      this.tail += dt * (10 + Math.abs(this.vy) * 0.02);
      this.tilt = lerp(this.tilt, clamp(this.vy / 560, -1, 1) * 0.5, dt * 8);

      // Trailing bubbles.
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) {
        this.bubbleT = rand(0.12, 0.26);
        g.particles.spawn({
          x: this.x + 14,
          y: this.y - 6,
          vx: rand(20, 60),
          vy: rand(-30, -10),
          r: rand(2, 4),
          rEnd: 0.5,
          life: rand(0.5, 1.0),
          color: 'rgba(220,240,255,0.6)',
          drag: 0.98,
        });
      }
    }

    scrape(dt, g, cause) {
      if (this.invincible) return;
      this.health -= 10 * dt;
      g.onScrape && g.onScrape(cause);
      if (this.health <= 0) g.kill('wall');
    }

    // Apply a hazard hit. Returns true if it landed (caused damage/death).
    takeHit(dmg, cause, g) {
      if (this.invincible) return false;
      if (this.shield > 0) {
        this.shield--;
        this.invuln = 0.9;
        this.vy = -260; // bounce off
        FD.audio.shield();
        g.onShieldPop && g.onShieldPop();
        return false;
      }
      this.health -= dmg;
      this.invuln = 0.6;
      FD.audio.hit();
      g.onHit && g.onHit(cause);
      if (this.health <= 0) {
        this.health = 0;
        g.kill(cause);
      }
      return true;
    }

    heal(amount) {
      this.health = clamp(this.health + amount, 0, this.maxHealth);
    }

    draw(ctx, g) {
      const flicker = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.tilt);
      if (flicker) ctx.globalAlpha = 0.35;

      const wag = Math.sin(this.tail) * 0.5;

      // Tail fin.
      ctx.fillStyle = '#e8893a';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.quadraticCurveTo(-30, -16 + wag * 8, -34, -6 + wag * 10);
      ctx.quadraticCurveTo(-26, 0, -34, 6 - wag * 10);
      ctx.quadraticCurveTo(-30, 16 - wag * 8, -16, 0);
      ctx.fill();

      // Body.
      const grad = ctx.createLinearGradient(0, -20, 0, 20);
      grad.addColorStop(0, '#ffb24d');
      grad.addColorStop(0.5, '#ff8c1a');
      grad.addColorStop(1, '#e0700f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly sheen.
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(-2, 5, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dorsal fin.
      ctx.fillStyle = '#f0a040';
      ctx.beginPath();
      ctx.moveTo(2, -13);
      ctx.quadraticCurveTo(-6, -26, -12, -12);
      ctx.fill();
      // Pectoral fin (wagging).
      ctx.beginPath();
      ctx.moveTo(2, 8);
      ctx.quadraticCurveTo(-4, 20 + wag * 6, -10, 12);
      ctx.fill();

      // Eye.
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(12, -4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(13.5, -4, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(14.5, -5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Mouth (gulping).
      const gulp = (Math.sin(this.tail * 0.7) * 0.5 + 0.5) * 2;
      ctx.strokeStyle = '#9a4a08';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(20, 1, 3 + gulp, -0.4, 0.9);
      ctx.stroke();

      ctx.restore();

      // Power-up auras (drawn in world space, unrotated).
      if (this.shield > 0) {
        ctx.strokeStyle = 'rgba(120,255,160,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30 + Math.sin(g.time * 6) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.soap > 0) {
        const a = clamp(this.soap, 0, 1) * 0.9;
        const bub = ctx.createRadialGradient(this.x - 8, this.y - 8, 4, this.x, this.y, 34);
        bub.addColorStop(0, 'rgba(255,255,255,' + 0.5 * a + ')');
        bub.addColorStop(0.7, 'rgba(180,220,255,' + 0.15 * a + ')');
        bub.addColorStop(1, 'rgba(150,200,255,0)');
        ctx.fillStyle = bub;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * a + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (this.hot > 0) {
        for (let i = 0; i < 2; i++) {
          g.particles.spawn({
            x: this.x - 18,
            y: this.y + rand(-6, 6),
            vx: rand(-120, -60),
            vy: rand(-20, 20),
            r: rand(4, 8),
            rEnd: 0.5,
            life: 0.4,
            color: i ? 'rgba(255,180,40,0.9)' : 'rgba(255,90,20,0.9)',
            drag: 0.92,
          });
        }
      }
    }
  }

  /* -------------------------------------------------------------- Obstacles */
  // Brown blobs — basic floaters / poop logs.
  function makeFloater(g) {
    const big = U.chance(0.4);
    const w = big ? rand(70, 100) : rand(44, 64);
    const h = big ? rand(38, 52) : rand(26, 36);
    const y = rand(g.wallTop + h / 2 + 10, g.wallBottom - h / 2 - 10);
    return {
      kind: 'floater',
      cat: 'hazard',
      damage: big ? 26 : 16,
      x: g.W + w,
      y,
      w,
      h,
      seed: rand(0, 10),
      collides(p) {
        return circleRect(p.x, p.y, p.r * 0.85, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      },
      update(dt, g) {
        this.x -= g.scroll * dt;
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const grd = ctx.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
        grd.addColorStop(0, '#7a5223');
        grd.addColorStop(1, '#4a2f12');
        ctx.fillStyle = grd;
        roundRect(ctx, -this.w / 2, -this.h / 2, this.w, this.h, this.h / 2);
        ctx.fill();
        // lumps
        ctx.fillStyle = 'rgba(90,60,25,0.9)';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * this.w * 0.28, Math.sin(this.seed + i) * 4, this.h * 0.34, 0, Math.PI * 2);
          ctx.fill();
        }
        // sheen
        ctx.fillStyle = 'rgba(255,220,150,0.12)';
        roundRect(ctx, -this.w / 2 + 4, -this.h / 2 + 3, this.w - 8, this.h * 0.3, this.h * 0.2);
        ctx.fill();
        ctx.restore();
      },
    };
  }

  // Wet TP clouds that bloom as you near them, pinching the gap.
  function makeTP(g) {
    const gapY = rand(g.wallTop + 130, g.wallBottom - 130);
    return {
      kind: 'tp',
      cat: 'hazard',
      damage: 18,
      x: g.W + 80,
      gapY,
      grow: 0,
      baseTop: rand(40, 70),
      baseBot: rand(40, 70),
      update(dt, g) {
        this.x -= g.scroll * dt;
        // bloom when the fish gets within ~360px
        const near = clamp(1 - Math.abs(this.x - g.player.x) / 360, 0, 1);
        this.grow = lerp(this.grow, near, dt * 4);
      },
      _radii() {
        const extra = this.grow * 48;
        return { rt: this.baseTop + extra, rb: this.baseBot + extra };
      },
      collides(p) {
        const { rt, rb } = this._radii();
        const topY = g.wallTop + rt - 30;
        const botY = g.wallBottom - rb + 30;
        return (
          circleCircle(p.x, p.y, p.r, this.x, topY, rt * 0.8) ||
          circleCircle(p.x, p.y, p.r, this.x, botY, rb * 0.8)
        );
      },
      draw(ctx) {
        const { rt, rb } = this._radii();
        const topY = g.wallTop + rt - 30;
        const botY = g.wallBottom - rb + 30;
        ctx.fillStyle = '#eee7da';
        for (const [cy, rr] of [[topY, rt], [botY, rb]]) {
          ctx.save();
          ctx.translate(this.x, cy);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5, rr * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#d7cdba';
          ctx.beginPath();
          ctx.arc(0, 0, rr * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#eee7da';
          ctx.restore();
        }
      },
    };
  }

  // Stringy hair net across the pipe with one ragged hole to thread.
  function makeHair(g) {
    const holeH = rand(110, 150);
    const holeY = rand(g.wallTop + holeH / 2 + 20, g.wallBottom - holeH / 2 - 20);
    const w = 26;
    return {
      kind: 'hair',
      cat: 'hazard',
      damage: 34,
      x: g.W + w,
      w,
      holeY,
      holeH,
      update(dt, g) {
        this.x -= g.scroll * dt;
      },
      collides(p) {
        const left = this.x - this.w / 2;
        if (p.x + p.r < left || p.x - p.r > left + this.w) return false;
        const holeTop = this.holeY - this.holeH / 2;
        const holeBot = this.holeY + this.holeH / 2;
        // hit if overlapping the netting above or below the hole
        if (circleRect(p.x, p.y, p.r * 0.9, left, g.wallTop, this.w, holeTop - g.wallTop)) return true;
        if (circleRect(p.x, p.y, p.r * 0.9, left, holeBot, this.w, g.wallBottom - holeBot)) return true;
        return false;
      },
      draw(ctx) {
        const left = this.x - this.w / 2;
        const holeTop = this.holeY - this.holeH / 2;
        const holeBot = this.holeY + this.holeH / 2;
        ctx.strokeStyle = 'rgba(40,30,28,0.85)';
        ctx.lineWidth = 2;
        const drawNet = (y0, y1) => {
          ctx.fillStyle = 'rgba(60,48,42,0.5)';
          ctx.fillRect(left, y0, this.w, y1 - y0);
          for (let i = 0; i < 14; i++) {
            const yy = lerp(y0, y1, i / 13);
            ctx.beginPath();
            ctx.moveTo(left, yy);
            ctx.bezierCurveTo(left + 8, yy + 6, left + 18, yy - 6, left + this.w, yy + 2);
            ctx.stroke();
          }
        };
        drawNet(g.wallTop, holeTop);
        drawNet(holeBot, g.wallBottom);
        // ragged hole rim
        ctx.strokeStyle = 'rgba(30,20,18,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(left + this.w / 2, holeTop);
        ctx.lineTo(left + this.w / 2, holeBot);
        ctx.stroke();
      },
    };
  }

  // Metal drain grate: solid bars with evenly spaced slots; align with one.
  function makeGrate(g) {
    const slots = randInt(2, 3);
    const w = 18;
    const span = g.wallBottom - g.wallTop;
    const slotH = 78;
    // place `slots` openings at random non-overlapping-ish positions
    const centers = [];
    for (let i = 0; i < slots; i++) {
      centers.push(g.wallTop + (span * (i + 0.5)) / slots + rand(-30, 30));
    }
    return {
      kind: 'grate',
      cat: 'hazard',
      damage: 24,
      x: g.W + w,
      w,
      centers,
      slotH,
      update(dt, g) {
        this.x -= g.scroll * dt;
      },
      _bars() {
        // build solid segments = everything except the slots
        const open = this.centers
          .map((c) => [c - this.slotH / 2, c + this.slotH / 2])
          .sort((a, b) => a[0] - b[0]);
        const bars = [];
        let y = g.wallTop;
        for (const [o0, o1] of open) {
          if (o0 > y) bars.push([y, o0]);
          y = Math.max(y, o1);
        }
        if (y < g.wallBottom) bars.push([y, g.wallBottom]);
        return bars;
      },
      collides(p) {
        const left = this.x - this.w / 2;
        if (p.x + p.r < left || p.x - p.r > left + this.w) return false;
        for (const [y0, y1] of this._bars()) {
          if (circleRect(p.x, p.y, p.r * 0.9, left, y0, this.w, y1 - y0)) return true;
        }
        return false;
      },
      draw(ctx) {
        const left = this.x - this.w / 2;
        for (const [y0, y1] of this._bars()) {
          const grd = ctx.createLinearGradient(left, 0, left + this.w, 0);
          grd.addColorStop(0, '#9aa6ad');
          grd.addColorStop(0.5, '#5e6a72');
          grd.addColorStop(1, '#3c454b');
          ctx.fillStyle = grd;
          roundRect(ctx, left, y0, this.w, y1 - y0, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(left + 2, y0 + 2, 3, y1 - y0 - 4);
          // rust
          ctx.fillStyle = 'rgba(120,70,30,0.35)';
          ctx.fillRect(left + this.w - 5, y0 + 6, 3, Math.max(0, y1 - y0 - 12));
        }
      },
    };
  }

  // Rogue plunger that thwocks across the channel from a wall on a rhythm.
  function makePlunger(g) {
    const fromTop = U.chance(0.5);
    const reach = rand(170, 230);
    const w = 40;
    const period = rand(1.1, 1.6);
    return {
      kind: 'plunger',
      cat: 'hazard',
      damage: 28,
      x: g.W + 60,
      w,
      fromTop,
      reach,
      period,
      t: rand(0, period),
      ext: 0,
      _prevExt: 0,
      update(dt, g) {
        this.x -= g.scroll * dt;
        this.t += dt;
        // sharp out, slower retract -> "thwock"
        const phase = (this.t % this.period) / this.period;
        this._prevExt = this.ext;
        this.ext = phase < 0.18 ? phase / 0.18 : Math.max(0, 1 - (phase - 0.18) / 0.82);
        if (this._prevExt < 0.6 && this.ext >= 0.6 && Math.abs(this.x - g.player.x) < g.W) {
          FD.audio.plunger();
        }
      },
      _rect() {
        const len = this.reach * this.ext;
        const x = this.x - this.w / 2;
        if (this.fromTop) return [x, g.wallTop, this.w, len];
        return [x, g.wallBottom - len, this.w, len];
      },
      collides(p) {
        const [rx, ry, rw, rh] = this._rect();
        if (rh < 6) return false;
        return circleRect(p.x, p.y, p.r * 0.9, rx, ry, rw, rh);
      },
      draw(ctx) {
        const [rx, ry, rw, rh] = this._rect();
        if (rh < 4) return;
        const tipY = this.fromTop ? ry + rh : ry;
        // wooden shaft
        ctx.fillStyle = '#b5803f';
        ctx.fillRect(this.x - 5, this.fromTop ? ry : ry, 10, rh);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(this.x - 5, ry, 3, rh);
        // red rubber cup at the tip
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.ellipse(this.x, tipY, this.w / 2, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#902619';
        ctx.beginPath();
        ctx.ellipse(this.x, tipY + (this.fromTop ? 6 : -6), this.w / 2.4, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    };
  }

  // Sewer rat: darts in from a side pipe and chases the fish's depth.
  function makeRat(g) {
    const fromTop = U.chance(0.5);
    return {
      kind: 'rat',
      cat: 'hazard',
      damage: 14,
      x: g.W + 40,
      y: fromTop ? g.wallTop + 20 : g.wallBottom - 20,
      r: 18,
      vx: -rand(40, 90),
      legPhase: 0,
      update(dt, g) {
        this.x -= (g.scroll + 60) * dt; // a touch faster than the current
        // chase player's depth
        const dy = g.player.y - this.y;
        this.y += clamp(dy, -120 * dt, 120 * dt);
        this.y = clamp(this.y, g.wallTop + this.r, g.wallBottom - this.r);
        this.legPhase += dt * 18;
      },
      collides(p) {
        return circleCircle(p.x, p.y, p.r, this.x, this.y, this.r * 0.9);
      },
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        // tail
        ctx.strokeStyle = '#d98ba6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.r * 0.7, 0);
        ctx.quadraticCurveTo(this.r * 1.6, Math.sin(this.legPhase) * 6, this.r * 2.1, 0);
        ctx.stroke();
        // body
        ctx.fillStyle = '#6b6f76';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r, this.r * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        // head
        ctx.beginPath();
        ctx.arc(-this.r * 0.8, 0, this.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // ear
        ctx.fillStyle = '#565a60';
        ctx.beginPath();
        ctx.arc(-this.r * 0.6, -this.r * 0.5, this.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        // eye (red, menacing)
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(-this.r * 1.0, -this.r * 0.12, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // teeth
        ctx.fillStyle = '#fff';
        ctx.fillRect(-this.r * 1.45, this.r * 0.05, 5, 4);
        ctx.restore();
      },
    };
  }

  /* --------------------------------------------------------------- Pickups */
  function makeCorn(g, x, y) {
    return {
      kind: 'corn',
      cat: 'corn',
      x: x != null ? x : g.W + 30,
      y: y != null ? y : rand(g.wallTop + 40, g.wallBottom - 40),
      r: 12,
      bob: rand(0, Math.PI * 2),
      update(dt, g) {
        this.x -= g.scroll * dt;
        this.bob += dt * 4;
      },
      collides(p) {
        return circleCircle(p.x, p.y, p.r, this.x, this.y + Math.sin(this.bob) * 3, this.r);
      },
      draw(ctx) {
        const yy = this.y + Math.sin(this.bob) * 3;
        ctx.save();
        ctx.translate(this.x, yy);
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r * 0.85, this.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe98a';
        ctx.beginPath();
        ctx.ellipse(-2, -3, this.r * 0.4, this.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,130,10,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -this.r);
        ctx.lineTo(0, this.r);
        ctx.stroke();
        ctx.restore();
      },
    };
  }

  const POWER_DEFS = {
    antacid: { color: '#7affb0', label: 'A' },
    soap: { color: '#bfe3ff', label: 'S' },
    hot: { color: '#ff6a2b', label: 'H' },
  };

  function makePower(g, type) {
    type = type || U.weighted({ antacid: 3, soap: 2, hot: 2 });
    const def = POWER_DEFS[type];
    return {
      kind: 'power',
      cat: 'power',
      power: type,
      x: g.W + 30,
      y: rand(g.wallTop + 50, g.wallBottom - 50),
      r: 16,
      bob: rand(0, Math.PI * 2),
      update(dt, g) {
        this.x -= g.scroll * dt;
        this.bob += dt * 3;
      },
      collides(p) {
        return circleCircle(p.x, p.y, p.r, this.x, this.y + Math.sin(this.bob) * 4, this.r);
      },
      draw(ctx, g) {
        const yy = this.y + Math.sin(this.bob) * 4;
        ctx.save();
        ctx.translate(this.x, yy);
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 14;
        if (this.power === 'antacid') {
          ctx.fillStyle = '#eafff2';
          ctx.beginPath();
          ctx.arc(0, 0, this.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#39c47a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(6, 0);
          ctx.moveTo(0, -6);
          ctx.lineTo(0, 6);
          ctx.stroke();
        } else if (this.power === 'soap') {
          const grd = ctx.createRadialGradient(-5, -5, 2, 0, 0, this.r);
          grd.addColorStop(0, '#ffffff');
          grd.addColorStop(1, '#9fd0ff');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(0, 0, this.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // hot-sauce packet: red sachet with a drawn flame (no emoji reliance)
          ctx.fillStyle = '#c0392b';
          roundRect(ctx, -this.r * 0.7, -this.r, this.r * 1.4, this.r * 2, 4);
          ctx.fill();
          ctx.fillStyle = '#8e2018';
          ctx.fillRect(-this.r * 0.7, -this.r, this.r * 1.4, 3); // serrated top
          // flame
          ctx.fillStyle = '#ffb02e';
          ctx.beginPath();
          ctx.moveTo(0, -this.r * 0.55);
          ctx.quadraticCurveTo(this.r * 0.55, 0, 0, this.r * 0.6);
          ctx.quadraticCurveTo(-this.r * 0.55, 0, 0, -this.r * 0.55);
          ctx.fill();
          ctx.fillStyle = '#ff5a1f';
          ctx.beginPath();
          ctx.moveTo(0, -this.r * 0.15);
          ctx.quadraticCurveTo(this.r * 0.3, this.r * 0.15, 0, this.r * 0.55);
          ctx.quadraticCurveTo(-this.r * 0.3, this.r * 0.15, 0, -this.r * 0.15);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  }

  FD.entities = {
    Player,
    makeFloater,
    makeTP,
    makeHair,
    makeGrate,
    makePlunger,
    makeRat,
    makeCorn,
    makePower,
    POWER_DEFS,
  };
})(window.FD);

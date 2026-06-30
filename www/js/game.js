/*
 * game.js — the engine: fixed-timestep loop, state machine, the spawn director
 * that escalates through the zones, collision resolution, scoring and all the
 * rendering (world, HUD and menus). Boots on DOMContentLoaded.
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';
  const U = FD.util;
  const E = FD.entities;
  const Z = FD.zones;
  const { clamp, lerp, rand, roundRect } = U;

  // Virtual resolution — everything is authored in these coordinates and then
  // scaled to fit the device with letterboxing. Portrait, mobile-first.
  const W = 540;
  const H = 960;
  const WALL = 70; // pipe wall thickness top & bottom

  const STATE = { MENU: 'menu', PLAY: 'play', PAUSE: 'pause', DEAD: 'dead', WIN: 'win' };

  const DEATH_FLAVOR = {
    wall: 'Scraped one too many pipe walls. Death by a thousand cuts.',
    poison: 'The polluted water finally got him. He simply ran out of bubbles.',
    floater: 'Took a poop log square in the face. He never saw it coming.',
    tp: 'Wrapped up in wet toilet paper like a tiny soggy mummy.',
    hair: 'Tangled in a hair clog. A truly hair-raising way to go.',
    grate: 'Splattered against a drain grate. He almost threaded it.',
    plunger: 'THWOCK. Flattened by a rogue plunger.',
    rat: 'The sewer rats got him. Nature, as they say, is metal.',
  };

  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mixHex(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(
      lerp(ca[2], cb[2], t)
    )})`;
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = W;
      this.H = H;
      this.wallTop = WALL;
      this.wallBottom = H - WALL;
      this.dpr = 1;
      this.scale = 1;
      this.ox = 0;
      this.oy = 0;

      this.state = STATE.MENU;
      this.time = 0;
      this.particles = new U.Particles();
      this.entities = [];
      this.shake = 0;
      this.flash = 0; // red damage flash
      this.bg = Object.assign({}, Z.ZONES[0].palette);
      this.best = parseFloat(localStorage.getItem('fd_best') || '0') || 0;
      this.banner = { t: 0, name: '', sub: '' };
      this.toast = { t: 0, text: '', color: '#fff' };
      this.menuFishY = H * 0.42;
      this.menuFishV = 0;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));

      this.reset();
    }

    reset() {
      this.player = new E.Player(W * 0.28, H * 0.5);
      this.entities.length = 0;
      this.particles.clear();
      this.distance = 0; // pixels travelled
      this.meters = 0;
      this.bonus = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.cleanZone = true;
      this.zoneIndex = 0;
      this.scroll = Z.ZONES[0].speed;
      this.obstacleTimer = 1.0;
      this.cornTimer = 0.8;
      this.powerTimer = 5.0;
      this.shake = 0;
      this.flash = 0;
      this.deathCause = null;
      this.won = false;
    }

    /* ----------------------------------------------------------- lifecycle */
    start() {
      this.reset();
      this.state = STATE.PLAY;
      this.banner = { t: 2.6, name: Z.ZONES[0].name, sub: Z.ZONES[0].sub };
      FD.audio.click();
    }

    kill(cause) {
      if (this.state !== STATE.PLAY) return;
      this.player.alive = false;
      this.deathCause = cause || 'poison';
      this.state = STATE.DEAD;
      this.banner.t = 0;
      this.toast.t = 0;
      this.shake = 0.6;
      this.flash = 0.6;
      FD.audio.death();
      this.particles.burst(this.player.x, this.player.y, 26, {
        speedMin: 60,
        speedMax: 240,
        r: 4,
        rEnd: 0,
        life: 0.8,
        color: '#6b4a1f',
        gravity: 200,
      });
      this.saveBest();
    }

    win() {
      if (this.state !== STATE.PLAY) return;
      this.won = true;
      this.state = STATE.WIN;
      this.banner.t = 0;
      this.toast.t = 0;
      // big clean-run / finish bonus
      this.bonus += 500;
      FD.audio.win();
      this.saveBest();
    }

    saveBest() {
      if (this.meters > this.best) {
        this.best = Math.floor(this.meters);
        localStorage.setItem('fd_best', String(this.best));
      }
    }

    togglePause() {
      if (this.state === STATE.PLAY) this.state = STATE.PAUSE;
      else if (this.state === STATE.PAUSE) this.state = STATE.PLAY;
    }

    /* ------------------------------------------------------ event callbacks */
    onHit(cause) {
      this.combo = 0;
      this.cleanZone = false;
      this.shake = Math.max(this.shake, 0.35);
      this.flash = Math.max(this.flash, 0.4);
      this.particles.burst(this.player.x, this.player.y, 12, {
        speedMin: 50,
        speedMax: 180,
        r: 4,
        rEnd: 0,
        life: 0.5,
        color: '#5a3a17',
        gravity: 120,
      });
    }
    onScrape(cause) {
      this.cleanZone = false;
      if (Math.random() < 0.3) {
        this.particles.spawn({
          x: this.player.x,
          y: this.player.y + (this.player.y < H / 2 ? -16 : 16),
          vx: rand(-40, -10),
          vy: rand(-20, 20),
          r: 3,
          rEnd: 0,
          life: 0.3,
          color: '#caa15a',
        });
      }
    }
    onShieldPop() {
      this.toastMsg('SHIELD POP!', '#7affb0');
      this.particles.burst(this.player.x, this.player.y, 16, {
        speedMin: 60,
        speedMax: 200,
        r: 3,
        rEnd: 0,
        life: 0.5,
        color: '#7affb0',
      });
    }

    toastMsg(text, color) {
      this.toast = { t: 1.4, text, color: color || '#fff' };
    }

    /* --------------------------------------------------------- spawn logic */
    spawnObstacle() {
      const zone = Z.ZONES[this.zoneIndex];
      const kind = U.weighted(zone.obstacles);
      let ent;
      switch (kind) {
        case 'floater': ent = E.makeFloater(this); break;
        case 'tp': ent = E.makeTP(this); break;
        case 'hair': ent = E.makeHair(this); break;
        case 'grate': ent = E.makeGrate(this); break;
        case 'plunger': ent = E.makePlunger(this); break;
        case 'rat': ent = E.makeRat(this); break;
        default: ent = E.makeFloater(this);
      }
      this.entities.push(ent);
    }

    spawnCorn() {
      // sometimes a tempting line/arc of kernels (combo bait)
      if (U.chance(0.45)) {
        const n = U.randInt(3, 5);
        const y0 = rand(this.wallTop + 60, this.wallBottom - 60);
        const dir = U.chance(0.5) ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const yy = clamp(y0 + dir * i * 26, this.wallTop + 30, this.wallBottom - 30);
          this.entities.push(E.makeCorn(this, W + 30 + i * 34, yy));
        }
      } else {
        this.entities.push(E.makeCorn(this));
      }
    }

    /* --------------------------------------------------------------- update */
    update(dt) {
      this.time += dt;

      if (this.state === STATE.MENU) {
        this.updateMenu(dt);
        this.particles.update(dt);
        return;
      }
      if (this.state === STATE.PAUSE) return;

      // banners / toasts / fx timers run in any active-ish state
      this.banner.t = Math.max(0, this.banner.t - dt);
      this.toast.t = Math.max(0, this.toast.t - dt);
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.particles.update(dt);

      if (this.state !== STATE.PLAY) return;

      const zone = Z.ZONES[this.zoneIndex];

      // Scroll speed: zone base + gentle intra-run ramp, boosted by power-ups.
      let target = zone.speed + Math.min(this.distance * 0.0009, 90);
      if (this.player.soap > 0) target *= 1.35;
      if (this.player.hot > 0) target *= 1.7;
      this.scroll = clamp(target, 150, 760);

      this.distance += this.scroll * dt;
      this.meters = this.distance / 40;

      // Zone transitions.
      const zi = Z.zoneForDistance(this.meters).index;
      if (zi !== this.zoneIndex) {
        if (this.cleanZone) {
          const b = 150 + this.zoneIndex * 50;
          this.bonus += b;
          this.toastMsg('CLEAN RUN +' + b, '#9be8ff');
        }
        this.zoneIndex = zi;
        this.cleanZone = true;
        const nz = Z.ZONES[zi];
        this.banner = { t: 2.6, name: nz.name, sub: nz.sub };
        FD.audio.zone();
      }

      // Win check.
      if (this.meters >= Z.OCEAN_AT) {
        this.win();
        return;
      }

      // Health drain from the polluted water (worse deeper).
      this.player.health -= (zone.drain + this.zoneIndex * 0.2) * dt;
      if (this.player.health <= 0 && this.player.alive) {
        this.player.health = 0;
        this.kill('poison');
        return;
      }

      // Player physics.
      this.player.update(dt, this, FD.input.thrust);

      // Spawn director.
      this.obstacleTimer -= dt;
      if (this.obstacleTimer <= 0 && this.meters > 4) {
        this.spawnObstacle();
        const g = zone.gap;
        this.obstacleTimer = rand(g[0], g[1]) * clamp(260 / this.scroll, 0.6, 1.3);
      }
      this.cornTimer -= dt;
      if (this.cornTimer <= 0) {
        if (U.chance(zone.corn + 0.25)) this.spawnCorn();
        this.cornTimer = rand(0.9, 1.6) * clamp(260 / this.scroll, 0.6, 1.3);
      }
      this.powerTimer -= dt;
      if (this.powerTimer <= 0) {
        if (U.chance(zone.power * 3)) this.entities.push(E.makePower(this));
        this.powerTimer = rand(5, 9);
      }

      // Update entities + resolve collisions.
      const p = this.player;
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i];
        e.update(dt, this);
        if (e.x < -160) {
          this.entities.splice(i, 1);
          continue;
        }
        if (!e.collides(p)) continue;

        if (e.cat === 'corn') {
          this.eatCorn(e);
          this.entities.splice(i, 1);
        } else if (e.cat === 'power') {
          this.grabPower(e);
          this.entities.splice(i, 1);
        } else {
          // hazard
          if (p.invincible) {
            // soap bubble plows through small stuff
            if (p.soap > 0 && (e.kind === 'floater' || e.kind === 'tp' || e.kind === 'rat')) {
              this.entities.splice(i, 1);
              this.particles.burst(e.x, e.y, 8, {
                speedMin: 40, speedMax: 140, r: 3, rEnd: 0, life: 0.4, color: '#5a3a17',
              });
            }
          } else {
            p.takeHit(e.damage, e.kind, this);
            // some hazards persist after a hit, others (rats) scurry off
            if (e.kind === 'rat') this.entities.splice(i, 1);
            if (!p.alive) return;
          }
        }
      }
    }

    eatCorn(e) {
      this.player.heal(16);
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = this.comboMult();
      this.bonus += Math.round(10 * mult);
      FD.audio.combo(Math.min(this.combo, 8));
      if (this.combo > 1 && this.combo % 3 === 0) this.toastMsg('COMBO x' + this.combo + '!', '#ffd23f');
      this.particles.burst(e.x, e.y, 8, {
        speedMin: 40, speedMax: 130, r: 3, rEnd: 0, life: 0.4, color: '#ffd23f',
      });
    }

    comboMult() {
      return 1 + Math.floor(this.combo / 3) * 0.5;
    }

    grabPower(e) {
      const p = this.player;
      FD.audio.powerup();
      switch (e.power) {
        case 'antacid':
          p.shield = Math.min(p.shield + 1, 3);
          this.toastMsg('ANTACID SHIELD', '#7affb0');
          break;
        case 'soap':
          p.soap = 5;
          this.toastMsg('SOAP BUBBLE!', '#bfe3ff');
          break;
        case 'hot':
          p.hot = 3.5;
          this.toastMsg('HOT SAUCE!', '#ff6a2b');
          break;
      }
      this.particles.burst(e.x, e.y, 14, {
        speedMin: 50, speedMax: 170, r: 3, rEnd: 0, life: 0.5,
        color: E.POWER_DEFS[e.power].color,
      });
    }

    updateMenu(dt) {
      // idle goldfish bobbing on the title screen
      this.menuFishV += (FD.input.thrust ? -1400 : 900) * dt;
      this.menuFishV = clamp(this.menuFishV, -360, 360);
      this.menuFishY += this.menuFishV * dt;
      this.menuFishY = clamp(this.menuFishY, this.wallTop + 30, this.wallBottom - 30);
    }

    /* -------------------------------------------------- render scaling glue */
    resize() {
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.dpr = dpr;
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      this.scale = Math.min(cssW / W, cssH / H);
      this.ox = (cssW - W * this.scale) / 2;
      this.oy = (cssH - H * this.scale) / 2;
    }

    render() {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // letterbox
      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.save();
      ctx.translate(this.ox, this.oy);
      ctx.scale(this.scale, this.scale);

      // clip to virtual viewport
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();

      // screen shake
      if (this.shake > 0) {
        const m = this.shake * 14;
        ctx.translate(rand(-m, m), rand(-m, m));
      }

      this.drawBackground(ctx);
      this.drawWalls(ctx);

      // entities + player + particles only in active gameplay-ish states
      if (this.state !== STATE.MENU) {
        for (const e of this.entities) e.draw(ctx, this);
        if (this.player.alive || this.state === STATE.WIN) this.player.draw(ctx, this);
        this.particles.draw(ctx);
      } else {
        this.particles.draw(ctx);
      }

      // damage flash
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(180,20,20,${this.flash * 0.5})`;
        ctx.fillRect(0, 0, W, H);
      }

      this.drawVignette(ctx);

      // HUD + screens
      if (this.state === STATE.PLAY || this.state === STATE.PAUSE) this.drawHUD(ctx);
      this.drawBanner(ctx);
      this.drawToast(ctx);

      if (this.state === STATE.MENU) this.drawMenu(ctx);
      else if (this.state === STATE.PAUSE) this.drawPause(ctx);
      else if (this.state === STATE.DEAD) this.drawDead(ctx);
      else if (this.state === STATE.WIN) this.drawWin(ctx);

      ctx.restore();
    }

    drawBackground(ctx) {
      const zone = Z.ZONES[this.zoneIndex];
      const pal = zone.palette;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (zone.sky) {
        grad.addColorStop(0, '#bfe9ff');
        grad.addColorStop(0.35, mixHex('#bfe9ff', pal.top, 0.6));
        grad.addColorStop(1, pal.bottom);
      } else {
        grad.addColorStop(0, pal.top);
        grad.addColorStop(1, pal.bottom);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // parallax pipe rings sliding left
      const off = (this.distance * 0.35) % 120;
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 8;
      for (let x = -off; x < W + 120; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, this.wallTop);
        ctx.lineTo(x, this.wallBottom);
        ctx.stroke();
      }

      // floating murk specks
      const sp = (this.distance * 0.6) % W;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 24; i++) {
        const x = (i * 83.7 - sp + W * 2) % W;
        const y = this.wallTop + ((i * 137.3) % (this.wallBottom - this.wallTop));
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // light at the end of the pipe during the outflow / win
      if (zone.sky || this.state === STATE.WIN) {
        const cx = W * 1.05;
        const cy = H * 0.5;
        const r = H * (this.state === STATE.WIN ? 1.2 : 0.5);
        const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
        glow.addColorStop(0, 'rgba(220,250,255,0.85)');
        glow.addColorStop(1, 'rgba(220,250,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }
    }

    drawWalls(ctx) {
      const pal = Z.ZONES[this.zoneIndex].palette;
      for (const [y0, y1, top] of [[0, this.wallTop, true], [this.wallBottom, H, false]]) {
        const grad = ctx.createLinearGradient(0, y0, 0, y1);
        grad.addColorStop(0, top ? pal.wall : pal.accent);
        grad.addColorStop(1, top ? pal.accent : pal.wall);
        ctx.fillStyle = grad;
        ctx.fillRect(0, y0, W, y1 - y0);
        // rivets
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        const ry = top ? y1 - 10 : y0 + 10;
        const off = (this.distance * 0.5) % 60;
        for (let x = -off; x < W + 60; x += 60) {
          ctx.beginPath();
          ctx.arc(x, ry, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // slime drip edge
        ctx.fillStyle = 'rgba(80,120,40,0.35)';
        const edge = top ? y1 : y0;
        ctx.beginPath();
        ctx.moveTo(0, edge);
        for (let x = 0; x <= W; x += 30) {
          const d = top ? Math.abs(Math.sin(x * 0.05 + this.time)) * 10 : -Math.abs(Math.sin(x * 0.05 + this.time)) * 10;
          ctx.lineTo(x, edge + d);
        }
        ctx.lineTo(W, top ? y0 : y1);
        ctx.lineTo(0, top ? y0 : y1);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawVignette(ctx) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    /* --------------------------------------------------------------- HUD */
    drawHUD(ctx) {
      // The pause/mute buttons live in the screen corners; on phone-shaped
      // viewports they map into the top corners of the virtual canvas, so the
      // health bar sits *between* them and the counters drop below them.
      const bx = 80;
      const bw = W - 160;
      const by = 24;
      const bh = 16;
      roundRect(ctx, bx, by, bw, bh, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      const hp = clamp(this.player.health / this.player.maxHealth, 0, 1);
      const col = hp > 0.5 ? '#5ad65a' : hp > 0.25 ? '#ffd23f' : '#ff4d4d';
      roundRect(ctx, bx + 2, by + 2, (bw - 4) * hp, bh - 4, 6);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥ HEALTH', W / 2, by + bh / 2 + 1);

      // distance + score, dropped below the corner buttons
      const rowY = 96;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(Math.floor(this.meters) + ' m', 20, rowY);
      ctx.textAlign = 'right';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('★ ' + (Math.floor(this.meters) + this.bonus), W - 20, rowY);

      // combo
      if (this.combo >= 2) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('COMBO x' + this.combo + '  (×' + this.comboMult().toFixed(1) + ')', 20, rowY + 26);
      }

      // active power-up indicators
      let px = 20;
      const py = rowY + 38;
      const drawPip = (label, frac, color) => {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        roundRect(ctx, px, py, 54, 16, 6);
        ctx.fill();
        ctx.fillStyle = color;
        roundRect(ctx, px + 2, py + 2, (54 - 4) * clamp(frac, 0, 1), 12, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px + 6, py + 8);
        px += 62;
      };
      if (this.player.soap > 0) drawPip('SOAP', this.player.soap / 5, '#bfe3ff');
      if (this.player.hot > 0) drawPip('HOT', this.player.hot / 3.5, '#ff6a2b');
      if (this.player.shield > 0) drawPip('SHLD x' + this.player.shield, 1, '#7affb0');
    }

    drawBanner(ctx) {
      if (this.banner.t <= 0) return;
      const t = this.banner.t;
      // slide in then hold then fade
      const a = clamp(Math.min(t, 2.6 - t) * 3, 0, 1);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, W / 2 - 200, H * 0.3 - 38, 400, 76, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(this.banner.name, W / 2, H * 0.3 - 2);
      ctx.fillStyle = '#9be8ff';
      ctx.font = 'italic 15px system-ui, sans-serif';
      ctx.fillText(this.banner.sub, W / 2, H * 0.3 + 22);
      ctx.globalAlpha = 1;
    }

    drawToast(ctx) {
      if (this.toast.t <= 0) return;
      const a = clamp(this.toast.t, 0, 1);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.toast.color;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(this.toast.text, W / 2, H * 0.62 - (1.4 - this.toast.t) * 24);
      ctx.globalAlpha = 1;
    }

    /* ------------------------------------------------------------- screens */
    drawCenteredFish(ctx, x, y, scale) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      const wag = Math.sin(this.time * 6) * 0.4;
      // reuse player draw by faking transform: simpler to redraw minimal fish
      ctx.fillStyle = '#e8893a';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.quadraticCurveTo(-30, -12 + wag * 8, -34, -6);
      ctx.quadraticCurveTo(-26, 0, -34, 6);
      ctx.quadraticCurveTo(-30, 12 - wag * 8, -16, 0);
      ctx.fill();
      const grad = ctx.createLinearGradient(0, -20, 0, 20);
      grad.addColorStop(0, '#ffb24d');
      grad.addColorStop(1, '#e0700f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(12, -4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(13.5, -4, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    overlay(ctx, alpha) {
      ctx.fillStyle = `rgba(4,6,10,${alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    blink() {
      return Math.sin(this.time * 4) > -0.3;
    }

    drawMenu(ctx) {
      this.overlay(ctx, 0.35);
      ctx.textAlign = 'center';
      // title
      ctx.save();
      ctx.translate(W / 2, H * 0.2);
      ctx.fillStyle = '#ffd23f';
      ctx.font = '900 58px system-ui, sans-serif';
      ctx.fillText('FLUSHED', 0, 0);
      ctx.fillStyle = '#9be8ff';
      ctx.font = 'italic bold 24px system-ui, sans-serif';
      ctx.fillText('Down the Drain', 0, 34);
      ctx.restore();

      // bobbing fish controlled by the button (a tiny playable preview)
      this.drawCenteredFish(ctx, W * 0.5, this.menuFishY, 1.6);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText('TAP / hold SPACE to swim up', W / 2, H * 0.6);
      ctx.fillText('release to sink', W / 2, H * 0.6 + 24);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('Eat 🌽 for health. Dodge the brown.', W / 2, H * 0.66 + 8);
      ctx.fillText('Reach the OCEAN to win.', W / 2, H * 0.66 + 30);

      if (this.blink()) {
        ctx.fillStyle = '#ffd23f';
        ctx.font = '900 26px system-ui, sans-serif';
        ctx.fillText('TAP TO FLUSH', W / 2, H * 0.8);
      }
      if (this.best > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('best: ' + this.best + ' m', W / 2, H * 0.86);
      }
    }

    drawPause(ctx) {
      this.overlay(ctx, 0.55);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '900 44px system-ui, sans-serif';
      ctx.fillText('PAUSED', W / 2, H * 0.45);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('press P / ▮▮ to resume', W / 2, H * 0.45 + 36);
    }

    drawDead(ctx) {
      this.overlay(ctx, 0.6);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5252';
      ctx.font = '900 46px system-ui, sans-serif';
      ctx.fillText('GAME OVER', W / 2, H * 0.28);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'italic 16px system-ui, sans-serif';
      this.wrapText(ctx, '"Reginald was last seen near the wastewater intake.', W / 2, H * 0.36, W - 80, 22);
      this.wrapText(ctx, 'We\'ll tell the kids he went to live on a farm."', W / 2, H * 0.36 + 22, W - 80, 22);

      ctx.fillStyle = '#ffd23f';
      ctx.font = '15px system-ui, sans-serif';
      this.wrapText(ctx, DEATH_FLAVOR[this.deathCause] || DEATH_FLAVOR.poison, W / 2, H * 0.46, W - 80, 22);

      this.drawStats(ctx, H * 0.58);

      if (this.blink()) {
        ctx.fillStyle = '#fff';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.fillText('TAP TO TRY AGAIN', W / 2, H * 0.8);
      }
    }

    drawWin(ctx) {
      // bright, watery overlay
      ctx.fillStyle = 'rgba(120,200,255,0.35)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '900 40px system-ui, sans-serif';
      ctx.fillText('YOU REACHED', W / 2, H * 0.24);
      ctx.fillStyle = '#ffe98a';
      ctx.font = '900 56px system-ui, sans-serif';
      ctx.fillText('THE OCEAN!', W / 2, H * 0.24 + 56);

      this.drawCenteredFish(ctx, W / 2, H * 0.5, 2.2);

      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'italic 16px system-ui, sans-serif';
      this.wrapText(ctx, 'Reginald breaks the surface, gulps clean salt water,', W / 2, H * 0.62, W - 60, 22);
      this.wrapText(ctx, 'and is finally, gloriously free. 🐟🌊', W / 2, H * 0.62 + 22, W - 60, 22);

      this.drawStats(ctx, H * 0.72);

      if (this.blink()) {
        ctx.fillStyle = '#fff';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.fillText('TAP TO PLAY AGAIN', W / 2, H * 0.86);
      }
    }

    drawStats(ctx, y) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      const score = Math.floor(this.meters) + this.bonus;
      ctx.fillText('Distance: ' + Math.floor(this.meters) + ' m', W / 2, y);
      ctx.fillText('Score: ' + score, W / 2, y + 26);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('Best combo: x' + this.bestCombo + '   •   Best: ' + this.best + ' m', W / 2, y + 50);
    }

    wrapText(ctx, text, x, y, maxW, lh) {
      const words = text.split(' ');
      let line = '';
      let yy = y;
      for (const w of words) {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line.trim(), x, yy);
          line = w + ' ';
          yy += lh;
        } else line = test;
      }
      ctx.fillText(line.trim(), x, yy);
      return yy;
    }

    /* ------------------------------------------------------ input handling */
    handlePress() {
      if (this.state === STATE.MENU) this.start();
      else if (this.state === STATE.DEAD || this.state === STATE.WIN) {
        // small delay so the tap that killed you doesn't instantly restart
        if (this.time - (this._endTime || 0) > 0.6) {
          this.state = STATE.MENU;
        }
      }
    }
  }

  /* --------------------------------------------------------- boot + loop */
  function boot() {
    const canvas = document.getElementById('game');
    const game = new Game(canvas);
    FD.game = game;
    FD.input.init(canvas);

    // expose a few hooks for input.js key handlers
    FD.togglePause = () => game.togglePause();
    FD.toggleMute = () => {
      FD.audio.setMuted(!FD.audio.muted);
      updateMuteBtn();
    };

    // HTML control buttons
    const muteBtn = document.getElementById('btn-mute');
    const pauseBtn = document.getElementById('btn-pause');
    function updateMuteBtn() {
      if (muteBtn) muteBtn.textContent = FD.audio.muted ? '🔇' : '🔊';
    }
    if (muteBtn)
      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        FD.audio.unlock();
        FD.toggleMute();
      });
    if (pauseBtn)
      pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        game.togglePause();
      });

    // track when a run ended (for restart debounce)
    const origKill = game.kill.bind(game);
    game.kill = (c) => { origKill(c); game._endTime = game.time; };
    const origWin = game.win.bind(game);
    game.win = () => { origWin(); game._endTime = game.time; };

    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 120;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25; // tab was backgrounded; don't spiral

      // edge-triggered presses for menu/restart
      if (FD.input.consumePress()) game.handlePress();

      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 6) {
        game.update(STEP);
        acc -= STEP;
        steps++;
      }
      if (steps === 6) acc = 0;

      game.render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // hide the loading splash
    const splash = document.getElementById('splash');
    if (splash) splash.style.display = 'none';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.FD);

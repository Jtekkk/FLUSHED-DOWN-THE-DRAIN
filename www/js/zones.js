/*
 * zones.js — the escalating gauntlet. Each zone covers a span of metres and
 * defines its current speed, how fast the polluted water poisons you, the
 * background palette, and a weighted table of what spawns. The spawn director
 * (in game.js) reads these.
 */
window.FD = window.FD || {};

(function (FD) {
  'use strict';

  // `obstacles` weights are relative; `gap` is seconds between spawn attempts
  // (scaled down a touch as speed climbs). `corn`/`power` are spawn chances per
  // attempt. `speed` is the base scroll speed in virtual px/s for the zone.
  const ZONES = [
    {
      key: 'bowl',
      name: 'THE BOWL DROP',
      sub: 'flush incoming…',
      end: 60,
      speed: 210,
      drain: 2.6,
      gap: [1.5, 1.9],
      sky: false,
      palette: { top: '#3a2f1e', bottom: '#1c1a12', wall: '#46371f', accent: '#6b5326' },
      obstacles: { floater: 1 },
      corn: 0.55,
      power: 0.05,
    },
    {
      key: 'residential',
      name: 'RESIDENTIAL PIPES',
      sub: 'learn the rhythm',
      end: 220,
      speed: 250,
      drain: 3.2,
      gap: [1.15, 1.55],
      sky: false,
      palette: { top: '#33402a', bottom: '#15180f', wall: '#3c4a2c', accent: '#5d7038' },
      obstacles: { floater: 3, tp: 2, grate: 1 },
      corn: 0.5,
      power: 0.12,
    },
    {
      key: 'mainline',
      name: 'THE MAIN LINE',
      sub: 'traffic gets thick',
      end: 460,
      speed: 300,
      drain: 4.2,
      gap: [0.85, 1.25],
      sky: false,
      palette: { top: '#2e3a40', bottom: '#10161a', wall: '#33454c', accent: '#3f6470' },
      obstacles: { floater: 2, tp: 3, hair: 2, grate: 2, rat: 2 },
      corn: 0.45,
      power: 0.14,
    },
    {
      key: 'plant',
      name: 'TREATMENT PLANT',
      sub: 'survive the gauntlet',
      end: 700,
      speed: 345,
      drain: 5.2,
      gap: [0.7, 1.05],
      sky: false,
      palette: { top: '#3a2b33', bottom: '#160f13', wall: '#4a2f3a', accent: '#7a3b52' },
      obstacles: { plunger: 3, grate: 3, hair: 2, tp: 2, rat: 2 },
      corn: 0.42,
      power: 0.16,
    },
    {
      key: 'outflow',
      name: 'THE OUTFLOW',
      sub: 'SPRINT! the light!',
      end: 820,
      speed: 430,
      drain: 4.0,
      gap: [0.85, 1.2],
      sky: true,
      palette: { top: '#3f5c6e', bottom: '#1a2a33', wall: '#4a7187', accent: '#79c0d8' },
      obstacles: { floater: 2, tp: 2, grate: 1 },
      corn: 0.55,
      power: 0.12,
    },
  ];

  const OCEAN_AT = 820; // reach this many metres → win.

  function zoneForDistance(m) {
    for (let i = 0; i < ZONES.length; i++) {
      if (m < ZONES[i].end) return { zone: ZONES[i], index: i };
    }
    return { zone: ZONES[ZONES.length - 1], index: ZONES.length - 1 };
  }

  FD.zones = { ZONES, OCEAN_AT, zoneForDistance };
})(window.FD);

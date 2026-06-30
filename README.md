# FLUSHED-DOWN-THE-DRAIN
PLAY THIS FAST PACED GAME AS A GOLDFISH FLUSHED DOWN THE TOILET AND THROUGH THE SEWER PIPES DOODGING POOP AND TOIKET PAPER BLOBS EATING PIECES OF CORN FOR HEALTH MAKE YOUR WAY TO THE OCEAN TO WIN!

---

## 🎮 The game is built — here's how to play it

It's a one-button HTML5 game (vanilla JS canvas) that runs in a browser, ships
as a **Windows** desktop app, and as an **Android** app — all from the one
codebase in [`www/`](www/).

**Controls:** tap / click / hold **SPACE** (or ↑ / W) to swim **up**, release to
**sink**. That's it. `P` pause · `M` mute · `F11` fullscreen (desktop).

### Play instantly (web)

```bash
npm install
npm run serve      # → http://localhost:5173
```

…or just open `www/index.html` in any browser.

### Windows (.exe)

```bash
npm run dist:win   # → dist/Flushed-Setup-<ver>.exe  +  portable .exe
npm start          # or just run it in a dev window
```

### Android (.apk)

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

> Don't want to install a toolchain? Push to GitHub and the
> [CI workflow](.github/workflows/build.yml) builds the `.exe` **and** `.apk`
> for you and uploads them as artifacts.

**Full build instructions, signing, and project layout → [BUILD.md](BUILD.md).**

### What's implemented (from the design below)

- One-button swim-up/sink physics with an auto-scrolling, accelerating current
- Constantly-draining health; **corn** is the only way to refill it
- Pipe-wall scrape damage for drifting out of the current
- All six hazards — floaters, TP blobs, hair clogs, drain grates, plunger
  gauntlet, chasing sewer rats
- All four power-ups — corn, antacid shield, soap bubble, hot-sauce burst
- The five escalating zones → the **OCEAN** win screen
- Distance scoring, corn combos, clean-run bonuses
- Per-obstacle death flavor text (plus the "gone to live on a farm" gag)

---

## Design doc

FLUSHED: Down the Drain
Genre: Fast-paced auto-swimmer / endless-ish gauntlet
Vibe: Gross-out arcade. Think Flappy Bird met a porta-potty and they had a beautiful, disgusting baby.
Goal: Survive the sewer. Reach the ocean. Don't get clogged.
The Hook
You're Sir Reginald Bubbles III, a beloved family goldfish who has just been unceremoniously flushed. The water is already pulling you down. You can't stop swimming forward — the only question is whether you make it to open water or end up a bloated little corpse bobbing in a treatment plant.
Core Loop
The pipe auto-scrolls (the current drags you forward and it speeds up the deeper you go). You only control vertical movement — tap/hold to swim up, release to sink. One-button, twitchy, instantly readable. That's the whole control scheme, so it works on phone or a single key.
Three things to track at all times:

Don't touch the brown. Poop chunks and TP blobs are instant damage / death depending on size.
Eat the corn. Corn kernels are your only health. (Yes. That corn. It survived a digestive tract, it'll survive a sewer.) Each kernel restores a chunk of your health meter, which constantly drains as the polluted water poisons you.
Stay in the current. Drift too far up or down and you scrape the pipe walls — chip damage that adds up.

Obstacles (escalating gross)

Floaters — slow poop logs you weave between. Easy. Tutorial-grade.
TP Blobs — wet toilet paper clouds that expand as you approach, narrowing your gap. Time it.
Hair Clogs — stringy wall-to-wall nets with one ragged hole. Thread it.
Drain Grates — vertical bars; you have to line up with the gaps mid-swim.
The Plunger Gauntlet — pipes where rogue plungers thwock across the channel on a rhythm. Pattern-memory section.
Sewer Rats — the only thing that actively chases you. They dart in from side pipes. Bite = damage.

Power-Ups (floating in the muck)

Corn — health (the staple).
Antacid Tablet — temporary fizz shield, bounce off one obstacle without dying.
Soap Bubble — encases you, briefly invincible + faster, but you can't change direction well (slippery).
Hot Sauce Packet — speed burst. High risk, high distance, eats your control window.

Structure & Progression
Run it as escalating zones, each a few seconds long, getting faster and filthier:

The Bowl Drop — short intro, gentle current.
Residential Pipes — basic floaters, learn the rhythm.
The Main Line — everything merges, traffic gets thick, first rats.
Treatment Plant — the boss-ish gauntlet: churning filters, plunger walls, a final narrow grate.
The Outflow — light at the end of the pipe. Sprint section. Sky opens up.
OCEAN — win screen. Reginald breaks the surface, gulps clean salt water, freedom.

Scoring

Distance = primary score (meters to the ocean).
Corn Combo — eat kernels back-to-back without taking damage for a multiplier.
Clean Run bonus — finish a zone untouched = big points.
Death screen is the gag payoff: "Reginald was last seen near the wastewater intake. We'll tell the kids he went to live on a farm." Different cause-of-death flavor text per obstacle.

Why it works
One-button means anyone picks it up in two seconds. The corn-for-health mechanic is the joke and the gameplay at the same time, which is the best kind of design — mechanic and theme are the same thing. And "reach the ocean" gives a real finish line so it's not just a soulless endless-runner; there's a win state to chase.

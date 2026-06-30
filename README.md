# FLUSHED-DOWN-THE-DRAIN
PLAY THIS FAST PACED GAME AS A GOLDFISH FLUSHED DOWN THE TOILET AND THROUGH THE SEWER PIPES DOODGING POOP AND TOIKET PAPER BLOBS EATING PIECES OF CORN FOR HEALTH MAKE YOUR WAY TO THE OCEAN TO WIN!

## ▶ Play it
The game is a single self-contained file — no build step, no dependencies.

- **Open `index.html`** in any modern browser (double-click it, or serve the folder and visit it).
- **Controls:** one button. Hold **Space** / click / tap to swim **up**, release to **sink**. That's the whole game.
- **Difficulty 1–10:** pick your level on the title screen (and on the death/win screens before a retry) — click/tap a number, or use **← / →** or the **number keys** (`0` = 10). Level **5** is the baseline; **1** is a gentle cruise, **10** is brutal. Difficulty scales scroll speed, how often obstacles spawn, how fast the water poisons you, how hard hits land, and how generously power-ups appear. Your choice is remembered.
- Works on desktop and mobile (touch).

## How health works (the twist)
Your health bar has **two layers**:
- 🟩 **Clean (green)** — polluted water constantly poisons it. **Corn refills it.** Run it dry and Reginald starves.
- 🟨 **Filth reserve (yellow)** — a hard reserve that **only ever goes down**, drained by hits and wall scrapes, and **never refills**. When it hits zero, you're done.

So corn buys you time, but every hit is permanent damage you can't undo. Damage is the real clock — survive clean.

**Corn combo:** eat kernels back-to-back without taking damage to stack a multiplier (up to x5) for big score.

## Credits
First playable build co-designed with **Zorg** (via the Venice.ai API) — physics tuning, the two-layer clean/filth health system, the corn-combo numbers, and the death-screen one-liners.

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

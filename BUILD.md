# Building FLUSHED: Down the Drain

The game is a single, self-contained HTML5 canvas app in [`www/`](www/). The same
folder is shipped three ways:

| Target  | Wrapper                | Output                       |
| ------- | ---------------------- | ---------------------------- |
| Web     | — (just static files)  | open `www/index.html`        |
| Windows | Electron               | `.exe` installer + portable  |
| Android | Capacitor + Gradle     | `.apk`                       |

There is **one codebase**. Edit `www/`, then re-wrap for whichever platform.

---

## Prerequisites

- **Node.js 18+** and npm (for both desktop and mobile tooling)
- **Windows build**: best done on Windows (electron-builder produces native
  `.exe`). Cross-building from Linux/macOS works but Wine may be required.
- **Android build**: JDK 21 and the Android SDK (platform 35, build-tools
  35.0.0). `ANDROID_HOME` must point at the SDK.

Install dependencies once:

```bash
npm install
```

---

## Play it right now (web)

No build step. Either open the file directly:

```bash
# just open www/index.html in a browser, or run the dev server:
npm run serve     # → http://localhost:5173
```

Controls: **tap / click / hold SPACE** (or ↑ / W) to swim up, release to sink.
`P` pauses, `M` mutes, `F11` toggles fullscreen in the desktop build.

---

## Windows (.exe)

```bash
npm run dist:win            # NSIS installer + portable .exe, both x64
# or just run it in a dev window:
npm start
```

Artifacts land in `dist/`:

- `Flushed-Setup-<version>.exe` — installer (lets the user pick a folder, adds a
  desktop shortcut)
- `Flushed-<version>-portable.exe` — single-file, no install

> The binaries are **unsigned**, so Windows SmartScreen will show a
> "More info → Run anyway" prompt. Add a code-signing certificate in
> `package.json → build.win` to remove it.

---

## Android (.apk)

The native project lives in [`android/`](android/) and is committed, so you can
open it in Android Studio directly. To build from the command line:

```bash
# refresh the web assets into the native project, then assemble
npx cap sync android
cd android
./gradlew assembleDebug          # debug, installable immediately
# ./gradlew assembleRelease      # release (needs a signing config, see below)
```

The APK is written to:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Open the project in Android Studio instead:

```bash
npm run android:open
```

### Signing a release APK

`assembleDebug` is signed with the auto-generated debug key (fine for testing).
For a Play Store / shareable release, create a keystore and add a
`signingConfigs` block to `android/app/build.gradle`, then run
`./gradlew assembleRelease`. See
<https://developer.android.com/studio/publish/app-signing>.

---

## CI: build both automatically

[`.github/workflows/build.yml`](.github/workflows/build.yml) builds the Windows
`.exe` (on `windows-latest`) and the Android `.apk` (on `ubuntu-latest`) on every
push, and uploads them as downloadable **Artifacts**. Push a `v*` tag (e.g.
`v1.0.0`) to also attach them to a GitHub Release.

---

## Project layout

```
www/                 the game (HTML5 canvas, vanilla JS — no build step)
  index.html
  css/style.css
  js/util.js         helpers + particle system
  js/audio.js        WebAudio synth for sound effects (no asset files)
  js/music.js        background-music pool (random track per run)
  js/input.js        one-button input (touch / mouse / keyboard)
  js/entities.js     Sir Reginald + obstacles + power-ups
  js/zones.js        the escalating zone / spawn tables
  js/game.js         engine: loop, state machine, spawn director, rendering
  assets/icon.png    app icon
  assets/music/      background-music tracks (.mp3)
electron/main.js     desktop wrapper
tools/serve.js       zero-dep static dev server
capacitor.config.json
android/             generated native Android project (committed)
resources/icon.png   1024² icon source (re-generate native icons from this)
.github/workflows/   CI that builds .exe + .apk
```

### Background music

Tracks live in `www/assets/music/` and the playable pool is the `TRACKS` array
in [`www/js/music.js`](www/js/music.js). A random track is chosen every time a
run starts (never repeating the previous one back-to-back) and loops until the
run ends. To add or remove a song, drop/delete an `.mp3` in
`www/assets/music/` and edit that array — then `npx cap copy android` to
re-bundle it for Android. Music respects the global mute (🔊 / `M`).

### Regenerating app icons

Native icons were rendered from `resources/icon.png`. With a working
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) install you
can regenerate every density at once:

```bash
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#16240f' --iconBackgroundColorDark '#16240f'
```

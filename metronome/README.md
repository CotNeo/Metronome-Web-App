## Practice Metronome (Static Web App)

A responsive, mobile-first metronome web app for guitar and general music practice.  
Runs entirely in the browser using vanilla HTML, CSS, and JavaScript ES modules.

Designed for accuracy (Web Audio scheduler), clean UI, and offline usage (once cached by the browser).

---

### Features

- **Accurate Web Audio metronome**
  - Uses a scheduler with lookahead and `audioContext.currentTime`
  - Avoids drift from naive `setInterval` loops
  - Accent click (higher pitch, louder) and normal click

- **Tempo controls**
  - BPM range **40–240**
  - Slider + numeric input
  - Step buttons: **-5, -1, +1, +5**
  - Tap tempo with trimmed-mean averaging (robust to outliers)

- **Meter & subdivision**
  - Time signatures: **2/4, 3/4, 4/4, 6/8**
  - Subdivisions: **Quarter, Eighth, Sixteenth**
  - 6/8 treats the beat as a **dotted quarter** (2 beats per bar), with a simple and predictable implementation
  - Optional accent on beat 1

- **Visual metronome**
  - Large animated pulse circle
  - Beat pills (`1 2 3 4`) that highlight the current beat (2 beats for 6/8)

- **Practice timer**
  - Presets: **5, 10, 15, 30 minutes** + custom minutes
  - Shows remaining time (`mm:ss`)
  - Auto-stops metronome when timer completes

- **Progressive overload mode**
  - Toggle to gradually increase BPM while playing
  - Configurable:
    - **+1 BPM** (or custom) step
    - Interval in seconds (default 30s)
    - Maximum BPM limit
  - Shows current target BPM

- **Persistence**
  - Saves core settings to `localStorage`:
    - BPM
    - Time signature
    - Subdivision
    - Accent toggle
    - Progressive overload configuration

- **Accessibility**
  - Semantic HTML and labels
  - Keyboard navigation
  - Spacebar toggles start/stop
  - `aria-live` region announces BPM changes

---

### Folder structure

```text
metronome/
  index.html

  assets/
    icons/
      icon-192.png         # PWA / favicon icon (provide your own PNG)
      icon-512.png         # PWA / favicon icon (provide your own PNG)

  css/
    reset.css              # Baseline CSS reset
    variables.css          # Global theme tokens (colors, spacing, typography)
    layout.css             # App layout & responsive grid
    components.css         # Buttons, sliders, pills, switches, visuals
    responsive.css         # Media queries and reduced-motion handling

  js/
    main.js                # App entrypoint: wires state, scheduler, UI
    state.js               # Central state store with subscribe/notify

    audio/
      audioContext.js      # AudioContext singleton + resume helper
      clickSynth.js        # Oscillator-based click synthesizer
      scheduler.js         # Web Audio scheduler with lookahead

    ui/
      dom.js               # DOM element caching
      bindings.js          # Event listeners & user interactions
      render.js            # Pure-ish rendering and visual tick updates

    utils/
      clamp.js             # Numeric clamp helper
      storage.js           # Safe localStorage wrapper
      rafThrottle.js       # requestAnimationFrame-based throttling

  manifest.webmanifest      # PWA / install manifest

  README.md                 # This file
```

---

### How to run locally

Because browsers block some features (like `import`-based ES modules and certain Web Audio behaviors) from `file://` URLs, you should serve the app with a simple static HTTP server.

From the `metronome` directory:

#### Option 1: Python (3.x)

```bash
cd metronome
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

#### Option 2: Node.js (`npx serve`)

```bash
cd metronome
npx serve .
```

Then follow the URL printed in the terminal (usually `http://localhost:3000`).

---

### Deploying to GitHub Pages

1. Create a new GitHub repository (for example `metronome`).
2. Place the entire `metronome/` folder contents at the **repo root**.
3. Commit and push to GitHub.
4. Go to **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`), folder: `/ (root)`
5. Save settings. GitHub will build and serve the site at a URL like:

   ```text
   https://<your-username>.github.io/<your-repo-name>/
   ```

Because all paths in `index.html` and the manifest are **relative**, the app will work correctly under the GitHub Pages URL without extra configuration.

---

### Known limitations

- **Browser requirements**
  - Requires a modern browser with Web Audio support (Chrome, Edge, Firefox, Safari, and mobile variants).
  - On iOS Safari, audio starts only after an explicit user interaction (e.g., tapping "Start" or "Tap Tempo").

- **Timing**
  - While the Web Audio scheduler avoids drift and is stable for typical practice sessions (e.g., 5–10 minutes at 120 BPM), extreme CPU load or backgrounding the tab can still affect behavior.

- **Offline behavior**
  - The app is static and works offline after being cached, but this project does **not** currently include a service worker; full offline-first behavior depends on browser caching.

- **Visual simplicity**
  - The icons under `assets/icons` are referenced but not generated programmatically. You should provide your own PNGs (solid-color squares or branded icons) if needed.


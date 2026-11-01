# Chordwalk 🎵

A responsive, web-based music theory puzzle game that plays on both mobile (touch) and desktop (mouse/keyboard), built on the harmonic geometry of the **Tonnetz lattice**.

![Chordwalk Banner](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Tests-21%2F21%20Passing-success)
![No Framework](https://img.shields.io/badge/Framework-Vanilla%20TS%20%2B%20SVG-orange)
![Web Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-informational)

---

## 🧭 Core Concept: The Tonnetz Lattice

The game board is a 6-column × 5-row Tonnetz (tone network) lattice where every triangle of three touching notes is a triad:
- **Pitch Class formula**: $\text{pitch class}(x, y) = (7x + 4y) \pmod{12}$
- **Directions**:
  - **Right** = Perfect Fifth ($+7$ semitones)
  - **Up-Right** = Major Third ($+4$ semitones)
  - **Down-Right** = Minor Third ($+3$ semitones)
  - **Left** = Perfect Fourth ($+5$ semitones)
- **Harmonic Shapes**:
  - ▲ **Upward-pointing triangles** = Major Triads (amber)
  - ▼ **Downward-pointing triangles** = Minor Triads (blue)
  - ↘ **Down-right straight lines of 3** = Diminished Triads (rose)
  - ↗ **Up-right straight lines of 3** = Augmented Triads (violet)

---

## 🎮 Game Modes & Levels

Chordwalk features **25 handcrafted levels** across **6 worlds**:

1. **Steps** (Intervals): Major thirds, perfect fifths, minor thirds, perfect fourths, and mixed compass tests.
2. **Triads** (Build): Major triads, minor triads, and mixed flavours on the lattice.
3. **Inversions** (Bass-required voicings): Tap root position, 1st inversion (3rd in the bass), and 2nd inversion (5th in the bass).
4. **Tension** (Build): Diminished and augmented diagonals.
5. **Ear Training**:
   - Ear Quality (`earq`): Pick quality from sound alone; the solution lights up on the board.
   - Ear Interval (`earint`): Identify harmonic and melodic intervals.
   - Build by Ear (`earbuild`): Named root, identify quality by ear and build on the board.
6. **Progressions**: Build multi-chord progressions step-by-step with Roman-numeral chips ($I\text{--}IV\text{--}V\text{--}I$, $ii\text{--}V\text{--}I$, etc.) and hear the entire progression play back.

---

## 🔊 Sound Engine (Web Audio API)

- **Pure synthesis**: No external audio sample files.
- **Warm harmonic timbre**: Triangle oscillator + subtle sine overtone an octave higher, 15ms attack, exponential decay, lowpass filter (2400 Hz), and dynamic compression.
- **Voiced chords**: Bass note played first with upper voices stacked ascending.
- **Gesture compliant**: Audio starts only after an explicit user tap/click. Includes sound mute toggle and system theme switching (Light & Dark).

---

## 🛠️ Tech Stack & Architecture

- **Vanilla TypeScript + Vite**: Zero bloated frontend frameworks.
- **Inline SVG Lattice**: High-DPI scalable vectors, accessible 54px touch targets.
- **Accessible & Responsive**: WCAG AA contrast, keyboard navigation (Space/Enter), ARIA live announcements, responsive desktop split / mobile vertical stack.
- **Vitest**: Unit test suite covering Tonnetz math, chord identification, and round solvability.

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Start local development server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run unit tests
```bash
npm run test
```

### 4. Build for static production hosting
```bash
npm run build
```
The output will be bundled into `dist/`, ready to deploy to GitHub Pages, Vercel, Netlify, or any static web host.

---

## 📜 License
MIT License.

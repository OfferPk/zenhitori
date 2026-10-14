# ZenHitori 🪨✨

> **ZenHitori**: A calm, meditative Japanese Hitori ("leave me alone") number grid logic puzzle. Shade away duplicate numbers with smooth ink river stones so that no row or column contains duplicates, shaded stones never touch orthogonally, and all unshaded white numbers remain continuously connected.

[![CI](https://github.com/OfferPk/zenhitori/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenhitori/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-38bdf8.svg)](https://offerpk.github.io/zenhitori/)

---

## 🎮 Play Online
Play instantly in your browser:  
👉 **[https://offerpk.github.io/zenhitori/](https://offerpk.github.io/zenhitori/)**

---

## ✨ Features

- **50 Handcrafted Puzzles**: 5 difficulty packs ranging from gentle introductory 5×5 gardens to intricate 9×9 sanctuaries:
  - 🌱 **Spring Garden** (5×5) — Levels 1–10
  - 🎏 **Koi River** (6×6) — Levels 11–20
  - 🎋 **Bamboo Forest** (7×7) — Levels 21–30
  - 🪨 **Stone Path** (8×8) — Levels 31–40
  - ⛩️ **Zen Sanctuary** (9×9) — Levels 41–50
- **Procedural Stone & Singing Bowl Acoustics**: Pure Web Audio synthesizer creating realistic river stone clicks, Tibetan singing bowl ring harmonics, bamboo clacks, and resonant zen temple victory gongs without any audio sample dependencies.
- **Deductive Hints Engine**: Instant hints detecting triplets, sandwich patterns, black-neighbor forced white cells, white-cell duplicate elimination, and connectivity preservation.
- **Intuitive Controls**: 3 input modes (Cycle, Direct Stone, Direct Circle), drag-to-paint across cells, undo, and reset.
- **100% Offline & Private**: Zero external network dependencies, no tracking, no ads. Built as a PWA and wrapped with Capacitor for native Android.

---

## 📜 Hitori Rules

1. **No Duplicates**: In each row and column, no number may appear more than once among the unshaded (white) cells.
2. **No Touching Stones**: Shaded (black) cells cannot touch horizontally or vertically (diagonal touch is permitted).
3. **Continuous Stream**: All unshaded (white) cells must form a single connected group (orthogonal connectivity, no isolated cells or cutoffs).

---

## 🛠️ Development & Build

```bash
# Install dependencies
npm install

# Run engine test suite
npm test

# Build web assets to www/
npm run build
```

---

## 📱 Android App Build

Built using Capacitor:
```bash
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
The debug APK is generated and uploaded as an Actions artifact on every release build (`zenhitori-apk`).

---

## 📄 License
MIT License • Developed with care by [OfferPk](https://github.com/OfferPk).

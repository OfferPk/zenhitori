/**
 * Generator & Verifier for 50 ZenHitori levels
 * Uses Latin Square permutations + duplicate injection + constraint solver verification
 */

const fs = require('fs');
const path = require('path');
const HitoriEngine = require('../src/hitori-engine.js');

// Simple seeded PRNG (LCG)
function createRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate a valid Latin square of size N
function generateLatinSquare(size, rng) {
  const square = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ((r + c) % size) + 1)
  );

  // Permute rows
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [square[i], square[j]] = [square[j], square[i]];
  }

  // Permute cols
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    for (let r = 0; r < size; r++) {
      const tmp = square[r][i];
      square[r][i] = square[r][j];
      square[r][j] = tmp;
    }
  }

  // Permute symbols 1..size
  const symbols = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }

  const map = new Map();
  for (let i = 0; i < size; i++) {
    map.set(i + 1, symbols[i]);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      square[r][c] = map.get(square[r][c]);
    }
  }

  return square;
}

// Generate a valid Hitori level
function generateHitoriLevel(size, seed) {
  const rng = createRNG(seed);
  const maxAttempts = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const base = generateLatinSquare(size, rng);
    const mask = Array.from({ length: size }, () => new Array(size).fill(false)); // true = black

    // Target shaded count
    const targetBlack = Math.floor(size * 1.3);
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push({ r, c });
      }
    }
    // Shuffle cells
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let blackCount = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const { r, c } of cells) {
      if (blackCount >= targetBlack) break;

      // Check adjacent black
      let touchesBlack = false;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && mask[nr][nc]) {
          touchesBlack = true;
          break;
        }
      }
      if (touchesBlack) continue;

      // Check white connectivity
      mask[r][c] = true;
      const testGrid = mask.map(row => row.map(b => (b ? HitoriEngine.STATE_SHADED : HitoriEngine.STATE_NEUTRAL)));
      if (HitoriEngine.checkConnectivity(testGrid).isConnected) {
        blackCount++;
      } else {
        mask[r][c] = false;
      }
    }

    if (blackCount < Math.floor(size * 0.9)) continue;

    // Inject duplicates at black cells
    const numbers = base.map(row => [...row]);
    let ok = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (mask[r][c]) {
          const rowWhite = [];
          const colWhite = [];
          for (let i = 0; i < size; i++) {
            if (!mask[r][i]) rowWhite.push(numbers[r][i]);
            if (!mask[i][c]) colWhite.push(numbers[i][c]);
          }
          const options = [...new Set([...rowWhite, ...colWhite])].filter(v => v !== numbers[r][c]);
          if (options.length === 0) {
            ok = false;
            break;
          }
          numbers[r][c] = options[Math.floor(rng() * options.length)];
        }
      }
      if (!ok) break;
    }

    if (!ok) continue;

    // Check unique solution
    const solutions = HitoriEngine.solve(numbers, 2);
    if (solutions.length === 1) {
      return {
        size,
        numbers,
        solution: solutions[0]
      };
    }
  }

  throw new Error(`Failed to generate level of size ${size}`);
}

function generatePacks() {
  const packs = [
    { name: 'Spring Garden', size: 5, count: 10, startSeed: 101 },
    { name: 'Koi River', size: 6, count: 10, startSeed: 201 },
    { name: 'Bamboo Forest', size: 7, count: 10, startSeed: 301 },
    { name: 'Stone Path', size: 8, count: 10, startSeed: 401 },
    { name: 'Zen Sanctuary', size: 9, count: 10, startSeed: 501 }
  ];

  const allPacks = [];
  let globalId = 1;

  for (const pack of packs) {
    console.log(`Generating pack: ${pack.name} (${pack.size}x${pack.size})...`);
    const levels = [];
    let seed = pack.startSeed;

    for (let i = 0; i < pack.count; i++) {
      let lvl = null;
      while (!lvl) {
        try {
          lvl = generateHitoriLevel(pack.size, seed++);
        } catch (e) {
          seed++;
        }
      }
      levels.push({
        id: globalId++,
        levelIndex: i + 1,
        packName: pack.name,
        size: pack.size,
        grid: lvl.numbers
      });
      process.stdout.write(`.`);
    }
    console.log(` done!`);
    allPacks.push({
      name: pack.name,
      size: pack.size,
      levels
    });
  }

  return allPacks;
}

const packs = generatePacks();

const outputCode = `/**
 * Handcrafted & Solver-Verified Levels for ZenHitori
 * 50 levels across 5 difficulty packs (5x5 to 9x9)
 * Every level is verified to have a unique valid Hitori solution.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HitoriLevels = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PACKS = ${JSON.stringify(packs, null, 2)};

  function getPack(index) {
    return PACKS[index] || null;
  }

  function getLevel(packIndex, levelIndex) {
    const pack = getPack(packIndex);
    if (!pack || !pack.levels) return null;
    return pack.levels[levelIndex] || null;
  }

  function getTotalLevels() {
    return PACKS.reduce((sum, p) => sum + p.levels.length, 0);
  }

  return {
    PACKS,
    getPack,
    getLevel,
    getTotalLevels
  };
});
`;

fs.writeFileSync(path.join(__dirname, '../src/levels.js'), outputCode, 'utf8');
console.log('levels.js generated successfully!');

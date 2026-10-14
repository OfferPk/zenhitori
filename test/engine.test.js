const test = require('node:test');
const assert = require('node:assert');
const HitoriEngine = require('../src/hitori-engine.js');
const HitoriLevels = require('../src/levels.js');

test('HitoriEngine - duplicate conflicts detection', () => {
  const numbers = [
    [1, 2, 3],
    [2, 2, 1],
    [3, 1, 2]
  ];
  const grid = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  const conflicts = HitoriEngine.getDuplicateConflicts(grid, numbers);
  assert.strictEqual(conflicts.length > 0, true);

  // If we shade cell (1, 1), the duplicate 2 in row 1 is eliminated
  grid[1][1] = HitoriEngine.STATE_SHADED;
  const newConflicts = HitoriEngine.getDuplicateConflicts(grid, numbers);
  const row1Conflicts = newConflicts.filter(c => c.type === 'row' && c.index === 1);
  assert.strictEqual(row1Conflicts.length, 0);
});

test('HitoriEngine - adjacent shaded violations', () => {
  const grid = [
    [0, 1, 1],
    [0, 0, 0],
    [0, 0, 0]
  ];
  const violations = HitoriEngine.getAdjacentShadedViolations(grid);
  assert.strictEqual(violations.length, 1);
  assert.deepStrictEqual(violations[0].cell1, { r: 0, c: 1 });
  assert.deepStrictEqual(violations[0].cell2, { r: 0, c: 2 });
});

test('HitoriEngine - connectivity check', () => {
  // Connected board
  const gridConnected = [
    [0, 1, 0],
    [0, 0, 0],
    [1, 0, 1]
  ];
  const res1 = HitoriEngine.checkConnectivity(gridConnected);
  assert.strictEqual(res1.isConnected, true);

  // Disconnected corner cell
  const gridDisconnected = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 0]
  ];
  // Cell (0, 0) is surrounded by shaded cells (0, 1) and (1, 0)
  const res2 = HitoriEngine.checkConnectivity(gridDisconnected);
  assert.strictEqual(res2.isConnected, false);
});

test('HitoriEngine - hint system (triplets and sandwiches)', () => {
  const numbers = [
    [3, 3, 3, 1, 2],
    [1, 2, 4, 5, 1],
    [2, 4, 2, 3, 4],
    [5, 1, 3, 2, 5],
    [4, 5, 1, 4, 3]
  ];
  const grid = HitoriEngine.createGrid(5);

  const hint = HitoriEngine.getHint(grid, numbers);
  assert.notStrictEqual(hint, null);
  // Triplet rule: Row 0 has 3, 3, 3 -> center must be circled white!
  assert.strictEqual(hint.r, 0);
  assert.strictEqual(hint.c, 1);
  assert.strictEqual(hint.action, 'circle');
});

test('HitoriEngine - solver uniqueness on Level 1', () => {
  const level1 = HitoriLevels.getLevel(0, 0);
  assert.notStrictEqual(level1, null);
  assert.strictEqual(level1.size, 5);

  const solutions = HitoriEngine.solve(level1.grid, 2);
  assert.strictEqual(solutions.length, 1, 'Level 1 must have exactly one unique solution');

  // Verify the solution is valid
  const sol = solutions[0];
  const testGrid = sol.map(row => row.map(b => (b ? HitoriEngine.STATE_SHADED : HitoriEngine.STATE_NEUTRAL)));
  assert.strictEqual(HitoriEngine.isSolved(testGrid, level1.grid), true);
});

test('HitoriLevels - all 50 levels verified', () => {
  const total = HitoriLevels.getTotalLevels();
  assert.strictEqual(total, 50);

  for (let p = 0; p < 5; p++) {
    const pack = HitoriLevels.getPack(p);
    assert.strictEqual(pack.levels.length, 10);
    for (let l = 0; l < 10; l++) {
      const lvl = pack.levels[l];
      assert.strictEqual(lvl.grid.length, pack.size);
      assert.strictEqual(lvl.grid[0].length, pack.size);
    }
  }
});

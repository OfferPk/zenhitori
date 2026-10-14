const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const HitoriEngine = require('../src/hitori-engine.js');

describe('ZenHitori Engine Tests', () => {
  it('should create an empty grid of size N x N', () => {
    const grid = HitoriEngine.createGrid(4);
    assert.equal(grid.length, 4);
    assert.equal(grid[0].length, 4);
    assert.equal(grid[0][0], HitoriEngine.STATE_NEUTRAL);
  });

  it('should detect duplicate number conflicts in rows and columns', () => {
    const numbers = [
      [1, 2, 3],
      [2, 2, 1],
      [3, 1, 2]
    ];
    const grid = HitoriEngine.createGrid(3);

    const conflicts = HitoriEngine.getDuplicateConflicts(grid, numbers);
    assert.equal(conflicts.length > 0, true);

    // Shading cell (1, 1) eliminates the duplicate 2 in row 1
    grid[1][1] = HitoriEngine.STATE_SHADED;
    const newConflicts = HitoriEngine.getDuplicateConflicts(grid, numbers);
    const row1Conflicts = newConflicts.filter(c => c.type === 'row' && c.index === 1);
    assert.equal(row1Conflicts.length, 0);
  });

  it('should detect adjacent shaded violations', () => {
    const grid = [
      [0, 1, 1],
      [0, 0, 0],
      [0, 0, 0]
    ];
    const violations = HitoriEngine.getAdjacentShadedViolations(grid);
    assert.equal(violations.length, 1);
    assert.deepEqual(violations[0].cell1, { r: 0, c: 1 });
    assert.deepEqual(violations[0].cell2, { r: 0, c: 2 });
  });

  it('should verify single connected component of unshaded cells', () => {
    const gridConnected = [
      [0, 1, 0],
      [0, 0, 0],
      [1, 0, 1]
    ];
    const res1 = HitoriEngine.checkConnectivity(gridConnected);
    assert.equal(res1.isConnected, true);

    // Disconnected corner cell
    const gridDisconnected = [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 0]
    ];
    const res2 = HitoriEngine.checkConnectivity(gridDisconnected);
    assert.equal(res2.isConnected, false);
  });

  it('should provide smart deductive hints for triplets', () => {
    const numbers = [
      [3, 3, 3],
      [1, 2, 4],
      [2, 4, 1]
    ];
    const grid = HitoriEngine.createGrid(3);

    const hint = HitoriEngine.getHint(grid, numbers);
    assert.notEqual(hint, null);
    // Center of triplet must be white
    assert.equal(hint.r, 0);
    assert.equal(hint.c, 1);
    assert.equal(hint.action, 'circle');
  });

  it('should verify puzzle completion correctly with known solution', () => {
    const numbers = [
      [1, 2, 3],
      [2, 2, 1],
      [3, 1, 2]
    ];
    // Shading (1, 1) eliminates duplicate in row 1 and col 1
    const grid = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ];
    assert.equal(HitoriEngine.isSolved(grid, numbers), true);
  });
});

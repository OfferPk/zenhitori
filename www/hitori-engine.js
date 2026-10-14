/**
 * ZenHitori Engine
 * Constraint validation, deductive hints, and solver for Hitori logic puzzles.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HitoriEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STATE_NEUTRAL = 0; // Unmarked number
  const STATE_SHADED = 1;  // Shaded black ink stone
  const STATE_WHITE = 2;   // Circled / protected white number

  /**
   * Create an empty grid of size N x N
   */
  function createGrid(size) {
    const grid = [];
    for (let r = 0; r < size; r++) {
      grid.push(new Array(size).fill(STATE_NEUTRAL));
    }
    return grid;
  }

  /**
   * Clone a 2D array
   */
  function cloneGrid(grid) {
    return grid.map(row => [...row]);
  }

  /**
   * Find duplicate number conflicts among unshaded cells (neutral or white)
   * Returns list of conflicts
   */
  function getDuplicateConflicts(grid, numbers) {
    const size = numbers.length;
    const conflicts = [];

    // Check rows
    for (let r = 0; r < size; r++) {
      const seen = new Map();
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== STATE_SHADED) {
          const val = numbers[r][c];
          if (!seen.has(val)) {
            seen.set(val, []);
          }
          seen.get(val).push({ r, c });
        }
      }
      for (const [val, cells] of seen.entries()) {
        if (cells.length > 1) {
          conflicts.push({ type: 'row', index: r, value: val, cells });
        }
      }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
      const seen = new Map();
      for (let r = 0; r < size; r++) {
        if (grid[r][c] !== STATE_SHADED) {
          const val = numbers[r][c];
          if (!seen.has(val)) {
            seen.set(val, []);
          }
          seen.get(val).push({ r, c });
        }
      }
      for (const [val, cells] of seen.entries()) {
        if (cells.length > 1) {
          conflicts.push({ type: 'col', index: c, value: val, cells });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check for adjacent shaded (black) cells
   * In Hitori, black cells cannot touch horizontally or vertically
   */
  function getAdjacentShadedViolations(grid) {
    const size = grid.length;
    const violations = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === STATE_SHADED) {
          // Check right
          if (c + 1 < size && grid[r][c + 1] === STATE_SHADED) {
            violations.push({ cell1: { r, c }, cell2: { r, c: c + 1 } });
          }
          // Check down
          if (r + 1 < size && grid[r + 1][c] === STATE_SHADED) {
            violations.push({ cell1: { r, c }, cell2: { r: r + 1, c } });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check if all unshaded cells form a single connected component
   */
  function checkConnectivity(grid) {
    const size = grid.length;
    let totalWhite = 0;
    let startR = -1;
    let startC = -1;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== STATE_SHADED) {
          totalWhite++;
          if (startR === -1) {
            startR = r;
            startC = c;
          }
        }
      }
    }

    if (totalWhite === 0) {
      return { isConnected: false, totalWhite: 0, visitedCount: 0 };
    }

    // BFS to count reachable white cells
    const visited = Array.from({ length: size }, () => new Array(size).fill(false));
    const queue = [{ r: startR, c: startC }];
    visited[startR][startC] = true;
    let visitedCount = 0;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      visitedCount++;

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (!visited[nr][nc] && grid[nr][nc] !== STATE_SHADED) {
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }

    return {
      isConnected: visitedCount === totalWhite,
      totalWhite,
      visitedCount
    };
  }

  /**
   * Determine if the puzzle is completely and validly solved
   */
  function isSolved(grid, numbers) {
    // 1. No duplicates in any row or column among unshaded cells
    const conflicts = getDuplicateConflicts(grid, numbers);
    if (conflicts.length > 0) return false;

    // 2. No adjacent shaded cells
    const adjacentViolations = getAdjacentShadedViolations(grid);
    if (adjacentViolations.length > 0) return false;

    // 3. All unshaded cells form a single connected component
    const connectivity = checkConnectivity(grid);
    if (!connectivity.isConnected || connectivity.totalWhite === 0) return false;

    return true;
  }

  /**
   * Fast Constraint-Propagation Backtracking Solver for Hitori puzzles
   * Returns array of solutions (each solution is a 2D boolean array where true = shaded)
   */
  function solve(numbers, maxSolutions = 2) {
    const size = numbers.length;
    const solutions = [];

    // Board representation: 0 = unassigned, 1 = white, 2 = shaded
    const initialBoard = Array.from({ length: size }, () => new Array(size).fill(0));

    // Pre-process: Any cell with unique value in both row and col must be white
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = numbers[r][c];
        let hasRowDup = false;
        let hasColDup = false;

        for (let col = 0; col < size; col++) {
          if (col !== c && numbers[r][col] === val) {
            hasRowDup = true;
            break;
          }
        }
        for (let row = 0; row < size; row++) {
          if (row !== r && numbers[row][c] === val) {
            hasColDup = true;
            break;
          }
        }

        if (!hasRowDup && !hasColDup) {
          initialBoard[r][c] = 1; // Forced white
        }
      }
    }

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    // Propagate deterministic constraints
    function propagate(board) {
      let changed = true;
      while (changed) {
        changed = false;

        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            // If cell is shaded (2), all neighbors must be white (1)
            if (board[r][c] === 2) {
              for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                  if (board[nr][nc] === 2) return false; // Adjacent shaded violation
                  if (board[nr][nc] === 0) {
                    board[nr][nc] = 1;
                    changed = true;
                  }
                }
              }
            }

            // If cell is white (1), eliminate duplicates in same row/col by shading them (2)
            if (board[r][c] === 1) {
              const val = numbers[r][c];
              for (let col = 0; col < size; col++) {
                if (col !== c && numbers[r][col] === val) {
                  if (board[r][col] === 1) return false; // Two white duplicate conflict
                  if (board[r][col] === 0) {
                    board[r][col] = 2;
                    changed = true;
                  }
                }
              }
              for (let row = 0; row < size; row++) {
                if (row !== r && numbers[row][c] === val) {
                  if (board[row][c] === 1) return false; // Two white duplicate conflict
                  if (board[row][c] === 0) {
                    board[row][col] = 2;
                    changed = true;
                  }
                }
              }
            }
          }
        }
      }
      return true;
    }

    function isConnected(board) {
      let totalNonShaded = 0;
      let startR = -1;
      let startC = -1;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] !== 2) {
            totalNonShaded++;
            if (startR === -1) {
              startR = r;
              startC = c;
            }
          }
        }
      }

      if (totalNonShaded === 0) return false;

      const visited = Array.from({ length: size }, () => new Array(size).fill(false));
      const queue = [{ r: startR, c: startC }];
      visited[startR][startC] = true;
      let count = 0;

      while (queue.length > 0) {
        const { r, c } = queue.shift();
        count++;

        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (!visited[nr][nc] && board[nr][nc] !== 2) {
              visited[nr][nc] = true;
              queue.push({ r: nr, c: nc });
            }
          }
        }
      }

      return count === totalNonShaded;
    }

    function search(board) {
      if (solutions.length >= maxSolutions) return;

      if (!isConnected(board)) return;

      // Find unassigned cell that still has an unshaded duplicate in row or col
      let targetR = -1;
      let targetC = -1;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] === 0) {
            const v = numbers[r][c];
            let hasDup = false;
            for (let col = 0; col < size; col++) {
              if (col !== c && board[r][col] !== 2 && numbers[r][col] === v) {
                hasDup = true;
                break;
              }
            }
            if (!hasDup) {
              for (let row = 0; row < size; row++) {
                if (row !== r && board[row][c] !== 2 && numbers[row][c] === v) {
                  hasDup = true;
                  break;
                }
              }
            }
            if (hasDup) {
              targetR = r;
              targetC = c;
              break;
            }
          }
        }
        if (targetR !== -1) break;
      }

      if (targetR === -1) {
        // No unassigned cell has any duplicate!
        // All remaining unassigned cells can safely be white (1).
        const finalBoard = board.map(row => [...row]);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (finalBoard[r][c] === 0) finalBoard[r][c] = 1;
          }
        }
        if (isConnected(finalBoard)) {
          const sol = finalBoard.map(row => row.map(cell => cell === 2));
          solutions.push(sol);
        }
        return;
      }

      // Branch 1: Try shaded (2)
      const b2 = board.map(row => [...row]);
      b2[targetR][targetC] = 2;
      if (propagate(b2)) {
        search(b2);
      }

      if (solutions.length >= maxSolutions) return;

      // Branch 2: Try white (1)
      const b1 = board.map(row => [...row]);
      b1[targetR][targetC] = 1;
      if (propagate(b1)) {
        search(b1);
      }
    }

    if (propagate(initialBoard)) {
      search(initialBoard);
    }

    return solutions;
  }

  /**
   * Deductive hint generator
   * Inspects current board state and returns the next logical step with explanation
   */
  function getHint(grid, numbers) {
    const size = numbers.length;

    // Rule 1: Three identical numbers in a row or col (triplet: X, X, X)
    // The middle one must be white, outers must be shaded
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        const v = numbers[r][c];
        if (numbers[r][c + 1] === v && numbers[r][c + 2] === v) {
          if (grid[r][c + 1] !== STATE_WHITE) {
            return {
              r,
              c: c + 1,
              action: 'circle',
              reason: 'Three in a row: The middle number must be white because two black cells cannot touch.'
            };
          }
          if (grid[r][c] !== STATE_SHADED) {
            return {
              r,
              c,
              action: 'shade',
              reason: 'Three in a row: The outer numbers must be shaded black to avoid duplicate white cells.'
            };
          }
          if (grid[r][c + 2] !== STATE_SHADED) {
            return {
              r,
              c: c + 2,
              action: 'shade',
              reason: 'Three in a row: The outer numbers must be shaded black to avoid duplicate white cells.'
            };
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        const v = numbers[r][c];
        if (numbers[r + 1][c] === v && numbers[r + 2][c] === v) {
          if (grid[r + 1][c] !== STATE_WHITE) {
            return {
              r: r + 1,
              c,
              action: 'circle',
              reason: 'Three in a column: The middle number must be white because two black cells cannot touch.'
            };
          }
          if (grid[r][c] !== STATE_SHADED) {
            return {
              r,
              c,
              action: 'shade',
              reason: 'Three in a column: The outer numbers must be shaded black to avoid duplicate white cells.'
            };
          }
          if (grid[r + 2][c] !== STATE_SHADED) {
            return {
              r: r + 2,
              c,
              action: 'shade',
              reason: 'Three in a column: The outer numbers must be shaded black to avoid duplicate white cells.'
            };
          }
        }
      }
    }

    // Rule 2: Sandwich rule (X, Y, X with distance 2)
    // The middle number Y must be white!
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 2; c++) {
        if (numbers[r][c] === numbers[r][c + 2]) {
          if (grid[r][c + 1] !== STATE_WHITE) {
            return {
              r,
              c: c + 1,
              action: 'circle',
              reason: 'Sandwich rule: A number flanked by identical numbers must be white (safe).'
            };
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 2; r++) {
        if (numbers[r][c] === numbers[r + 2][c]) {
          if (grid[r + 1][c] !== STATE_WHITE) {
            return {
              r: r + 1,
              c,
              action: 'circle',
              reason: 'Sandwich rule: A number flanked by identical numbers must be white (safe).'
            };
          }
        }
      }
    }

    // Rule 3: Black cells force all orthogonal neighbors to be white
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === STATE_SHADED) {
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (grid[nr][nc] === STATE_NEUTRAL) {
                return {
                  r: nr,
                  c: nc,
                  action: 'circle',
                  reason: 'Black cells cannot touch: All neighbors of a shaded stone must be white.'
                };
              }
            }
          }
        }
      }
    }

    // Rule 4: Circled white cells eliminate all other matching numbers in same row/col
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === STATE_WHITE) {
          const val = numbers[r][c];
          // Check same row
          for (let col = 0; col < size; col++) {
            if (col !== c && numbers[r][col] === val && grid[r][col] !== STATE_SHADED) {
              return {
                r,
                c: col,
                action: 'shade',
                reason: `Duplicate in row: Number ${val} is already confirmed white, so this duplicate must be shaded.`
              };
            }
          }
          // Check same col
          for (let row = 0; row < size; row++) {
            if (row !== r && numbers[row][c] === val && grid[row][c] !== STATE_SHADED) {
              return {
                r: row,
                c,
                action: 'shade',
                reason: `Duplicate in column: Number ${val} is already confirmed white, so this duplicate must be shaded.`
              };
            }
          }
        }
      }
    }

    // Rule 5: Adjacent pair with another identical in same line
    // If [X, X] is adjacent, any other X in that row/col must be shaded
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 1; c++) {
        if (numbers[r][c] === numbers[r][c + 1]) {
          const val = numbers[r][c];
          for (let col = 0; col < size; col++) {
            if (col !== c && col !== c + 1 && numbers[r][col] === val && grid[r][col] !== STATE_SHADED) {
              return {
                r,
                c: col,
                action: 'shade',
                reason: `Pair constraint: One of the adjacent ${val}s must be shaded, so any other ${val} in this row must be shaded.`
              };
            }
          }
        }
      }
    }

    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size - 1; r++) {
        if (numbers[r][c] === numbers[r + 1][c]) {
          const val = numbers[r][c];
          for (let row = 0; row < size; row++) {
            if (row !== r && row !== r + 1 && numbers[row][c] === val && grid[row][c] !== STATE_SHADED) {
              return {
                r: row,
                c,
                action: 'shade',
                reason: `Pair constraint: One of the adjacent ${val}s must be shaded, so any other ${val} in this column must be shaded.`
              };
            }
          }
        }
      }
    }

    // Fallback: Use solver to compare against unique solution
    const solutions = solve(numbers, 1);
    if (solutions.length > 0) {
      const solution = solutions[0];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isShadedInSol = solution[r][c];
          if (isShadedInSol && grid[r][c] !== STATE_SHADED) {
            return {
              r,
              c,
              action: 'shade',
              reason: 'Logical deduction: Shading this stone eliminates duplicate conflicts without cutting connectivity.'
            };
          } else if (!isShadedInSol && grid[r][c] === STATE_NEUTRAL) {
            return {
              r,
              c,
              action: 'circle',
              reason: 'Logical deduction: This number must remain white to keep the stream connected.'
            };
          }
        }
      }
    }

    return null;
  }

  return {
    STATE_NEUTRAL,
    STATE_SHADED,
    STATE_WHITE,
    createGrid,
    cloneGrid,
    getDuplicateConflicts,
    getAdjacentShadedViolations,
    checkConnectivity,
    isSolved,
    solve,
    getHint
  };
});

/**
 * ZenHitori Application Controller
 * Handles user interactions, game loop, rendering, audio cues, undo, hints, and local storage.
 */

(function () {
  'use strict';

  // Game state
  let currentPackIndex = 0;
  let currentLevelIndex = 0;
  let currentLevel = null;
  let grid = [];
  let undoStack = [];
  let moveCount = 0;
  let secondsElapsed = 0;
  let timerInterval = null;
  let isGameActive = true;
  let inputMode = 'cycle'; // 'cycle' | 'shade' | 'circle'
  let isDragging = false;
  let dragApplyState = null;
  let lastDraggedCell = null;

  // DOM Elements
  const gridElement = document.getElementById('hitori-grid');
  const packNameElement = document.getElementById('pack-name');
  const levelNameElement = document.getElementById('level-name');
  const statConflictsElement = document.getElementById('stat-conflicts');
  const statMovesElement = document.getElementById('stat-moves');
  const statTimerElement = document.getElementById('stat-timer');
  const statusBannerElement = document.getElementById('status-banner');

  // Control Buttons
  const btnSound = document.getElementById('btn-sound');
  const btnRules = document.getElementById('btn-rules');
  const btnLevels = document.getElementById('btn-levels');
  const btnHint = document.getElementById('btn-hint');
  const btnUndo = document.getElementById('btn-undo');
  const btnReset = document.getElementById('btn-reset');

  // Mode Buttons
  const modeCycleBtn = document.getElementById('mode-cycle');
  const modeShadeBtn = document.getElementById('mode-shade');
  const modeCircleBtn = document.getElementById('mode-circle');

  // Modals
  const modalLevels = document.getElementById('modal-levels');
  const closeLevels = document.getElementById('close-levels');
  const packsTabs = document.getElementById('packs-tabs');
  const levelsGrid = document.getElementById('levels-grid');

  const modalRules = document.getElementById('modal-rules');
  const closeRules = document.getElementById('close-rules');
  const btnRulesGotIt = document.getElementById('btn-rules-got-it');

  const modalVictory = document.getElementById('modal-victory');
  const btnNextLevel = document.getElementById('btn-next-level');
  const victoryTime = document.getElementById('victory-time');
  const victoryMoves = document.getElementById('victory-moves');

  // Local storage keys
  const STORAGE_COMPLETED = 'zenhitori_completed_levels';
  const STORAGE_LAST_PLAYED = 'zenhitori_last_played';

  function getCompletedLevels() {
    try {
      const data = localStorage.getItem(STORAGE_COMPLETED);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCompletedLevel(levelId) {
    try {
      const completed = getCompletedLevels();
      completed[levelId] = true;
      localStorage.setItem(STORAGE_COMPLETED, JSON.stringify(completed));
    } catch (e) {}
  }

  function saveLastPlayed(packIdx, levelIdx) {
    try {
      localStorage.setItem(STORAGE_LAST_PLAYED, JSON.stringify({ packIdx, levelIdx }));
    } catch (e) {}
  }

  function loadLastPlayed() {
    try {
      const data = localStorage.getItem(STORAGE_LAST_PLAYED);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.packIdx === 'number' && typeof parsed.levelIdx === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return { packIdx: 0, levelIdx: 0 };
  }

  // Timer
  function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (isGameActive) {
        secondsElapsed++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    if (statTimerElement) {
      statTimerElement.textContent = formatTime(secondsElapsed);
    }
  }

  // Load a level
  function loadLevel(packIdx, levelIdx) {
    currentPackIndex = packIdx;
    currentLevelIndex = levelIdx;
    currentLevel = HitoriLevels.getLevel(packIdx, levelIdx);

    if (!currentLevel) {
      console.error('Level not found:', packIdx, levelIdx);
      return;
    }

    saveLastPlayed(packIdx, levelIdx);

    const size = currentLevel.size;
    grid = HitoriEngine.createGrid(size);
    undoStack = [];
    moveCount = 0;
    isGameActive = true;

    // Update Header labels
    packNameElement.textContent = currentLevel.packName;
    levelNameElement.textContent = `Level ${currentLevel.levelIndex} (${size}×${size})`;
    statMovesElement.textContent = '0';
    statusBannerElement.className = 'status-banner';
    statusBannerElement.textContent = 'Shade duplicates with black stones. Keep numbers connected.';

    startTimer();
    renderBoard();
    updateConflictStats();
  }

  // Render the board
  function renderBoard() {
    const size = currentLevel.size;
    gridElement.innerHTML = '';
    gridElement.className = `hitori-grid grid-size-${size}`;
    gridElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    // Detect duplicate conflicts for highlighting
    const conflicts = HitoriEngine.getDuplicateConflicts(grid, currentLevel.grid);
    const conflictCells = new Set();
    conflicts.forEach(c => {
      c.cells.forEach(pt => {
        conflictCells.add(`${pt.r},${pt.c}`);
      });
    });

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.textContent = currentLevel.grid[r][c];

        const state = grid[r][c];
        if (state === HitoriEngine.STATE_SHADED) {
          cell.classList.add('shaded');
        } else if (state === HitoriEngine.STATE_WHITE) {
          cell.classList.add('white');
        } else if (conflictCells.has(`${r},${c}`)) {
          cell.classList.add('has-conflict');
        }

        gridElement.appendChild(cell);
      }
    }
  }

  // Handle cell click / interaction
  function handleCellInteraction(r, c) {
    if (!isGameActive) return;

    const prevState = grid[r][c];
    let nextState = prevState;

    if (inputMode === 'cycle') {
      // Neutral (0) -> Shaded (1) -> White (2) -> Neutral (0)
      nextState = (prevState + 1) % 3;
    } else if (inputMode === 'shade') {
      nextState = prevState === HitoriEngine.STATE_SHADED ? HitoriEngine.STATE_NEUTRAL : HitoriEngine.STATE_SHADED;
    } else if (inputMode === 'circle') {
      nextState = prevState === HitoriEngine.STATE_WHITE ? HitoriEngine.STATE_NEUTRAL : HitoriEngine.STATE_WHITE;
    }

    if (nextState !== prevState) {
      applyCellState(r, c, nextState);
    }
  }

  function applyCellState(r, c, nextState) {
    // Record undo step
    undoStack.push({
      grid: HitoriEngine.cloneGrid(grid),
      moveCount
    });

    grid[r][c] = nextState;
    moveCount++;
    statMovesElement.textContent = String(moveCount);

    // Audio cue
    if (nextState === HitoriEngine.STATE_SHADED) {
      ZenAudio.playStoneClick();
    } else if (nextState === HitoriEngine.STATE_WHITE) {
      ZenAudio.playWhiteCircle();
    } else {
      ZenAudio.playBambooClack();
    }

    renderBoard();
    updateConflictStats();
    checkVictory();
  }

  // Update conflict statistics and alerts
  function updateConflictStats() {
    const conflicts = HitoriEngine.getDuplicateConflicts(grid, currentLevel.grid);
    const adjacentViolations = HitoriEngine.getAdjacentShadedViolations(grid);
    const connectivity = HitoriEngine.checkConnectivity(grid);

    statConflictsElement.textContent = String(conflicts.length);

    if (adjacentViolations.length > 0) {
      statusBannerElement.className = 'status-banner error';
      statusBannerElement.textContent = '⚠️ Shaded stones cannot touch orthogonally!';
    } else if (!connectivity.isConnected) {
      statusBannerElement.className = 'status-banner error';
      statusBannerElement.textContent = '⚠️ All unshaded numbers must stay connected!';
    } else if (conflicts.length > 0) {
      statusBannerElement.className = 'status-banner';
      statusBannerElement.textContent = `${conflicts.length} duplicate conflicts remaining.`;
    } else {
      statusBannerElement.className = 'status-banner success';
      statusBannerElement.textContent = 'All duplicates eliminated!';
    }
  }

  // Check victory condition
  function checkVictory() {
    if (HitoriEngine.isSolved(grid, currentLevel.grid)) {
      isGameActive = false;
      stopTimer();
      saveCompletedLevel(currentLevel.id);

      ZenAudio.playVictoryGong();

      // Show victory modal after short delay for impact
      setTimeout(() => {
        victoryTime.textContent = formatTime(secondsElapsed);
        victoryMoves.textContent = String(moveCount);
        modalVictory.classList.add('active');
      }, 350);
    }
  }

  // Undo function
  function undo() {
    if (!isGameActive || undoStack.length === 0) return;

    const last = undoStack.pop();
    grid = last.grid;
    moveCount = last.moveCount;
    statMovesElement.textContent = String(moveCount);

    ZenAudio.playBambooClack();
    renderBoard();
    updateConflictStats();
  }

  // Reset function
  function resetLevel() {
    if (!isGameActive) return;

    undoStack.push({
      grid: HitoriEngine.cloneGrid(grid),
      moveCount
    });

    grid = HitoriEngine.createGrid(currentLevel.size);
    moveCount++;
    statMovesElement.textContent = String(moveCount);

    ZenAudio.playBambooClack();
    renderBoard();
    updateConflictStats();
  }

  // Hint function
  function giveHint() {
    if (!isGameActive) return;

    const hint = HitoriEngine.getHint(grid, currentLevel.grid);
    if (!hint) {
      statusBannerElement.className = 'status-banner';
      statusBannerElement.textContent = 'Keep going! Check for duplicate numbers or cutoffs.';
      return;
    }

    ZenAudio.playHintChime();
    statusBannerElement.className = 'status-banner success';
    statusBannerElement.textContent = `💡 ${hint.reason}`;

    // Highlight target cell
    renderBoard();
    const cellEl = gridElement.querySelector(`[data-r="${hint.r}"][data-c="${hint.c}"]`);
    if (cellEl) {
      cellEl.classList.add('hint-target');
      setTimeout(() => {
        cellEl.classList.remove('hint-target');
      }, 3000);
    }
  }

  // Level selector modal
  function openLevelModal() {
    renderPacksTabs();
    renderLevelsGrid(currentPackIndex);
    modalLevels.classList.add('active');
  }

  function renderPacksTabs() {
    packsTabs.innerHTML = '';
    HitoriLevels.PACKS.forEach((pack, idx) => {
      const tab = document.createElement('button');
      tab.className = `pack-tab ${idx === currentPackIndex ? 'active' : ''}`;
      tab.textContent = `${pack.name} (${pack.size}×${pack.size})`;
      tab.addEventListener('click', () => {
        document.querySelectorAll('.pack-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLevelsGrid(idx);
      });
      packsTabs.appendChild(tab);
    });
  }

  function renderLevelsGrid(packIdx) {
    levelsGrid.innerHTML = '';
    const pack = HitoriLevels.getPack(packIdx);
    const completed = getCompletedLevels();

    pack.levels.forEach((lvl, lvlIdx) => {
      const chip = document.createElement('button');
      chip.className = 'level-chip';
      chip.textContent = String(lvl.levelIndex);

      if (completed[lvl.id]) {
        chip.classList.add('completed');
      }
      if (packIdx === currentPackIndex && lvlIdx === currentLevelIndex) {
        chip.classList.add('current');
      }

      chip.addEventListener('click', () => {
        modalLevels.classList.remove('active');
        loadLevel(packIdx, lvlIdx);
      });

      levelsGrid.appendChild(chip);
    });
  }

  // Input Mode switching
  function setInputMode(mode) {
    inputMode = mode;
    modeCycleBtn.classList.toggle('active', mode === 'cycle');
    modeShadeBtn.classList.toggle('active', mode === 'shade');
    modeCircleBtn.classList.toggle('active', mode === 'circle');
    ZenAudio.initAudio();
  }

  // Drag painting support
  function setupDragEvents() {
    gridElement.addEventListener('pointerdown', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell || !isGameActive) return;

      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);

      isDragging = true;
      lastDraggedCell = `${r},${c}`;

      // In shade mode, dragging paints stones; in circle mode, dragging paints circles
      if (inputMode === 'shade') {
        dragApplyState = grid[r][c] === HitoriEngine.STATE_SHADED ? HitoriEngine.STATE_NEUTRAL : HitoriEngine.STATE_SHADED;
        applyCellState(r, c, dragApplyState);
      } else if (inputMode === 'circle') {
        dragApplyState = grid[r][c] === HitoriEngine.STATE_WHITE ? HitoriEngine.STATE_NEUTRAL : HitoriEngine.STATE_WHITE;
        applyCellState(r, c, dragApplyState);
      } else {
        handleCellInteraction(r, c);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging || !isGameActive) return;
      if (inputMode === 'cycle') return; // Only drag-paint in shade/circle modes

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;
      const cell = target.closest('.cell');
      if (!cell) return;

      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);
      const key = `${r},${c}`;

      if (key !== lastDraggedCell && dragApplyState !== null) {
        lastDraggedCell = key;
        if (grid[r][c] !== dragApplyState) {
          applyCellState(r, c, dragApplyState);
        }
      }
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
      dragApplyState = null;
      lastDraggedCell = null;
    });
  }

  // Event Listeners
  btnSound.addEventListener('click', () => {
    const isMuted = ZenAudio.toggleMute();
    btnSound.textContent = isMuted ? '🔇' : '🔊';
  });

  btnRules.addEventListener('click', () => {
    modalRules.classList.add('active');
    ZenAudio.initAudio();
  });

  closeRules.addEventListener('click', () => {
    modalRules.classList.remove('active');
  });

  btnRulesGotIt.addEventListener('click', () => {
    modalRules.classList.remove('active');
  });

  btnLevels.addEventListener('click', () => {
    openLevelModal();
    ZenAudio.initAudio();
  });

  closeLevels.addEventListener('click', () => {
    modalLevels.classList.remove('active');
  });

  modeCycleBtn.addEventListener('click', () => setInputMode('cycle'));
  modeShadeBtn.addEventListener('click', () => setInputMode('shade'));
  modeCircleBtn.addEventListener('click', () => setInputMode('circle'));

  btnHint.addEventListener('click', giveHint);
  btnUndo.addEventListener('click', undo);
  btnReset.addEventListener('click', resetLevel);

  btnNextLevel.addEventListener('click', () => {
    modalVictory.classList.remove('active');
    const pack = HitoriLevels.getPack(currentPackIndex);
    if (currentLevelIndex + 1 < pack.levels.length) {
      loadLevel(currentPackIndex, currentLevelIndex + 1);
    } else if (currentPackIndex + 1 < HitoriLevels.PACKS.length) {
      loadLevel(currentPackIndex + 1, 0);
    } else {
      loadLevel(0, 0); // Restart from pack 1
    }
  });

  // Close modals on background tap
  [modalLevels, modalRules, modalVictory].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && modal !== modalVictory) {
        modal.classList.remove('active');
      }
    });
  });

  // Sound icon initial state
  btnSound.textContent = ZenAudio.getMuted() ? '🔇' : '🔊';

  // Keyboard accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      undo();
    } else if (e.key === 'h' || e.key === 'H') {
      giveHint();
    } else if (e.key === 'r' || e.key === 'R') {
      resetLevel();
    }
  });

  // Register service worker for offline PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration skipped:', err);
      });
    });
  }

  // Setup interactions and load initial level
  setupDragEvents();
  const lastPlayed = loadLastPlayed();
  loadLevel(lastPlayed.packIdx, lastPlayed.levelIdx);

})();

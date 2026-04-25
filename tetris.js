// Tetris Game Module v2
const TetrisGame = (() => {
  const COLS = 10, ROWS = 20, CELL = 28;
  const WALL = 4; // wall thickness px
  const BOARD_X = WALL, BOARD_Y = 0;

  let canvas, ctx, nextCanvas, nextCtx, scoreEl, linesEl;
  let board, currentPiece, nextPiece, score, lines, running, gameOver, gameLoop;
  let animating = false, fallingBlocks = [], clearingRows = [];
  let startTime, elapsedTime;

  const PIECES = [
    { shape: [[1,1,1,1]],           color: '#00f0f0' },
    { shape: [[1,1],[1,1]],         color: '#f0f000' },
    { shape: [[0,1,0],[1,1,1]],     color: '#a000f0' },
    { shape: [[1,0,0],[1,1,1]],     color: '#f0a000' },
    { shape: [[0,0,1],[1,1,1]],     color: '#0000f0' },
    { shape: [[0,1,1],[1,1,0]],     color: '#00f000' },
    { shape: [[1,1,0],[0,1,1]],     color: '#f00000' },
  ];

  const SCORE_TABLE = [0, 100, 300, 500, 800];

  function init(canvasEl, nextCanvasEl, scoreElement, linesElement) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    nextCanvas = nextCanvasEl;
    nextCtx = nextCanvas.getContext('2d');
    scoreEl = scoreElement;
    linesEl = linesElement;
    reset();
    document.addEventListener('keydown', onKey);
  }

  function reset() {
    clearInterval(gameLoop);
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0; lines = 0; running = false; gameOver = false; animating = false;
    fallingBlocks = []; clearingRows = []; startTime = null; elapsedTime = 0;
    if (scoreEl) scoreEl.textContent = 0;
    if (linesEl) linesEl.textContent = 0;
    currentPiece = spawnPiece();
    nextPiece = spawnPiece();
    draw(); drawNext();
  }

  function spawnPiece() {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
      shape: p.shape.map(r => [...r]),
      color: p.color,
      x: Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2),
      y: 0,
    };
  }

  function start() {
    if (gameOver) { reset(); return; }
    if (running) return;
    running = true;
    startTime = Date.now();
    gameLoop = setInterval(tick, 500);
  }

  function stop() { clearInterval(gameLoop); running = false; }

  function tick() {
    if (animating) return;
    if (!move(0, 1)) {
      place();
      const clearedRows = findClearLines();
      if (clearedRows.length > 0) {
        animateClear(clearedRows);
      } else {
        nextTurn();
      }
      return; // don't call draw() again — nextTurn/animateClear handle it
    }
    draw();
  }

  function nextTurn() {
    currentPiece = nextPiece;
    nextPiece = spawnPiece();
    drawNext();
    if (collides(currentPiece, 0, 0)) {
      elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      stop(); gameOver = true; draw(); drawGameOver();
    }
  }

  function findClearLines() {
    const rows = [];
    for (let r = 0; r < ROWS; r++)
      if (board[r].every(c => c !== 0)) rows.push(r);
    return rows;
  }

  function animateClear(rowIndices) {
    animating = true;
    clearingRows = rowIndices;

    // flash effect
    let flashes = 0;
    const flashInterval = setInterval(() => {
      flashes++;
      draw();
      if (flashes >= 4) {
        clearInterval(flashInterval);
        // now do falling animation
        doFallAnimation(rowIndices);
      }
    }, 60);
  }

  function doFallAnimation(rowIndices) {
    // remove cleared rows from board, collect remaining blocks above with target positions
    const rowSet = new Set(rowIndices);

    // build new board without cleared rows
    const newBoard = board.filter((_, r) => !rowSet.has(r));
    const removed = rowIndices.length;
    while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(0));

    // collect blocks that need to fall (were above cleared rows)
    // animate them dropping
    fallingBlocks = [];
    const topClearRow = Math.min(...rowIndices);

    for (let r = 0; r < topClearRow; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          fallingBlocks.push({
            color: board[r][c],
            col: c,
            startRow: r,
            currentY: r * CELL,
            targetY: (r + removed) * CELL,
          });
        }
      }
    }

    // clear those rows from board temporarily for animation
    for (let r = 0; r < topClearRow; r++)
      board[r] = Array(COLS).fill(0);
    for (const ri of rowIndices)
      board[ri] = Array(COLS).fill(0);

    const speed = 6; // px per frame
    let raf;

    function animFrame() {
      let allDone = true;
      for (const b of fallingBlocks) {
        b.currentY = Math.min(b.currentY + speed, b.targetY);
        if (b.currentY < b.targetY) allDone = false;
      }
      draw();
      if (!allDone) {
        raf = requestAnimationFrame(animFrame);
      } else {
        // commit
        fallingBlocks = [];
        board = newBoard;
        const cleared = rowIndices.length;
        score += SCORE_TABLE[cleared] || 0;
        lines += cleared;
        if (scoreEl) scoreEl.textContent = score;
        if (linesEl) linesEl.textContent = lines;
        clearingRows = [];
        animating = false;
        nextTurn();
        if (!gameOver) draw();
      }
    }
    raf = requestAnimationFrame(animFrame);
  }

  function move(dx, dy) {
    if (!collides(currentPiece, dx, dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      draw();
      return true;
    }
    return false;
  }

  function rotate() {
    const rotated = currentPiece.shape[0].map((_, i) =>
      currentPiece.shape.map(r => r[i]).reverse()
    );
    const prev = currentPiece.shape;
    currentPiece.shape = rotated;
    if (collides(currentPiece, 0, 0)) currentPiece.shape = prev;
    draw();
  }

  function hardDrop() {
    while (!collides(currentPiece, 0, 1)) currentPiece.y++;
    tick();
  }

  function collides(piece, dx, dy) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function place() {
    for (let r = 0; r < currentPiece.shape.length; r++)
      for (let c = 0; c < currentPiece.shape[r].length; c++)
        if (currentPiece.shape[r][c]) {
          const ny = currentPiece.y + r;
          if (ny >= 0) board[ny][currentPiece.x + c] = currentPiece.color;
        }
  }

  function drawBlock(color, x, y, size, context, alpha) {
    context.globalAlpha = alpha !== undefined ? alpha : 1;
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, size - 2, size - 2);
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.fillRect(x + 2, y + 2, size - 4, 4);
    context.strokeStyle = 'rgba(0,0,0,0.3)';
    context.lineWidth = 1;
    context.strokeRect(x + 1, y + 1, size - 2, size - 2);
    context.globalAlpha = 1;
  }

  function draw() {
    const W = COLS * CELL + WALL * 2;
    const H = ROWS * CELL + WALL;

    // outer background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // walls — left, right, bottom
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, 0, WALL, H);                          // left wall
    ctx.fillRect(COLS * CELL + WALL, 0, WALL, H);         // right wall
    ctx.fillRect(0, ROWS * CELL, W, WALL);                // floor

    // wall inner glow
    ctx.strokeStyle = 'rgba(100,100,200,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0, WALL - 0.5, H);
    ctx.strokeRect(COLS * CELL + WALL + 0.5, 0, WALL - 1, H);
    ctx.strokeRect(0, ROWS * CELL + 0.5, W, WALL - 1);

    // board background
    ctx.fillStyle = '#111122';
    ctx.fillRect(WALL, 0, COLS * CELL, ROWS * CELL);

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(WALL, r*CELL); ctx.lineTo(WALL + COLS*CELL, r*CELL); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(WALL + c*CELL, 0); ctx.lineTo(WALL + c*CELL, ROWS*CELL); ctx.stroke();
    }

    // board blocks
    const flashOn = clearingRows.length > 0 && Math.floor(Date.now() / 60) % 2 === 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          const isClearing = clearingRows.includes(r);
          const color = isClearing && flashOn ? 'white' : board[r][c];
          drawBlock(color, WALL + c*CELL, r*CELL, CELL, ctx);
        }
      }
    }

    // falling animation blocks
    for (const b of fallingBlocks) {
      drawBlock(b.color, WALL + b.col * CELL, b.currentY, CELL, ctx);
    }

    // ghost piece
    if (!animating) {
      let ghostY = currentPiece.y;
      while (!collides({ ...currentPiece, y: ghostY + 1 }, 0, 0)) ghostY++;
      for (let r = 0; r < currentPiece.shape.length; r++)
        for (let c = 0; c < currentPiece.shape[r].length; c++)
          if (currentPiece.shape[r][c]) {
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(WALL + (currentPiece.x+c)*CELL+1, (ghostY+r)*CELL+1, CELL-2, CELL-2);
          }

      // current piece
      for (let r = 0; r < currentPiece.shape.length; r++)
        for (let c = 0; c < currentPiece.shape[r].length; c++)
          if (currentPiece.shape[r][c])
            drawBlock(currentPiece.color, WALL + (currentPiece.x+c)*CELL, (currentPiece.y+r)*CELL, CELL, ctx);
    }

    // live score on board
    if (running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(WALL + 4, 6, 120, 28);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 13px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`⭐ ${score}`, WALL + 12, 25);
    }

    // start hint
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(WALL, ROWS*CELL/2 - 30, COLS*CELL, 60);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 13px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press any key to start', WALL + COLS*CELL/2, ROWS*CELL/2 + 5);
    }
  }

  function drawNext() {
    nextCtx.fillStyle = '#1a1a2e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const offsetX = Math.floor((4 - nextPiece.shape[0].length) / 2) * 24;
    const offsetY = Math.floor((4 - nextPiece.shape.length) / 2) * 24;
    for (let r = 0; r < nextPiece.shape.length; r++)
      for (let c = 0; c < nextPiece.shape[r].length; c++)
        if (nextPiece.shape[r][c])
          drawBlock(nextPiece.color, offsetX + c*24, offsetY + r*24, 24, nextCtx);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(WALL, 0, COLS*CELL, ROWS*CELL);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center';
    ctx.font = 'bold 24px "Plus Jakarta Sans",sans-serif';
    ctx.fillText('GAME OVER', WALL + COLS*CELL/2, ROWS*CELL/2 - 35);
    ctx.font = '14px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`Score: ${score}  ·  Lines: ${lines}`, WALL + COLS*CELL/2, ROWS*CELL/2);
    const mins = Math.floor(elapsedTime / 60), secs = elapsedTime % 60;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '13px "Plus Jakarta Sans",sans-serif';
    ctx.fillText(`Time: ${mins}:${secs.toString().padStart(2,'0')}`, WALL + COLS*CELL/2, ROWS*CELL/2 + 25);
    ctx.font = '12px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('Press any key to restart', WALL + COLS*CELL/2, ROWS*CELL/2 + 52);
  }

  function onKey(e) {
    if (gameOver) { reset(); return; }
    if (!running) { start(); return; }
    if (animating) return;
    const actions = {
      ArrowLeft:  () => move(-1, 0),
      ArrowRight: () => move(1, 0),
      ArrowDown:  () => move(0, 1),
      ArrowUp:    () => rotate(),
      ' ':        () => hardDrop(),
      z:          () => rotate(),
    };
    const fn = actions[e.key];
    if (fn) { fn(); e.preventDefault(); }
  }

  function destroy() { stop(); document.removeEventListener('keydown', onKey); }

  return { init, destroy, reset };
})();

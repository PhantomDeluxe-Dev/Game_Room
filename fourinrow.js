const FourInRowGame = (() => {
  const COLS = 7, ROWS = 6, CELL = 70;
  const W = COLS * CELL, H = ROWS * CELL + 80;
  let canvas, ctx, board, currentPlayer, gameOver, running;
  let statusEl, hoverCol;

  function init(canvasEl, statusElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    statusEl = statusElement;
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    reset();
  }

  function reset() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    currentPlayer = 1; gameOver = false; running = true; hoverCol = -1;
    if (statusEl) statusEl.textContent = 'Your turn 🔴';
    draw();
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    hoverCol = Math.floor(x / CELL);
    if (!gameOver && currentPlayer === 1) draw();
  }

  function onClick(e) {
    if (gameOver) { reset(); return; }
    if (currentPlayer !== 1) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const col = Math.floor(x / CELL);
    if (dropPiece(col, 1)) {
      if (checkWin(1)) { draw(); endGame('YOU WIN! 🎉'); return; }
      if (isDraw()) { draw(); endGame("IT'S A DRAW!"); return; }
      currentPlayer = 2;
      if (statusEl) statusEl.textContent = 'CPU thinking... 🟡';
      draw();
      setTimeout(cpuMove, 400);
    }
  }

  function cpuMove() {
    // try to win, then block, then random
    let col = findBestMove();
    if (col === -1) col = Math.floor(Math.random() * COLS);
    dropPiece(col, 2);
    if (checkWin(2)) { draw(); endGame('CPU WINS 🤖'); return; }
    if (isDraw()) { draw(); endGame("IT'S A DRAW!"); return; }
    currentPlayer = 1;
    if (statusEl) statusEl.textContent = 'Your turn 🔴';
    draw();
  }

  function findBestMove() {
    // win
    for (let c = 0; c < COLS; c++) { const b = JSON.parse(JSON.stringify(board)); if (dropTemp(b, c, 2) && checkWinBoard(b, 2)) return c; }
    // block
    for (let c = 0; c < COLS; c++) { const b = JSON.parse(JSON.stringify(board)); if (dropTemp(b, c, 1) && checkWinBoard(b, 1)) return c; }
    // center prefer
    if (getRow(3) >= 0) return 3;
    return -1;
  }

  function dropTemp(b, col, player) {
    for (let r = ROWS-1; r >= 0; r--) { if (b[r][col] === 0) { b[r][col] = player; return true; } }
    return false;
  }

  function dropPiece(col, player) {
    for (let r = ROWS-1; r >= 0; r--) {
      if (board[r][col] === 0) { board[r][col] = player; return true; }
    }
    return false;
  }

  function getRow(col) {
    for (let r = ROWS-1; r >= 0; r--) { if (board[r][col] === 0) return r; }
    return -1;
  }

  function checkWin(p) { return checkWinBoard(board, p); }
  function checkWinBoard(b, p) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (check4(b, r, c, 0, 1, p) || check4(b, r, c, 1, 0, p) || check4(b, r, c, 1, 1, p) || check4(b, r, c, 1, -1, p)) return true;
    }
    return false;
  }
  function check4(b, r, c, dr, dc, p) {
    for (let i = 0; i < 4; i++) {
      const nr = r+dr*i, nc = c+dc*i;
      if (nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==p) return false;
    }
    return true;
  }
  function isDraw() { return board[0].every(c => c !== 0); }

  function endGame(msg) {
    gameOver = true;
    if (statusEl) statusEl.textContent = msg + ' — Click to restart';
  }

  function draw() {
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(0, 0, W, H);

    // column highlight
    if (!gameOver && currentPlayer === 1 && hoverCol >= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(hoverCol * CELL, 0, CELL, H);
      // preview piece
      const r = getRow(hoverCol);
      if (r >= 0) {
        ctx.fillStyle = 'rgba(239,83,80,0.4)';
        ctx.beginPath(); ctx.arc(hoverCol*CELL+CELL/2, 40, 24, 0, Math.PI*2); ctx.fill();
      }
    }

    // board holes
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = c*CELL+CELL/2, y = 80+r*CELL+CELL/2;
      ctx.fillStyle = board[r][c] === 1 ? '#ef5350' : board[r][c] === 2 ? '#fdd835' : '#111c44';
      ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI*2); ctx.fill();
      if (board[r][c] !== 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(x-8, y-8, 8, 0, Math.PI*2); ctx.fill();
      }
    }

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL, 80); ctx.lineTo(c*CELL, H); ctx.stroke(); }
  }

  function destroy() {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('click', onClick);
  }

  return { init, destroy, reset };
})();

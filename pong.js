// Pong Game Module
const PongGame = (() => {
  const W = 480, H = 320;
  const PADDLE_W = 10, PADDLE_H = 70, BALL_SIZE = 10;
  const WIN_SCORE = 5, GAME_DURATION = 120;
  const CPU_SPEED = 2.8; // medium difficulty

  let canvas, ctx, playerScoreEl, cpuScoreEl, timerEl;
  let playerY, cpuY, ballX, ballY, ballVX, ballVY;
  let playerScore, cpuScore, running, gameOver;
  let gameLoop, countdownInterval, timeRemaining;
  let keys = {};

  function init(canvasEl, playerScoreElement, cpuScoreElement, timerElement) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    playerScoreEl = playerScoreElement;
    cpuScoreEl = cpuScoreElement;
    timerEl = timerElement;
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    reset();
  }

  function reset() {
    clearInterval(gameLoop);
    clearInterval(countdownInterval);
    playerY = H / 2 - PADDLE_H / 2;
    cpuY = H / 2 - PADDLE_H / 2;
    playerScore = 0; cpuScore = 0;
    timeRemaining = GAME_DURATION;
    running = false; gameOver = false;
    if (playerScoreEl) playerScoreEl.textContent = 0;
    if (cpuScoreEl) cpuScoreEl.textContent = 0;
    if (timerEl) { timerEl.textContent = '2:00'; timerEl.style.color = ''; }
    resetBall(1);
    draw();
  }

  function resetBall(dirX) {
    ballX = W / 2; ballY = H / 2;
    const angle = (Math.random() * 60 - 30) * Math.PI / 180;
    const speed = 4;
    ballVX = dirX * speed * Math.cos(angle);
    ballVY = speed * Math.sin(angle);
  }

  function start() {
    if (gameOver) { reset(); return; }
    if (running) return;
    running = true;
    gameLoop = setInterval(tick, 1000 / 60);
    startCountdown();
  }

  function startCountdown() {
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      timeRemaining--;
      const m = Math.floor(timeRemaining / 60), s = timeRemaining % 60;
      if (timerEl) {
        timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        timerEl.style.color = timeRemaining <= 15 ? '#ef4444' : '';
        timerEl.style.fontWeight = timeRemaining <= 15 ? '700' : '';
      }
      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
        stop();
        gameOver = true;
        draw();
        drawEndScreen(playerScore > cpuScore ? 'YOU WIN! 🎉' : playerScore < cpuScore ? 'CPU WINS 🤖' : "IT'S A TIE!");
      }
    }, 1000);
  }

  function stop() { clearInterval(gameLoop); clearInterval(countdownInterval); running = false; }

  function tick() {
    // player movement
    if (keys['ArrowUp'] || keys['w']) playerY = Math.max(0, playerY - 5);
    if (keys['ArrowDown'] || keys['s']) playerY = Math.min(H - PADDLE_H, playerY + 5);

    // CPU AI — medium: tracks ball with slight lag
    const cpuCenter = cpuY + PADDLE_H / 2;
    if (cpuCenter < ballY - 5) cpuY = Math.min(H - PADDLE_H, cpuY + CPU_SPEED);
    else if (cpuCenter > ballY + 5) cpuY = Math.max(0, cpuY - CPU_SPEED);

    // ball movement
    ballX += ballVX; ballY += ballVY;

    // top / bottom bounce
    if (ballY <= 0) { ballY = 0; ballVY *= -1; }
    if (ballY >= H - BALL_SIZE) { ballY = H - BALL_SIZE; ballVY *= -1; }

    // player paddle collision (left)
    if (ballX <= 30 + PADDLE_W && ballX >= 28 &&
        ballY + BALL_SIZE >= playerY && ballY <= playerY + PADDLE_H) {
      ballX = 30 + PADDLE_W;
      const hitPos = (ballY + BALL_SIZE / 2 - playerY) / PADDLE_H; // 0-1
      const angle = (hitPos - 0.5) * 120 * Math.PI / 180;
      const speed = Math.min(Math.sqrt(ballVX*ballVX + ballVY*ballVY) + 0.2, 10);
      ballVX = Math.abs(speed * Math.cos(angle));
      ballVY = speed * Math.sin(angle);
    }

    // cpu paddle collision (right)
    if (ballX + BALL_SIZE >= W - 30 - PADDLE_W && ballX + BALL_SIZE <= W - 28 &&
        ballY + BALL_SIZE >= cpuY && ballY <= cpuY + PADDLE_H) {
      ballX = W - 30 - PADDLE_W - BALL_SIZE;
      const hitPos = (ballY + BALL_SIZE / 2 - cpuY) / PADDLE_H;
      const angle = (hitPos - 0.5) * 120 * Math.PI / 180;
      const speed = Math.min(Math.sqrt(ballVX*ballVX + ballVY*ballVY) + 0.2, 10);
      ballVX = -Math.abs(speed * Math.cos(angle));
      ballVY = speed * Math.sin(angle);
    }

    // scoring
    if (ballX < 0) {
      cpuScore++;
      if (cpuScoreEl) cpuScoreEl.textContent = cpuScore;
      if (cpuScore >= WIN_SCORE) { stop(); gameOver = true; draw(); drawEndScreen('CPU WINS 🤖'); return; }
      resetBall(1);
    }
    if (ballX > W) {
      playerScore++;
      if (playerScoreEl) playerScoreEl.textContent = playerScore;
      if (playerScore >= WIN_SCORE) { stop(); gameOver = true; draw(); drawEndScreen('YOU WIN! 🎉'); return; }
      resetBall(-1);
    }

    draw();
  }

  function draw() {
    // background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // center dashed line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);

    // labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '11px "Plus Jakarta Sans",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', W/4, 18);
    ctx.fillText('CPU', W*3/4, 18);

    // player paddle
    ctx.fillStyle = 'white';
    roundRect(ctx, 28, playerY, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    // cpu paddle
    ctx.fillStyle = 'rgba(255,100,100,0.9)';
    roundRect(ctx, W - 28 - PADDLE_W, cpuY, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    // ball
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillRect(ballX, ballY, BALL_SIZE, BALL_SIZE);
    ctx.shadowBlur = 0;

    // start hint
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, H/2 - 28, W, 56);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 13px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press any key or ↑↓ to start', W/2, H/2 + 5);
    }
  }

  function drawEndScreen(msg) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center';
    ctx.font = 'bold 26px "Plus Jakarta Sans",sans-serif';
    ctx.fillText(msg, W/2, H/2 - 20);
    ctx.font = '14px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${playerScore} — ${cpuScore}`, W/2, H/2 + 15);
    ctx.font = '12px "Plus Jakarta Sans",sans-serif';
    ctx.fillText('Press any key to play again', W/2, H/2 + 45);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (!running && !gameOver) start();
    if (gameOver) reset();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  }

  function onKeyUp(e) { keys[e.key] = false; }

  function destroy() {
    stop();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  return { init, destroy, reset };
})();

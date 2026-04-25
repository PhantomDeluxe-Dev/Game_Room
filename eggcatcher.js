const EggCatcherGame = (() => {
  const W = 480, H = 360;
  const BASKET_W = 70, BASKET_H = 40;
  const GAME_DURATION = 120;
  const BASKET_SPEED = 7;

  let canvas, ctx, scoreEl, livesEl, timerEl;
  let basketX, eggs, score, lives, running, gameOver;
  let timeRemaining, gameLoop, countdownInterval;
  let eggscaught, spawnInterval, currentSpeed;
  let keys = {};

  // bright fun colors for eggs
  const EGG_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#f06595','#20c997'];

  function init(canvasEl, scoreElement, livesElement, timerElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    scoreEl = scoreElement; livesEl = livesElement; timerEl = timerElement;
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    reset();
  }

  function reset() {
    clearInterval(gameLoop); clearInterval(countdownInterval); clearInterval(spawnInterval);
    basketX = W / 2 - BASKET_W / 2;
    eggs = []; score = 0; lives = 3; eggscaught = 0;
    currentSpeed = 2; timeRemaining = GAME_DURATION;
    running = false; gameOver = false;
    if (scoreEl) scoreEl.textContent = 0;
    if (livesEl) livesEl.textContent = '❤️❤️❤️';
    if (timerEl) { timerEl.textContent = '2:00'; timerEl.style.color = ''; }
    draw();
  }

  function spawnEgg() {
    const x = 20 + Math.random() * (W - 60);
    const color = EGG_COLORS[Math.floor(Math.random() * EGG_COLORS.length)];
    eggs.push({ x, y: -20, speed: currentSpeed, color, wobble: Math.random() * Math.PI * 2 });
  }

  function start() {
    if (gameOver) { reset(); return; }
    if (running) return;
    running = true;
    gameLoop = setInterval(tick, 1000 / 60);
    spawnInterval = setInterval(spawnEgg, 1000);
    spawnEgg();
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
        stop(); gameOver = true; draw(); drawEndScreen(`TIME'S UP! ⏰`, `You caught ${score} eggs!`);
      }
    }, 1000);
  }

  function stop() { clearInterval(gameLoop); clearInterval(countdownInterval); clearInterval(spawnInterval); running = false; }

  function tick() {
    // move basket
    if (keys['ArrowLeft'])  basketX = Math.max(0, basketX - BASKET_SPEED);
    if (keys['ArrowRight']) basketX = Math.min(W - BASKET_W, basketX + BASKET_SPEED);

    // move eggs
    for (const egg of eggs) {
      egg.y += egg.speed;
      egg.wobble += 0.05;
    }

    // catch check
    const basketTop = H - BASKET_H - 10;
    const caught = eggs.filter(e =>
      e.y + 18 >= basketTop && e.y - 18 <= basketTop + BASKET_H &&
      e.x >= basketX - 10 && e.x <= basketX + BASKET_W + 10
    );
    for (const e of caught) {
      score++;
      eggscaught++;
      if (scoreEl) scoreEl.textContent = score;
      // speed up every 10 eggs
      if (eggscaught % 10 === 0 && eggscaught > 0) {
        currentSpeed = Math.min(currentSpeed + 0.4, 6);
        for (const egg of eggs) egg.speed = currentSpeed;
        clearInterval(spawnInterval);
        spawnInterval = setInterval(spawnEgg, Math.max(400, 1000 - eggscaught * 8));
      }
    }
    eggs = eggs.filter(e => !caught.includes(e));

    // missed eggs
    const missed = eggs.filter(e => e.y > H + 20);
    if (missed.length > 0) {
      lives -= missed.length;
      lives = Math.max(0, lives);
      if (livesEl) livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
      eggs = eggs.filter(e => e.y <= H + 20);
      if (lives <= 0) { stop(); gameOver = true; draw(); drawEndScreen('GAME OVER 💥', `You caught ${score} eggs!`); return; }
    }

    draw();
  }

  function drawEgg(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    // egg shape
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // shine
    ctx.beginPath();
    ctx.ellipse(-3, -4, 4, 5, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.restore();
  }

  function drawBasket(x, y) {
    ctx.save();
    ctx.translate(x, y);
    // basket body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(BASKET_W - 5, 0);
    ctx.lineTo(BASKET_W, BASKET_H); ctx.lineTo(0, BASKET_H);
    ctx.closePath();
    ctx.fillStyle = '#c8a96e';
    ctx.fill();
    ctx.strokeStyle = '#a0824a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // weave lines horizontal
    ctx.strokeStyle = 'rgba(160,130,74,0.5)';
    ctx.lineWidth = 1;
    for (let i = 8; i < BASKET_H; i += 10) {
      ctx.beginPath(); ctx.moveTo(2, i); ctx.lineTo(BASKET_W - 2, i); ctx.stroke();
    }
    // rim
    ctx.beginPath();
    ctx.rect(-3, -5, BASKET_W + 6, 10);
    ctx.fillStyle = '#a0824a';
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    // bright sky bg
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#e0f4ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // clouds
    drawCloud(80, 50, 0.8);
    drawCloud(320, 30, 1.1);
    drawCloud(200, 80, 0.6);

    // ground
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(0, H - 10, W, 10);

    // eggs
    for (const egg of eggs) drawEgg(egg.x, egg.y, egg.color);

    // basket
    drawBasket(basketX, H - BASKET_H - 10);

    // start hint
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, H/2 - 30, W, 60);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press ← → to start!', W/2, H/2 + 5);
      ctx.textAlign = 'left';
    }
  }

  function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 5, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, 5, 14, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -8, 15, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawEndScreen(line1, line2) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px "Plus Jakarta Sans",sans-serif';
    ctx.fillText(line1, W/2, H/2 - 20);
    ctx.font = '16px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(line2, W/2, H/2 + 15);
    ctx.font = '12px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('Press ← → to play again', W/2, H/2 + 45);
    ctx.textAlign = 'left';
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (!running && !gameOver) start();
    if (gameOver) reset();
    if (['ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function destroy() {
    stop();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  return { init, destroy, reset };
})();

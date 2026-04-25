const TableTennisGame = (() => {
  const W = 480, H = 420;
  const WIN_SCORE = 11;

  // 3D perspective table coords
  const TABLE = {
    // table corners in screen space (perspective trapezoid)
    nearLeft:  { x: 40,  y: H - 80 },
    nearRight: { x: W - 40, y: H - 80 },
    farLeft:   { x: 120, y: 160 },
    farRight:  { x: W - 120, y: 160 },
    netY:      (H - 80 + 160) / 2,   // net vertical center
    midX:      W / 2,
  };

  // map normalized table coords (tx: 0-1, ty: 0-1) to screen
  function tableToScreen(tx, ty) {
    const nearY = TABLE.nearLeft.y;
    const farY  = TABLE.farLeft.y;
    const y = farY + ty * (nearY - farY);
    // interpolate left/right edges
    const leftX  = TABLE.farLeft.x  + ty * (TABLE.nearLeft.x  - TABLE.farLeft.x);
    const rightX = TABLE.farRight.x + ty * (TABLE.nearRight.x - TABLE.farRight.x);
    const x = leftX + tx * (rightX - leftX);
    return { x, y };
  }

  // ball lives in table space (bx: 0-1, by: 0-1, bz: height above table)
  let bx, by, bvx, bvy, bvz, bz; // bz = height, vz = vertical velocity
  let playerX; // 0-1 across table near edge
  let cpuX;    // 0-1 across table far edge
  const PADDLE_W = 0.18;
  const PADDLE_SPEED = 0.022;
  const CPU_SPEED_EASY = 0.012;
  const CPU_SPEED_HARD = 0.022;

  let playerScore, cpuScore, running, gameOver, serving, servePlayer;
  let gameLoop, keys, particles;
  let canvas, ctx, playerScoreEl, cpuScoreEl;

  function init(canvasEl, playerScoreElement, cpuScoreElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    playerScoreEl = playerScoreElement; cpuScoreEl = cpuScoreElement;
    keys = {};
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    reset();
  }

  function reset() {
    clearInterval(gameLoop);
    playerScore = 0; cpuScore = 0; running = false; gameOver = false;
    particles = [];
    playerX = 0.5; cpuX = 0.5;
    if (playerScoreEl) playerScoreEl.textContent = 0;
    if (cpuScoreEl) cpuScoreEl.textContent = 0;
    servePlayer = 'player';
    resetBall(servePlayer);
    draw();
  }

  function resetBall(server) {
    serving = true;
    if (server === 'player') {
      bx = playerX; by = 0.85; // near side
    } else {
      bx = cpuX; by = 0.15; // far side
    }
    bvx = 0; bvy = 0; bvz = 0; bz = 0.05;
  }

  function start() {
    if (gameOver) { reset(); return; }
    if (running) return;
    running = true;
    // serve
    if (servePlayer === 'player') {
      bvx = (Math.random() - 0.5) * 0.012;
      bvy = -0.018; bvz = 0.04; serving = false;
    } else {
      bvx = (Math.random() - 0.5) * 0.012;
      bvy = 0.018; bvz = 0.04; serving = false;
    }
    gameLoop = setInterval(tick, 1000/60);
  }

  function tick() {
    const cpuSpeed = (playerScore >= 9 || cpuScore >= 9) ? CPU_SPEED_HARD : CPU_SPEED_EASY;

    // player movement
    if (keys['ArrowLeft'])  playerX = Math.max(PADDLE_W/2, playerX - PADDLE_SPEED);
    if (keys['ArrowRight']) playerX = Math.min(1 - PADDLE_W/2, playerX + PADDLE_SPEED);

    // CPU AI
    const cpuTarget = bvz > 0 && by < 0.5 ? bx : 0.5 + (Math.random()-0.5)*0.1;
    if (cpuX < cpuTarget - 0.01) cpuX = Math.min(1 - PADDLE_W/2, cpuX + cpuSpeed);
    else if (cpuX > cpuTarget + 0.01) cpuX = Math.max(PADDLE_W/2, cpuX - cpuSpeed);

    // ball physics
    bx += bvx; by += bvy; bz += bvz;
    bvz -= 0.004; // gravity on ball height

    // bounce on table (bz hits 0)
    if (bz <= 0) {
      bz = 0;
      bvz = Math.abs(bvz) * 0.75;
      if (bvz < 0.005) bvz = 0;

      // net check
      const netY = 0.5;
      if (Math.abs(by - netY) < 0.04) {
        // hit net
        bvy *= -0.5; bvz = 0.025;
        spawnParticles(bx, by, '#fff', 5);
      }
    }

    // wall bounces (left/right)
    if (bx < 0) { bx = 0; bvx *= -0.8; }
    if (bx > 1) { bx = 1; bvx *= -0.8; }

    // player paddle hit (near side, by > 0.82)
    if (by > 0.82 && bvy > 0 && bz < 0.12) {
      const dist = Math.abs(bx - playerX);
      if (dist < PADDLE_W / 2) {
        bvy = -(0.015 + Math.random()*0.008);
        bvx = (bx - playerX) * 0.08 + (Math.random()-0.5)*0.006;
        bvz = 0.035 + Math.random()*0.015;
        by = 0.82;
        spawnParticles(bx, by, '#ff6b6b', 8);
      }
    }

    // cpu paddle hit (far side, by < 0.18)
    if (by < 0.18 && bvy < 0 && bz < 0.12) {
      const dist = Math.abs(bx - cpuX);
      if (dist < PADDLE_W / 2) {
        bvy = (0.015 + Math.random()*0.008);
        bvx = (bx - cpuX) * 0.08 + (Math.random()-0.5)*0.006;
        bvz = 0.035 + Math.random()*0.015;
        by = 0.18;
        spawnParticles(bx, by, '#4d96ff', 8);
      }
    }

    // scoring
    if (by > 1.05) {
      // ball went past player
      cpuScore++;
      if (cpuScoreEl) cpuScoreEl.textContent = cpuScore;
      if (cpuScore >= WIN_SCORE) { stop(); gameOver = true; draw(); drawEndScreen('CPU WINS 🤖', `${playerScore} — ${cpuScore}`); return; }
      servePlayer = 'cpu';
      resetBall('cpu');
      setTimeout(() => { if (!gameOver) { servePlayer === 'cpu' && serveCPU(); } }, 800);
    }
    if (by < -0.05) {
      // ball went past cpu
      playerScore++;
      if (playerScoreEl) playerScoreEl.textContent = playerScore;
      if (playerScore >= WIN_SCORE) { stop(); gameOver = true; draw(); drawEndScreen('YOU WIN! 🎉', `${playerScore} — ${cpuScore}`); return; }
      servePlayer = 'player';
      resetBall('player');
    }

    // particles
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life--; }

    draw();
  }

  function serveCPU() {
    bvx = (Math.random()-0.5)*0.012;
    bvy = 0.018; bvz = 0.04; serving = false;
  }

  function spawnParticles(tx, ty, color, count) {
    const pos = tableToScreen(tx, ty);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      particles.push({ x: pos.x, y: pos.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-1, life: 30, color });
    }
  }

  function draw() {
    // dark bg
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    // floor (wood)
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(0, TABLE.nearLeft.y, W, H - TABLE.nearLeft.y);
    // floor lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, TABLE.nearLeft.y); ctx.lineTo(x, H); ctx.stroke();
    }

    // table surface
    ctx.beginPath();
    ctx.moveTo(TABLE.farLeft.x, TABLE.farLeft.y);
    ctx.lineTo(TABLE.farRight.x, TABLE.farRight.y);
    ctx.lineTo(TABLE.nearRight.x, TABLE.nearRight.y);
    ctx.lineTo(TABLE.nearLeft.x, TABLE.nearLeft.y);
    ctx.closePath();
    ctx.fillStyle = '#1a6b3a';
    ctx.fill();

    // table grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    // center line (lengthwise)
    const topMid = tableToScreen(0.5, 0);
    const botMid = tableToScreen(0.5, 1);
    ctx.beginPath(); ctx.moveTo(topMid.x, topMid.y); ctx.lineTo(botMid.x, botMid.y); ctx.stroke();

    // table border
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(TABLE.farLeft.x, TABLE.farLeft.y);
    ctx.lineTo(TABLE.farRight.x, TABLE.farRight.y);
    ctx.lineTo(TABLE.nearRight.x, TABLE.nearRight.y);
    ctx.lineTo(TABLE.nearLeft.x, TABLE.nearLeft.y);
    ctx.closePath(); ctx.stroke();

    // net
    const netLeft  = tableToScreen(0, 0.5);
    const netRight = tableToScreen(1, 0.5);
    const netH = 18;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(netLeft.x, netLeft.y - netH, netRight.x - netLeft.x, 3);
    // net mesh
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.5;
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const nx = netLeft.x + (netRight.x - netLeft.x) * (i/segments);
      ctx.beginPath(); ctx.moveTo(nx, netLeft.y - netH); ctx.lineTo(nx, netLeft.y); ctx.stroke();
    }
    for (let row = 1; row < 4; row++) {
      const y = netLeft.y - netH + (netH / 4) * row;
      ctx.beginPath(); ctx.moveTo(netLeft.x, y); ctx.lineTo(netRight.x, y); ctx.stroke();
    }
    // net post
    ctx.fillStyle = '#aaa';
    ctx.fillRect(netLeft.x - 3, netLeft.y - netH - 5, 5, netH + 8);
    ctx.fillRect(netRight.x - 2, netRight.y - netH - 5, 5, netH + 8);

    // particles
    for (const p of particles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ball shadow on table
    const ballScreen = tableToScreen(bx, by);
    const shadowScale = 0.4 + by * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(ballScreen.x, ballScreen.y, 8*shadowScale, 3*shadowScale, 0, 0, Math.PI*2); ctx.fill();

    // ball (raised by bz)
    const ballR = 7 + by * 4; // bigger when closer
    const ballY = ballScreen.y - bz * 80;
    const ballGrad = ctx.createRadialGradient(ballScreen.x - 2, ballY - 2, 1, ballScreen.x, ballY, ballR);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(1, '#dddddd');
    ctx.fillStyle = ballGrad;
    ctx.beginPath(); ctx.arc(ballScreen.x, ballY, ballR, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ballScreen.x, ballY, ballR, 0, Math.PI*2); ctx.stroke();

    // paddles
    drawPaddle(playerX, 0.92, '#ff6b6b', '#cc0000', 1); // player - red
    drawPaddle(cpuX, 0.08, '#4d96ff', '#0040cc', 0);    // cpu - blue

    // start hint
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H/2 - 30, W, 56);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 13px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press ← → or Space to start', W/2, H/2 + 5);
      ctx.textAlign = 'left';
    }
  }

  function drawPaddle(tx, ty, color1, color2, isPlayer) {
    const pos = tableToScreen(tx, ty);
    const scale = 0.4 + ty * 0.6;
    const pw = 28 * scale, ph = 32 * scale;

    // handle
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(pos.x - 3*scale, pos.y, 6*scale, 18*scale);

    // paddle face
    const grad = ctx.createRadialGradient(pos.x - pw*0.2, pos.y - ph*0.2, 2, pos.x, pos.y, pw);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, pw, ph * 0.7, isPlayer ? -0.2 : 0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, pw, ph * 0.7, isPlayer ? -0.2 : 0.2, 0, Math.PI*2);
    ctx.stroke();
  }

  function drawEndScreen(msg, scores) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px "Plus Jakarta Sans",sans-serif';
    ctx.fillText(msg, W/2, H/2 - 20);
    ctx.font = '18px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(scores, W/2, H/2 + 15);
    ctx.font = '12px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Press any key to play again', W/2, H/2 + 48);
    ctx.textAlign = 'left';
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (!running && !gameOver) start();
    if (gameOver) reset();
    if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function stop() { clearInterval(gameLoop); running = false; }
  function destroy() {
    stop();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  return { init, destroy, reset };
})();

const EggHopGame = (() => {
  const W = 360, H = 480;
  const GRAVITY = 0.4, JUMP_FORCE = -11;
  const PLATFORM_W = 70, PLATFORM_H = 12;
  const PLAYER_W = 28, PLAYER_H = 32;
  const MOVE_SPEED = 4;
  const MAX_FALLS = 3;

  let canvas, ctx, scoreEl, livesEl;
  let player, platforms, score, falls, running, gameOver;
  let cameraY, keys, rafId, particles;

  function init(canvasEl, scoreElement, livesElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    scoreEl = scoreElement; livesEl = livesElement;
    keys = {};
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    reset();
    rafId = requestAnimationFrame(loop);
  }

  function reset() {
    score = 0; falls = 0; running = false; gameOver = false;
    cameraY = 0; particles = [];
    if (scoreEl) scoreEl.textContent = 0;
    if (livesEl) livesEl.textContent = '❤️❤️❤️';

    // player starts at bottom center
    player = { x: W/2 - PLAYER_W/2, y: H - 120, vx: 0, vy: 0, onGround: false, frame: 0 };

    // generate initial platforms
    platforms = [];
    // starting platform right below player
    platforms.push({ x: W/2 - PLATFORM_W/2, y: H - 80, w: PLATFORM_W, moving: false, dir: 1, speed: 0 });
    for (let i = 0; i < 14; i++) generatePlatform(H - 80 - (i+1) * 70);
  }

  function generatePlatform(y) {
    const moving = Math.random() > 0.55;
    platforms.push({
      x: 20 + Math.random() * (W - PLATFORM_W - 40),
      y,
      w: PLATFORM_W,
      moving,
      dir: Math.random() > 0.5 ? 1 : -1,
      speed: moving ? 1.2 + Math.random() * 1.2 : 0,
    });
  }

  function start() {
    running = true;
    player.vy = JUMP_FORCE;
  }

  function loop() {
    if (running && !gameOver) tick();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function tick() {
    // move platforms
    for (const p of platforms) {
      if (p.moving) {
        p.x += p.speed * p.dir;
        if (p.x <= 0 || p.x + p.w >= W) p.dir *= -1;
      }
    }

    // player input
    if (keys['ArrowLeft'])  player.x -= MOVE_SPEED;
    if (keys['ArrowRight']) player.x += MOVE_SPEED;

    // wrap player horizontally
    if (player.x + PLAYER_W < 0) player.x = W;
    if (player.x > W) player.x = -PLAYER_W;

    // gravity
    player.vy += GRAVITY;
    player.y += player.vy;
    player.x += player.vx;

    // platform collision (only when falling)
    if (player.vy > 0) {
      for (const p of platforms) {
        const py = p.y - cameraY;
        if (player.x + PLAYER_W > p.x &&
            player.x < p.x + p.w &&
            player.y + PLAYER_H >= py &&
            player.y + PLAYER_H <= py + PLATFORM_H + player.vy + 2) {
          player.vy = JUMP_FORCE;
          player.y = py - PLAYER_H;
          // particle pop
          for (let i = 0; i < 5; i++) {
            particles.push({ x: player.x + PLAYER_W/2, y: py, vx: (Math.random()-0.5)*3, vy: -Math.random()*2, life: 20, color: p.moving ? '#4d96ff' : '#6bcb77' });
          }
          break;
        }
      }
    }

    // scroll camera up when player reaches top half
    const screenY = player.y - cameraY;
    if (screenY < H * 0.4) {
      const diff = H * 0.4 - screenY;
      cameraY -= diff;
      score = Math.max(score, Math.floor(-cameraY / 50));
      if (scoreEl) scoreEl.textContent = score;
      // generate new platforms at top
      const topPlatform = Math.min(...platforms.map(p => p.y));
      if (topPlatform > cameraY - 80) generatePlatform(cameraY - 80);
    }

    // remove platforms below screen
    platforms = platforms.filter(p => p.y < cameraY + H + 100);

    // fell off bottom
    if (player.y - cameraY > H + 50) {
      falls++;
      if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, MAX_FALLS - falls)) + '🖤'.repeat(Math.min(falls, MAX_FALLS));
      if (falls >= MAX_FALLS) { gameOver = true; return; }
      // respawn at last platform
      const lowestVisiblePlatform = platforms.filter(p => p.y < cameraY + H).sort((a,b) => b.y - a.y)[0];
      if (lowestVisiblePlatform) {
        player.y = lowestVisiblePlatform.y - cameraY - PLAYER_H - 5;
        player.x = lowestVisiblePlatform.x;
        player.vy = JUMP_FORCE;
      }
    }

    // particles
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life--; }
  }

  function draw() {
    // sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#e0f7fa');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // clouds (parallax)
    drawCloud(80 + ((-cameraY * 0.02) % W), 60, 0.8);
    drawCloud(240 + ((-cameraY * 0.015) % W), 30, 1.1);
    drawCloud((-cameraY * 0.025) % W, 100, 0.6);

    // platforms
    for (const p of platforms) {
      const py = p.y - cameraY;
      if (py < -20 || py > H + 20) continue;

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(p.x + 3, py + 5, p.w, PLATFORM_H);

      // platform body
      const platGrad = ctx.createLinearGradient(p.x, py, p.x, py + PLATFORM_H);
      if (p.moving) {
        platGrad.addColorStop(0, '#64b5f6');
        platGrad.addColorStop(1, '#1976d2');
      } else {
        platGrad.addColorStop(0, '#81c784');
        platGrad.addColorStop(1, '#388e3c');
      }
      ctx.fillStyle = platGrad;
      ctx.beginPath();
      ctx.roundRect(p.x, py, p.w, PLATFORM_H, 6);
      ctx.fill();

      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.roundRect(p.x + 4, py + 2, p.w - 8, 4, 3);
      ctx.fill();
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = p.life / 20;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // player egg 🐣
    if (!gameOver) {
      const px = player.x;
      const py = player.y - cameraY;

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(px + PLAYER_W/2, py + PLAYER_H + 3, PLAYER_W*0.4, 4, 0, 0, Math.PI*2); ctx.fill();

      // egg body
      const eggGrad = ctx.createRadialGradient(px + PLAYER_W*0.35, py + PLAYER_H*0.3, 2, px + PLAYER_W/2, py + PLAYER_H/2, PLAYER_W*0.7);
      eggGrad.addColorStop(0, '#fffde7');
      eggGrad.addColorStop(1, '#f9a825');
      ctx.fillStyle = eggGrad;
      ctx.beginPath();
      ctx.ellipse(px + PLAYER_W/2, py + PLAYER_H/2 + 2, PLAYER_W/2, PLAYER_H/2 + 2, 0, 0, Math.PI*2);
      ctx.fill();

      // crack lines (hatching)
      ctx.strokeStyle = 'rgba(200,150,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + PLAYER_W/2, py + 6);
      ctx.lineTo(px + PLAYER_W/2 - 5, py + 14);
      ctx.lineTo(px + PLAYER_W/2 + 3, py + 18);
      ctx.stroke();

      // face
      ctx.fillStyle = '#333';
      // eyes
      ctx.beginPath(); ctx.arc(px + PLAYER_W/2 - 5, py + PLAYER_H/2, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + PLAYER_W/2 + 5, py + PLAYER_H/2, 2, 0, Math.PI*2); ctx.fill();
      // smile
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px + PLAYER_W/2, py + PLAYER_H/2 + 2, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // score display on canvas
    if (running && !gameOver) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(8, 8, 90, 26);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`⬆️ ${score}m`, 14, 26);
    }

    // start hint
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, H/2 - 30, W, 56);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press ← → to start hopping! 🐣', W/2, H/2 + 5);
    }

    // game over
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'white'; ctx.textAlign = 'center';
      ctx.font = 'bold 26px "Plus Jakarta Sans",sans-serif';
      ctx.fillText('GAME OVER 🥚', W/2, H/2 - 25);
      ctx.font = '16px "Plus Jakarta Sans",sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`Height: ${score}m`, W/2, H/2 + 10);
      ctx.font = '12px "Plus Jakarta Sans",sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('Press any key to play again', W/2, H/2 + 42);
    }
  }

  function drawCloud(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 5, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, 5, 14, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (!running && !gameOver) start();
    if (gameOver) reset();
    if (['ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function destroy() {
    cancelAnimationFrame(rafId); rafId = null;
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  return { init, destroy, reset };
})();

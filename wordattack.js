const WordAttackGame = (() => {
  const W = 480, H = 380;

  const WORD_BANK = {
    small:  ['cat','dog','run','fly','sky','box','cup','hat','map','sun','ice','fog','log','net','pan','row','top','web','zip','axe','bay','cob','dew','elm','fan','gem','hop','ivy','jam','key','lid','mix','nod','oak','peg','rag','sip','tan','urn','van','wax','yak','zap'],
    medium: ['apple','brave','cloud','dance','eagle','flame','grace','house','image','jelly','kneel','lemon','magic','night','ocean','piano','queen','river','stone','tiger','ultra','voice','water','xenon','yacht','zebra','bloom','crisp','draft','ember','frost','glide','haven','inbox','joker','karma','lunar','minor','noble','orbit','pixel','quest','radar','solar','trend','unity','valid','width','yield'],
    hard:   ['abstract','boundary','champion','distance','elephant','fragment','grateful','honestly','illusion','judgement','keyboard','learning','mountain','nitrogen','obstacle','paradise','question','research','shoulder','together','umbrella','velocity','whatever','xylophone','yourself','zealously','alchemy','birthday','calendar','daughter','eloquent','finished','gorgeous','hospital','inspired','jealousy','knockout','likewise','moderate','notebook','overhead','probably','quantity','required','skeleton','thousand','uncommon','volcanic','withdraw']
  };

  const LEVELS = [
    { words: 5, concurrent: 1, difficulty: 'small',  speed: 0.5 },
    { words: 5, concurrent: 1, difficulty: 'medium', speed: 0.6 },
    { words: 6, concurrent: 2, difficulty: 'medium', speed: 0.7 },
    { words: 6, concurrent: 1, difficulty: 'hard',   speed: 0.75 },
    { words: 7, concurrent: 2, difficulty: 'hard',   speed: 0.85 },
    { words: 7, concurrent: 3, difficulty: 'hard',   speed: 0.95 },
    { words: 8, concurrent: 3, difficulty: 'hard',   speed: 1.1  },
    { words: 8, concurrent: 4, difficulty: 'hard',   speed: 1.3  },
  ];

  let canvas, ctx, scoreEl, levelEl, livesEl, empEl;
  let activeWords, currentInput, score, lives, level, running, gameOver;
  let levelWordsSpawned, levelWordsCleared, spawnQueue;
  let gameLoop, shakeTimer, shakeX, shakeY;
  let empReady, empCooldown, empCooldownTimer, empParticles;

  function init(canvasEl, scoreElement, levelElement, livesElement, empElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    scoreEl = scoreElement; levelEl = levelElement;
    livesEl = livesElement; empEl = empElement;
    document.addEventListener('keydown', onKey);
    reset();
  }

  function reset() {
    clearInterval(gameLoop); clearInterval(empCooldownTimer);
    activeWords = []; currentInput = ''; score = 0; lives = 3; level = 0;
    running = false; gameOver = false;
    shakeTimer = 0; shakeX = 0; shakeY = 0;
    empReady = true; empCooldown = 0; empParticles = [];
    if (scoreEl) scoreEl.textContent = 0;
    if (levelEl) levelEl.textContent = 1;
    if (livesEl) livesEl.textContent = '❤️❤️❤️';
    if (empEl) { empEl.textContent = 'EMP READY'; empEl.style.color = '#00ff88'; }
    startLevel();
    draw();
  }

  function startLevel() {
    const cfg = LEVELS[Math.min(level, LEVELS.length - 1)];
    levelWordsSpawned = 0; levelWordsCleared = 0;
    spawnQueue = [];
    const bank = WORD_BANK[cfg.difficulty];
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    for (let i = 0; i < cfg.words; i++) spawnQueue.push(shuffled[i % shuffled.length]);
    if (levelEl) levelEl.textContent = level + 1;
    scheduleSpawn();
  }

  function scheduleSpawn() {
    const cfg = LEVELS[Math.min(level, LEVELS.length - 1)];
    if (levelWordsSpawned >= spawnQueue.length) return;
    if (activeWords.length >= cfg.concurrent) {
      setTimeout(scheduleSpawn, 500);
      return;
    }
    spawnWord(spawnQueue[levelWordsSpawned]);
    levelWordsSpawned++;
    if (levelWordsSpawned < spawnQueue.length) setTimeout(scheduleSpawn, 1800);
  }

  function spawnWord(text) {
    const cfg = LEVELS[Math.min(level, LEVELS.length - 1)];
    const x = 40 + Math.random() * (W - 120);
    activeWords.push({ text, x, y: -30, speed: cfg.speed, typed: 0 });
  }

  function start() {
    if (gameOver) { reset(); return; }
    if (running) return;
    running = true;
    gameLoop = setInterval(tick, 1000 / 60);
  }

  function stop() { clearInterval(gameLoop); running = false; }

  function tick() {
    // shake decay
    if (shakeTimer > 0) {
      shakeTimer--;
      shakeX = (Math.random() - 0.5) * 8;
      shakeY = (Math.random() - 0.5) * 8;
    } else { shakeX = 0; shakeY = 0; }

    // EMP particles
    empParticles = empParticles.filter(p => p.life > 0);
    for (const p of empParticles) {
      p.x += p.vx; p.y += p.vy; p.life -= 2; p.vy += 0.1;
    }

    // move words
    for (const w of activeWords) w.y += w.speed;

    // check missed
    const missed = activeWords.filter(w => w.y > H);
    for (const w of missed) {
      lives--;
      updateLives();
      if (lives <= 0) { stop(); gameOver = true; draw(); drawGameOver(); return; }
    }
    if (missed.length > 0) {
      activeWords = activeWords.filter(w => w.y <= H);
      levelWordsCleared += missed.length;
      shakeTimer = 20;
      checkLevelComplete();
      scheduleSpawn();
    }

    draw();
  }

  function updateLives() {
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
  }

  function checkLevelComplete() {
    const cfg = LEVELS[Math.min(level, LEVELS.length - 1)];
    if (levelWordsCleared >= cfg.words && activeWords.length === 0) {
      level++;
      setTimeout(() => { startLevel(); }, 800);
    }
  }

  function fireEMP() {
    if (!empReady || activeWords.length === 0) return;
    // spawn particles
    for (const w of activeWords) {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        empParticles.push({ x: w.x, y: w.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 2, life: 60, color: `hsl(${120 + Math.random()*60},100%,60%)` });
      }
    }
    score += activeWords.length * 5;
    levelWordsCleared += activeWords.length;
    activeWords = [];
    currentInput = '';
    if (scoreEl) scoreEl.textContent = score;
    empReady = false; empCooldown = 30;
    if (empEl) { empEl.textContent = `EMP 30s`; empEl.style.color = '#ff4444'; }
    clearInterval(empCooldownTimer);
    empCooldownTimer = setInterval(() => {
      empCooldown--;
      if (empEl) empEl.textContent = empCooldown > 0 ? `EMP ${empCooldown}s` : 'EMP READY';
      if (empCooldown <= 0) {
        empReady = true;
        if (empEl) empEl.style.color = '#00ff88';
        clearInterval(empCooldownTimer);
      }
    }, 1000);
    checkLevelComplete();
    scheduleSpawn();
  }

  function onKey(e) {
    if (gameOver) { reset(); return; }
    if (!running) start();

    if (e.key === ' ') { e.preventDefault(); fireEMP(); return; }
    if (e.key === 'Backspace') { currentInput = currentInput.slice(0, -1); draw(); return; }
    if (e.key.length !== 1) return;

    const char = e.key.toLowerCase();
    currentInput += char;

    // check match against any active word
    let matched = false;
    for (const w of activeWords) {
      if (w.text.startsWith(currentInput)) {
        w.typed = currentInput.length;
        matched = true;
        if (currentInput === w.text) {
          // word complete
          score += w.text.length * 10;
          if (scoreEl) scoreEl.textContent = score;
          // explosion particles
          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            empParticles.push({ x: w.x, y: w.y, vx: Math.cos(angle)*3, vy: Math.sin(angle)*3-1, life: 40, color: '#ffdd00' });
          }
          activeWords = activeWords.filter(a => a !== w);
          levelWordsCleared++;
          currentInput = '';
          // reset typed on others
          for (const other of activeWords) other.typed = 0;
          checkLevelComplete();
          scheduleSpawn();
        }
        break;
      }
    }

    if (!matched) {
      currentInput = currentInput.slice(0, -1);
      shakeTimer = 12;
    }
    draw();
  }

  function draw() {
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // bg
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-10, -10, W+20, H+20);

    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    // danger zone at bottom
    ctx.fillStyle = 'rgba(255,0,0,0.06)';
    ctx.fillRect(0, H - 40, W, 40);
    ctx.strokeStyle = 'rgba(255,0,0,0.2)';
    ctx.setLineDash([6,6]);
    ctx.beginPath(); ctx.moveTo(0, H-40); ctx.lineTo(W, H-40); ctx.stroke();
    ctx.setLineDash([]);

    // EMP particles
    for (const p of empParticles) {
      ctx.globalAlpha = p.life / 60;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // words
    for (const w of activeWords) {
      const isTarget = currentInput.length > 0 && w.text.startsWith(currentInput);
      // word bg
      ctx.font = `bold 16px "Plus Jakarta Sans",monospace`;
      const tw = ctx.measureText(w.text).width;
      ctx.fillStyle = isTarget ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(w.x - 6, w.y - 18, tw + 12, 24);

      // typed part (green)
      if (w.typed > 0) {
        ctx.fillStyle = '#00ff88';
        ctx.fillText(w.text.slice(0, w.typed), w.x, w.y);
      }
      // untyped part
      ctx.fillStyle = isTarget ? 'white' : 'rgba(255,255,255,0.75)';
      ctx.fillText(w.text.slice(w.typed), w.x + ctx.measureText(w.text.slice(0, w.typed)).width, w.y);
    }

    // current input display
    if (currentInput) {
      ctx.fillStyle = 'rgba(0,255,136,0.15)';
      ctx.fillRect(W/2 - 80, H - 32, 160, 24);
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 14px "Plus Jakarta Sans",monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentInput, W/2, H - 14);
      ctx.textAlign = 'left';
    }

    // start hint
    if (!running && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H/2 - 30, W, 60);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px "Plus Jakarta Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Start typing to begin!', W/2, H/2 + 5);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center';
    ctx.font = 'bold 26px "Plus Jakarta Sans",sans-serif';
    ctx.fillText('GAME OVER 💥', W/2, H/2 - 30);
    ctx.font = '15px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`Score: ${score}  ·  Level: ${level + 1}`, W/2, H/2 + 5);
    ctx.font = '12px "Plus Jakarta Sans",sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Press any key to play again', W/2, H/2 + 38);
    ctx.textAlign = 'left';
  }

  function destroy() { stop(); clearInterval(empCooldownTimer); document.removeEventListener('keydown', onKey); }

  return { init, destroy, reset };
})();

// Snake Game Module v2
const SnakeGame = (() => {
  const CELL = 20;
  let canvas, ctx, scoreEl, timerEl;
  let gameLoop, respawnTimeout, countdownInterval;
  let snake, dir, nextDir, food, score, running, gameOver;
  let speed, gameStartTime;

  const BASE_SPEED = 150;
  const MIN_SPEED = 55;
  const SPEED_STEP = 8;
  const GAME_DURATION = 120;

  const COLORS = {
    bg1: '#7ec850', bg2: '#6db542',
    snake: '#3d7a2b', snakeHead: '#2d5e1e', snakeOutline: '#2a5218',
    food: '#e84040', foodShine: '#ff7070', foodStem: '#3d7a2b',
  };

  function init(canvasEl, scoreElement, timerElement) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    scoreEl = scoreElement;
    timerEl = timerElement;
    reset();
    document.addEventListener('keydown', onKey);
  }

  function reset() {
    clearInterval(gameLoop);
    clearTimeout(respawnTimeout);
    clearInterval(countdownInterval);
    const cols = Math.floor(canvas.width / CELL);
    const rows = Math.floor(canvas.height / CELL);
    snake = [
      { x: Math.floor(cols/2),     y: Math.floor(rows/2) },
      { x: Math.floor(cols/2) - 1, y: Math.floor(rows/2) },
      { x: Math.floor(cols/2) - 2, y: Math.floor(rows/2) },
    ];
    dir = { x:1, y:0 }; nextDir = { x:1, y:0 };
    score = 0; speed = BASE_SPEED; running = false; gameOver = false; gameStartTime = null;
    if (scoreEl) scoreEl.textContent = 0;
    if (timerEl) { timerEl.textContent = '2:00'; timerEl.style.color = ''; timerEl.style.fontWeight = ''; }
    placeFood(); draw();
  }

  function placeFood() {
    const cols = Math.floor(canvas.width / CELL);
    const rows = Math.floor(canvas.height / CELL);
    let pos;
    do { pos = { x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows) }; }
    while (snake.some(s => s.x===pos.x && s.y===pos.y));
    food = pos;
  }

  function scheduleApple() {
    const elapsed = gameStartTime ? (Date.now() - gameStartTime) / 1000 : 0;
    const delay = Math.max(0, 2000 - elapsed * 15);
    respawnTimeout = setTimeout(() => { placeFood(); }, delay);
  }

  function startLoop() {
    clearInterval(gameLoop);
    gameLoop = setInterval(tick, speed);
  }

  function start() {
    if (gameOver) { reset(); return; }
    if (running) return;
    running = true;
    gameStartTime = Date.now();
    startLoop();
    let remaining = GAME_DURATION;
    countdownInterval = setInterval(() => {
      remaining--;
      const m = Math.floor(remaining/60), s = remaining%60;
      if (timerEl) {
        timerEl.textContent = `${m}:${s.toString().padStart(2,'0')}`;
        timerEl.style.color = remaining <= 15 ? '#ef4444' : '';
        timerEl.style.fontWeight = remaining <= 15 ? '700' : '';
      }
      if (remaining <= 0) { clearInterval(countdownInterval); stop(); gameOver=true; draw(); drawOverlay("TIME'S UP! ⏰", `Final Score: ${score}`, 'Press any arrow key to play again'); }
    }, 1000);
  }

  function stop() { clearInterval(gameLoop); clearTimeout(respawnTimeout); clearInterval(countdownInterval); running=false; }

  function tick() {
    dir = nextDir;
    const cols = Math.floor(canvas.width/CELL), rows = Math.floor(canvas.height/CELL);
    const head = { x: ((snake[0].x+dir.x)+cols)%cols, y: ((snake[0].y+dir.y)+rows)%rows };
    if (snake.slice(0,-1).some(s => s.x===head.x && s.y===head.y)) {
      stop(); gameOver=true; draw(); drawOverlay('GAME OVER 💀', `Score: ${score}`, 'Press any arrow key to restart'); return;
    }
    snake.unshift(head);
    if (food && head.x===food.x && head.y===food.y) {
      score++; if (scoreEl) scoreEl.textContent = score;
      speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
      startLoop(); food=null; scheduleApple();
    } else { snake.pop(); }
    draw();
  }

  function onKey(e) {
    const map = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}, w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0} };
    const nd = map[e.key]; if (!nd) return;
    if (nd.x===-dir.x && nd.y===-dir.y) return;
    nextDir = nd;
    if (!running && !gameOver) start();
    if (gameOver) reset();
    e.preventDefault();
  }

  function roundRect(x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  function draw() {
    const cols = Math.floor(canvas.width/CELL), rows = Math.floor(canvas.height/CELL);
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      ctx.fillStyle = (r+c)%2===0 ? COLORS.bg1 : COLORS.bg2;
      ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
    }
    if (food) drawApple(food.x*CELL+CELL/2, food.y*CELL+CELL/2);
    for (let i=snake.length-1;i>=0;i--) {
      const {x,y} = snake[i], px=x*CELL, py=y*CELL, pad=i===0?1:2, r=i===0?7:6;
      ctx.fillStyle = i===0 ? COLORS.snakeHead : COLORS.snake;
      ctx.strokeStyle = COLORS.snakeOutline; ctx.lineWidth=1.5;
      roundRect(px+pad, py+pad, CELL-pad*2, CELL-pad*2, r); ctx.fill(); ctx.stroke();
      if (i===0) {
        ctx.fillStyle='white';
        const ex=dir.x===1?px+CELL-7:dir.x===-1?px+4:px+5, ey=dir.y===1?py+CELL-7:dir.y===-1?py+4:py+5;
        const ex2=dir.x!==0?ex:px+CELL-7, ey2=dir.y!==0?ey:ey;
        ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(ex2,ey2,3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#111';
        ctx.beginPath();ctx.arc(ex,ey,1.5,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(ex2,ey2,1.5,0,Math.PI*2);ctx.fill();
      }
    }
    if (!running && !gameOver) {
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0, canvas.height/2-30, canvas.width, 60);
      ctx.fillStyle='white'; ctx.font='bold 14px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
      ctx.fillText('Press any arrow key to start', canvas.width/2, canvas.height/2+5);
    }
  }

  function drawApple(cx,cy) {
    const r=CELL/2-3;
    ctx.fillStyle=COLORS.food; ctx.beginPath(); ctx.arc(cx,cy+1,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=COLORS.foodShine; ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.2,r*0.3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=COLORS.foodStem; ctx.lineWidth=2; ctx.beginPath();
    ctx.moveTo(cx,cy-r); ctx.quadraticCurveTo(cx+4,cy-r-5,cx+2,cy-r-7); ctx.stroke();
  }

  function drawOverlay(l1,l2,l3) {
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign='center';
    ctx.fillStyle='white'; ctx.font='bold 26px "Plus Jakarta Sans",sans-serif'; ctx.fillText(l1,canvas.width/2,canvas.height/2-25);
    ctx.font='16px "Plus Jakarta Sans",sans-serif'; ctx.fillText(l2,canvas.width/2,canvas.height/2+10);
    ctx.font='12px "Plus Jakarta Sans",sans-serif'; ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fillText(l3,canvas.width/2,canvas.height/2+40);
  }

  function destroy() { stop(); document.removeEventListener('keydown', onKey); }

  return { init, destroy, reset };
})();

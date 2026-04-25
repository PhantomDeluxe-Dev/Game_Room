const HangmanGame = (() => {
  const WORDS = ['javascript','python','developer','keyboard','monitor','function','variable','interface','algorithm','database','framework','component','portfolio','animation','responsive','creative','browser','terminal','network','library','syntax','method','object','array','string','boolean','integer','module','import','export','promise','async','fetch','render','deploy','debug','commit','branch','merge','clone'];
  const MAX_WRONG = 6;
  let canvas, ctx, word, guessed, wrong, gameOver, running;
  let statusEl;

  function init(canvasEl, statusElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    statusEl = statusElement;
    document.addEventListener('keydown', onKey);
    reset();
  }

  function reset() {
    word = WORDS[Math.floor(Math.random()*WORDS.length)];
    guessed = new Set(); wrong = 0; gameOver = false; running = true;
    if (statusEl) statusEl.textContent = 'Type letters to guess!';
    draw();
  }

  function onKey(e) {
    if (gameOver) { reset(); return; }
    const key = e.key.toLowerCase();
    if (!/^[a-z]$/.test(key) || guessed.has(key)) return;
    guessed.add(key);
    if (!word.includes(key)) {
      wrong++;
      if (wrong >= MAX_WRONG) { gameOver = true; if(statusEl) statusEl.textContent = `GAME OVER! Word was "${word}" · Press any key`; }
    } else {
      const won = word.split('').every(l => guessed.has(l));
      if (won) { gameOver = true; if(statusEl) statusEl.textContent = 'YOU GOT IT! 🎉 · Press any key'; }
    }
    if (!gameOver && statusEl) statusEl.textContent = `Wrong: ${wrong}/${MAX_WRONG}`;
    draw();
  }

  function draw() {
    const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#fdfcfb'; ctx.fillRect(0,0,W,H);

    // gallows
    ctx.strokeStyle='#334155'; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(40,H-30); ctx.lineTo(160,H-30); // base
    ctx.moveTo(80,H-30); ctx.lineTo(80,40);     // pole
    ctx.moveTo(80,40); ctx.lineTo(160,40);       // top
    ctx.moveTo(160,40); ctx.lineTo(160,80);      // rope
    ctx.stroke();

    // hangman parts
    ctx.strokeStyle='#ef4444'; ctx.lineWidth=3;
    if(wrong>0) { ctx.beginPath(); ctx.arc(160,100,20,0,Math.PI*2); ctx.stroke(); } // head
    if(wrong>1) { ctx.beginPath(); ctx.moveTo(160,120); ctx.lineTo(160,180); ctx.stroke(); } // body
    if(wrong>2) { ctx.beginPath(); ctx.moveTo(160,135); ctx.lineTo(130,160); ctx.stroke(); } // left arm
    if(wrong>3) { ctx.beginPath(); ctx.moveTo(160,135); ctx.lineTo(190,160); ctx.stroke(); } // right arm
    if(wrong>4) { ctx.beginPath(); ctx.moveTo(160,180); ctx.lineTo(135,215); ctx.stroke(); } // left leg
    if(wrong>5) { ctx.beginPath(); ctx.moveTo(160,180); ctx.lineTo(185,215); ctx.stroke(); } // right leg

    // word blanks
    const letters = word.split('');
    const startX = (W - letters.length * 36) / 2;
    letters.forEach((l,i) => {
      const x = startX + i*36 + 18;
      ctx.fillStyle = gameOver && !guessed.has(l) ? '#ef4444' : '#1e293b';
      ctx.font = 'bold 24px "Plus Jakarta Sans",monospace';
      ctx.textAlign = 'center';
      ctx.fillText(guessed.has(l) ? l.toUpperCase() : '_', x, H-80);
    });

    // wrong letters
    const wrongLetters = [...guessed].filter(l => !word.includes(l));
    ctx.fillStyle='#ef4444'; ctx.font='14px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='left';
    ctx.fillText('Wrong: ' + wrongLetters.join(' ').toUpperCase(), 220, 120);

    // alphabet display
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach((l,i) => {
      const col=i%13, row=Math.floor(i/13);
      const x=220+col*28, y=145+row*30;
      ctx.fillStyle = guessed.has(l) ? (word.includes(l)?'#22c55e':'#ef4444') : '#64748b';
      ctx.font='13px monospace'; ctx.textAlign='center';
      ctx.fillText(l.toUpperCase(), x, y);
    });
  }

  function destroy() { document.removeEventListener('keydown', onKey); }
  return { init, destroy, reset };
})();

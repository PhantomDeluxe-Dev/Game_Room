const HigherOrLowerGame = (() => {
  const SUITS = ['♠','♥','♦','♣'];
  const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let deck, currentCard, nextCard, score, streak, gameOver;
  let canvas, ctx, statusEl, scoreEl;
  let animating, slideX, slideDir;

  function init(canvasEl, statusElement, scoreElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    statusEl = statusElement; scoreEl = scoreElement;
    canvas.addEventListener('click', onClick);
    reset();
  }

  function reset() {
    deck = shuffle([...Array(52)].map((_,i) => ({ value: VALUES[i%13], suit: SUITS[Math.floor(i/13)], rank: i%13 })));
    currentCard = deck.pop(); nextCard = deck.pop();
    score = 0; streak = 0; gameOver = false; animating = false; slideX = 0;
    if (statusEl) statusEl.textContent = 'Higher or Lower?';
    if (scoreEl) scoreEl.textContent = 0;
    draw();
  }

  function shuffle(arr) { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr; }

  function onClick(e) {
    if (gameOver) { reset(); return; }
    if (animating) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const W = canvas.width;
    if (x < W/2) guess('lower');
    else guess('higher');
  }

  function guess(dir) {
    const correct = dir==='higher' ? nextCard.rank >= currentCard.rank : nextCard.rank <= currentCard.rank;
    // animate slide
    animating = true;
    slideDir = -1;
    let frame = 0;
    const anim = setInterval(() => {
      slideX = frame * 8;
      draw(true);
      frame++;
      if (frame > 10) {
        clearInterval(anim);
        slideX = 0; animating = false;
        if (correct) {
          score += 10 + streak * 5;
          streak++;
          currentCard = nextCard;
          nextCard = deck.length > 0 ? deck.pop() : null;
          if (!nextCard) { gameOver = true; if(statusEl) statusEl.textContent = `Deck done! Final score: ${score} 🎉 Click to restart`; draw(); return; }
          if (scoreEl) scoreEl.textContent = score;
          if (statusEl) statusEl.textContent = `✅ Correct! Streak: ${streak} · Higher or Lower?`;
        } else {
          streak = 0;
          currentCard = nextCard;
          nextCard = deck.length > 0 ? deck.pop() : null;
          if (!nextCard) { gameOver = true; draw(); return; }
          if (statusEl) statusEl.textContent = `❌ Wrong! Streak lost · Higher or Lower?`;
        }
        draw();
      }
    }, 30);
  }

  function drawCard(card, x, y, faceDown=false) {
    const W=110, H=155, R=10;
    ctx.save();
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.roundRect(x+4,y+4,W,H,R); ctx.fill();
    // card bg
    ctx.fillStyle = faceDown ? '#3b82f6' : 'white';
    ctx.beginPath(); ctx.roundRect(x,y,W,H,R); ctx.fill();
    ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(x,y,W,H,R); ctx.stroke();
    if (!faceDown) {
      const red = card.suit==='♥'||card.suit==='♦';
      ctx.fillStyle = red ? '#ef4444' : '#1e293b';
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign='left';
      ctx.fillText(card.value, x+10, y+30);
      ctx.font = '26px sans-serif'; ctx.textAlign='center';
      ctx.fillText(card.suit, x+W/2, y+H/2+10);
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign='right';
      ctx.fillText(card.value, x+W-10, y+H-10);
    } else {
      // card back pattern
      ctx.fillStyle='rgba(255,255,255,0.1)';
      for(let i=0;i<5;i++) for(let j=0;j<7;j++) {
        ctx.beginPath(); ctx.arc(x+15+i*20,y+15+j*20,5,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw(sliding=false) {
    const W=canvas.width, H=canvas.height;
    // bg gradient
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#1e3a5f'); grad.addColorStop(1,'#0f2027');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

    // felt texture
    ctx.fillStyle='rgba(0,100,0,0.15)';
    ctx.fillRect(0,0,W,H);

    // buttons
    const btnY = H-70;
    // lower button
    ctx.fillStyle='rgba(239,68,68,0.85)';
    ctx.beginPath(); ctx.roundRect(20,btnY,W/2-30,50,10); ctx.fill();
    ctx.fillStyle='white'; ctx.font='bold 16px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
    ctx.fillText('⬇ LOWER',W/4,btnY+32);
    // higher button
    ctx.fillStyle='rgba(34,197,94,0.85)';
    ctx.beginPath(); ctx.roundRect(W/2+10,btnY,W/2-30,50,10); ctx.fill();
    ctx.fillStyle='white';
    ctx.fillText('HIGHER ⬆',W*3/4,btnY+32);

    // cards
    const cardY = H/2-80;
    const cx = sliding ? W/2-55-slideX*10 : W/2-130;
    drawCard(currentCard, cx, cardY);
    drawCard(nextCard, W/2+20, cardY, !gameOver);

    // streak badge
    if (streak > 1) {
      ctx.fillStyle='#fbbf24';
      ctx.beginPath(); ctx.roundRect(W/2-40,cardY-40,80,28,14); ctx.fill();
      ctx.fillStyle='#1e293b'; ctx.font='bold 13px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
      ctx.fillText(`🔥 x${streak} streak`,W/2,cardY-20);
    }

    if (gameOver) {
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='white'; ctx.font='bold 26px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
      ctx.fillText('GAME OVER 🃏',W/2,H/2-20);
      ctx.font='16px "Plus Jakarta Sans",sans-serif'; ctx.fillStyle='rgba(255,255,255,0.7)';
      ctx.fillText(`Final Score: ${score}`,W/2,H/2+15);
      ctx.font='12px "Plus Jakarta Sans",sans-serif'; ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.fillText('Click to play again',W/2,H/2+45);
    }
  }

  function destroy() { canvas.removeEventListener('click', onClick); }
  return { init, destroy, reset };
})();

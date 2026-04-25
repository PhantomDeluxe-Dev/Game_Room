const BattleshipGame = (() => {
  const GRID = 10, CELL = 36;
  const SHIPS = [5,4,3,3,2];
  let playerBoard, cpuBoard, playerShips, cpuShips;
  let phase, selectedShip, shipDir, shipsPlaced;
  let statusEl, canvas, ctx;
  let cpuHits, cpuLastHit, cpuDir, cpuStack;

  function init(canvasEl, statusElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    statusEl = statusElement;
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMouseMove);
    reset();
  }

  function reset() {
    playerBoard = Array.from({length:GRID},()=>Array(GRID).fill(0));
    cpuBoard    = Array.from({length:GRID},()=>Array(GRID).fill(0));
    playerShips = []; cpuShips = [];
    phase = 'place'; selectedShip = 0; shipDir = 'h'; shipsPlaced = 0;
    cpuHits = []; cpuLastHit = null; cpuDir = null; cpuStack = [];
    placeCPUShips();
    if (statusEl) statusEl.textContent = `Place your ship (size ${SHIPS[0]}) · R to rotate`;
    hoverCell = null;
    draw();
    document.addEventListener('keydown', onKey);
  }

  let hoverCell = null;

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const offX = 10, offY = 10;
    const col = Math.floor((x - offX) / CELL);
    const row = Math.floor((y - offY) / CELL);
    hoverCell = (col>=0&&col<GRID&&row>=0&&row<GRID) ? {row,col} : null;
    draw();
  }

  function onKey(e) {
    if (e.key === 'r' || e.key === 'R') { shipDir = shipDir==='h'?'v':'h'; draw(); }
  }

  function onClick(e) {
    if (!hoverCell) return;
    const {row,col} = hoverCell;
    if (phase === 'place') {
      const size = SHIPS[shipsPlaced];
      if (canPlace(playerBoard, row, col, size, shipDir)) {
        placeShip(playerBoard, playerShips, row, col, size, shipDir);
        shipsPlaced++;
        if (shipsPlaced >= SHIPS.length) {
          phase = 'attack';
          if (statusEl) statusEl.textContent = 'Click enemy grid (right) to attack! 💥';
        } else {
          if (statusEl) statusEl.textContent = `Place ship (size ${SHIPS[shipsPlaced]}) · R to rotate`;
        }
        draw();
      }
    } else if (phase === 'attack') {
      // right grid offset
      const offX2 = GRID*CELL + 30;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      const col2 = Math.floor((x - offX2 - 10) / CELL);
      const row2 = Math.floor((y - 10) / CELL);
      if (col2<0||col2>=GRID||row2<0||row2>=GRID) return;
      if (cpuBoard[row2][col2] === 3 || cpuBoard[row2][col2] === 4) return; // already hit
      const hit = cpuBoard[row2][col2] === 1;
      cpuBoard[row2][col2] = hit ? 3 : 4;
      if (checkWin(cpuBoard)) { draw(); if(statusEl) statusEl.textContent='YOU WIN! 🎉 Click to restart'; phase='over'; return; }
      if(statusEl) statusEl.textContent = hit ? 'HIT! 💥 CPU attacking...' : 'Miss! CPU attacking...';
      draw();
      setTimeout(cpuAttack, 600);
    } else if (phase === 'over') { reset(); }
  }

  function cpuAttack() {
    let row, col;
    if (cpuStack.length > 0) {
      ({row,col} = cpuStack.pop());
      if (playerBoard[row][col]===3||playerBoard[row][col]===4) { cpuAttack(); return; }
    } else {
      do { row=Math.floor(Math.random()*GRID); col=Math.floor(Math.random()*GRID); }
      while (playerBoard[row][col]===3||playerBoard[row][col]===4);
    }
    const hit = playerBoard[row][col]===1;
    playerBoard[row][col] = hit?3:4;
    if (hit) {
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{
        const nr=row+dr,nc=col+dc;
        if(nr>=0&&nr<GRID&&nc>=0&&nc<GRID&&playerBoard[nr][nc]!==3&&playerBoard[nr][nc]!==4)
          cpuStack.push({row:nr,col:nc});
      });
    }
    if (checkWin(playerBoard)) { draw(); if(statusEl) statusEl.textContent='CPU WINS 🤖 Click to restart'; phase='over'; return; }
    if(statusEl) statusEl.textContent = hit ? 'CPU HIT your ship! 💥 Your turn' : 'CPU missed! Your turn';
    draw();
  }

  function placeCPUShips() {
    SHIPS.forEach(size => {
      let placed=false;
      while(!placed) {
        const dir=Math.random()>0.5?'h':'v';
        const row=Math.floor(Math.random()*GRID);
        const col=Math.floor(Math.random()*GRID);
        if(canPlace(cpuBoard,row,col,size,dir)) { placeShip(cpuBoard,cpuShips,row,col,size,dir); placed=true; }
      }
    });
  }

  function canPlace(board,row,col,size,dir) {
    for(let i=0;i<size;i++) {
      const r=dir==='v'?row+i:row, c=dir==='h'?col+i:col;
      if(r>=GRID||c>=GRID||board[r][c]!==0) return false;
    }
    return true;
  }

  function placeShip(board,ships,row,col,size,dir) {
    const cells=[];
    for(let i=0;i<size;i++) {
      const r=dir==='v'?row+i:row, c=dir==='h'?col+i:col;
      board[r][c]=1; cells.push({r,c});
    }
    ships.push(cells);
  }

  function checkWin(board) {
    for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) if(board[r][c]===1) return false;
    return true;
  }

  function drawGrid(board, offX, offY, showShips) {
    for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++) {
      const x=offX+c*CELL, y=offY+r*CELL;
      const val=board[r][c];
      ctx.fillStyle = val===3?'#ef5350':val===4?'rgba(100,149,237,0.4)':showShips&&val===1?'#546e7a':'#1a237e';
      ctx.fillRect(x+1,y+1,CELL-2,CELL-2);
      ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;
      ctx.strokeRect(x,y,CELL,CELL);
      if(val===3) { // hit
        ctx.fillStyle='#ff5722';
        ctx.font='bold 18px sans-serif'; ctx.textAlign='center';
        ctx.fillText('✕',x+CELL/2,y+CELL/2+6);
      }
      if(val===4) { // miss
        ctx.fillStyle='rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(x+CELL/2,y+CELL/2,4,0,Math.PI*2); ctx.fill();
      }
    }
    // hover preview for placement
    if(phase==='place'&&showShips&&hoverCell) {
      const size=SHIPS[shipsPlaced];
      const valid=canPlace(playerBoard,hoverCell.row,hoverCell.col,size,shipDir);
      for(let i=0;i<size;i++) {
        const r=shipDir==='v'?hoverCell.row+i:hoverCell.row;
        const c=shipDir==='h'?hoverCell.col+i:hoverCell.col;
        if(r<GRID&&c<GRID) {
          ctx.fillStyle=valid?'rgba(0,255,0,0.3)':'rgba(255,0,0,0.3)';
          ctx.fillRect(offX+c*CELL+1,offY+r*CELL+1,CELL-2,CELL-2);
        }
      }
    }
  }

  function draw() {
    const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#0d0d2b'; ctx.fillRect(0,0,W,H);
    // labels
    ctx.fillStyle='white'; ctx.font='bold 13px "Plus Jakarta Sans",sans-serif'; ctx.textAlign='center';
    ctx.fillText('YOUR FLEET',GRID*CELL/2+10,H-8);
    ctx.fillText('ENEMY WATERS',GRID*CELL+30+GRID*CELL/2+10,H-8);
    drawGrid(playerBoard,10,10,true);
    drawGrid(cpuBoard,GRID*CELL+30+10,10,false);
  }

  function destroy() {
    canvas.removeEventListener('click',onClick);
    canvas.removeEventListener('mousemove',onMouseMove);
    document.removeEventListener('keydown',onKey);
  }

  return { init, destroy, reset };
})();

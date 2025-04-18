// game.js - popolna koda

// Osnovne spremenljivke
let canvas, ctx, WIDTH, HEIGHT;
let balls = [];
const r = 10;
let ballColor = "#ffffff";
let paddlex, paddlew = 80, paddleh = 10, paddlecolor = "#1DB954";
let rightDown = false, leftDown = false;
let bricks = [];
let NROWS, NCOLS, BRICKWIDTH, BRICKHEIGHT = 20, PADDING = 2;
const BONUS_CHANCE = 0.2;
let isPlaying = false;
let timerInterval = null;
let sekunde = 0, tocke = 0, currentLevel = 1;
let difficulty = "normal", playerName = "Neznani";
let leaderboard = [], LEADERBOARD_SIZE = 5;

// Power‑up items & stati
const powerUpItems = [];
const iconsMap = {
  shuffle:   '🔀', repeat:    '🎵', crossfade: '↔️', boost:     '🚀',
  equalizer: '🎚️', playlist:  '📜', slowmo:    '🐌', shield:    '🛡️',
  magnet:    '🧲', laser:     '⚡', trail:     '✨'
};
const powerUps = Object.keys(iconsMap);
let playlistActive = false, slowmoActive = false, shieldActive = false, magnetActive = false;
let laserActive = false, trailActive = false;
let beamEffect = { active:false, x:0, frames:0 };

// Helper: pojavno obvestilo power‑upa
function showPowerUpNotif(text, icon) {
  const notif = document.createElement('div');
  notif.className = 'powerup-notif';
  notif.innerHTML = icon + (text ? ` ${text}` : '');
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 1000);
}

// Spawn power‑up iconico
function spawnPowerUp(x, y, type) {
  powerUpItems.push({ x, y, type, icon: iconsMap[type], speed: 2 });
}

// Risanje in update power‑up itemov
function updatePowerUps() {
  for (let i = powerUpItems.length - 1; i >= 0; i--) {
    const pu = powerUpItems[i];
    if (magnetActive) {
      const center = paddlex + paddlew / 2;
      pu.x += (center - pu.x) * 0.05;
    }
    pu.y += pu.speed;
    ctx.font = "24px Arial";
    ctx.fillText(pu.icon, pu.x - 12, pu.y);
    // Check catch
    if (pu.y >= HEIGHT - paddleh && pu.x >= paddlex && pu.x <= paddlex + paddlew) {
      showPowerUpNotif('', pu.icon);
      activatePowerUp(pu.type);
      powerUpItems.splice(i, 1);
      continue;
    }
    if (pu.y > HEIGHT) powerUpItems.splice(i, 1);
  }
}

// Music toggle
const musicBtn = document.getElementById('musicBtn');
const bgMusic = document.getElementById('bgMusic');
musicBtn.addEventListener('click', () => {
  if (bgMusic.paused) { bgMusic.play(); musicBtn.textContent = '🔇'; }
  else { bgMusic.pause(); musicBtn.textContent = '🔊'; }
});

// Animate score/level pop
function animateScore() {
  const el = document.getElementById('tocke');
  el.classList.add('score-pop');
  el.addEventListener('animationend', () => el.classList.remove('score-pop'), { once: true });
}
function animateLevel() {
  const el = document.getElementById('level');
  el.classList.add('score-pop');
  el.addEventListener('animationend', () => el.classList.remove('score-pop'), { once: true });
}

// Power-up modal logic
const powerupBtn = document.getElementById('powerupBtn');
const powerupModal = document.getElementById('powerupModal');
const closePowerupBtn = document.getElementById('closePowerupBtn');
powerupBtn.addEventListener('click', () => powerupModal.style.display = 'flex');
closePowerupBtn.addEventListener('click', () => powerupModal.style.display = 'none');

// Load & setup
window.addEventListener('load', () => {
  const data = localStorage.getItem('spotifyLeaderboard');
  if (data) leaderboard = JSON.parse(data);

  document.getElementById('toInstructionsBtn').addEventListener('click', openInstructions);
  document.getElementById('startGameBtn').addEventListener('click', () => {
    document.getElementById('startModalB').style.display = 'none';
    startGame();
  });
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('endBtn').addEventListener('click', endGame);
  document.getElementById('restartBtn').addEventListener('click', () => {
    isPlaying = false;
    clearInterval(timerInterval);
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('endBtn').disabled = true;
    document.getElementById('endModal').style.display = 'none';
    document.getElementById('startModalA').style.display = 'flex';
  });
  document.getElementById('finishBtn').addEventListener('click', () => {
    window.open('', '_self'); window.close();
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  document.getElementById('startModalA').style.display = 'flex';
});

// Open instructions
function openInstructions() {
  const nm = document.getElementById('playerName').value.trim();
  playerName = nm || 'Neznani';
  difficulty = document.getElementById('difficultySelect').value;
  ballColor = document.getElementById('ballColorSelect').value;
  document.getElementById('startModalA').style.display = 'none';
  document.getElementById('startModalB').style.display = 'flex';
}

// Start game
function startGame() {
  if (isPlaying) return;
  isPlaying = true;
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('endBtn').disabled = false;
  sekunde = 0; tocke = 0; currentLevel = 1;
  powerUpItems.length = 0;
  slowmoActive = magnetActive = shieldActive = laserActive = trailActive = false;
  updateScoreboard(); initCanvas(); initLevel();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  requestAnimationFrame(gameLoop);
}

// Setup canvas
function initCanvas() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  WIDTH = canvas.width; HEIGHT = canvas.height;
}

// Main loop
function gameLoop() {
  if (!isPlaying) return;
  draw();
  requestAnimationFrame(gameLoop);
}

// Init level
function initLevel() {
  switch (difficulty) {
    case 'easy': NROWS = 4; NCOLS = 6; break;
    case 'hard': NROWS = 6; NCOLS = 10; break;
    default:     NROWS = 5; NCOLS = 8;
  }
  BRICKWIDTH = (WIDTH / NCOLS) - PADDING;
  bricks = Array.from({ length: NROWS }, () =>
    Array.from({ length: NCOLS }, () => Math.random() < BONUS_CHANCE ? 2 : 1)
  );
  switch (difficulty) {
    case 'easy': paddlew = 100; break;
    case 'hard': paddlew = 70;  break;
    default:     paddlew = 80;
  }
  paddlex = (WIDTH - paddlew) / 2;
  balls = [];
  const base = (difficulty === 'easy' ? 3 : difficulty === 'hard' ? 7 : 5) + (currentLevel - 1) * 0.5;
  const angle = Math.random() * Math.PI - Math.PI / 2;
  balls.push({
    x: paddlex + paddlew / 2,
    y: HEIGHT - paddleh - r - 2,
    dx: base * Math.cos(angle),
    dy: -Math.abs(base * Math.sin(angle)),
    r, color: ballColor, trail: []});
}

// Toggle pause
function togglePause() {
  const btn = document.getElementById('pauseBtn');
  if (isPlaying) {
    isPlaying = false;
    clearInterval(timerInterval);
    btn.textContent = 'Resume';
  } else {
    isPlaying = true;
    timerInterval = setInterval(updateTimer, 1000);
    requestAnimationFrame(gameLoop);
    btn.textContent = 'Pause';
  }
}

// End game
function endGame() {
  if (!isPlaying) return;
  isPlaying = false;
  clearInterval(timerInterval);
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('endBtn').disabled = true;
  addOrUpdateLeaderboard();
  showEndModal();
}

function updateTimer() {
  if (!isPlaying) return;
  sekunde++;
  updateScoreboard();
}


// Key handlers
function onKeyDown(e) {
  if (e.key === 'ArrowRight') rightDown = true;
  if (e.key === 'ArrowLeft')  leftDown  = true;
  if (e.key === ' ' && laserActive) shootLaser();
}
function onKeyUp(e) {
  if (e.key === 'ArrowRight') rightDown = false;
  if (e.key === 'ArrowLeft')  leftDown  = false;
}

// Shoot laser
function shootLaser() {
  beamEffect = { active: true, x: paddlex + paddlew/2, frames: 8 };
  const col = Math.floor(beamEffect.x / (BRICKWIDTH + PADDING));
  for (let row = 0; row < NROWS; row++) {
    if (bricks[row][col] !== 0) {
      tocke += (bricks[row][col] === 2 ? 3 : 1);
      bricks[row][col] = 0;
      updateScoreboard();
    }
  }
  laserActive = false;
}

// Draw everything
function draw() {
  clearCanvas();
  // Shield
  if (shieldActive) {
    ctx.fillStyle = '#00fff0';
    ctx.fillRect(paddlex, HEIGHT - paddleh - 12, paddlew, 6);
  }
  // Paddle
  if (rightDown && paddlex + paddlew < WIDTH) paddlex += 5;
  if (leftDown  && paddlex > 0)             paddlex -= 5;
  ctx.fillStyle = paddlecolor;
  rect(paddlex, HEIGHT - paddleh, paddlew, paddleh);

  // Bricks
  bricks.forEach((rowArr, i) => {
    rowArr.forEach((val, j) => {
      if (val !== 0) {
        ctx.fillStyle = (val === 2 ? '#f1c40f' : '#1DB954');
        rect(j * (BRICKWIDTH + PADDING) + PADDING,
             i * (BRICKHEIGHT + PADDING) + PADDING,
             BRICKWIDTH, BRICKHEIGHT);
      }
    });
  });

  updatePowerUps();

  // Balls + trails
  balls.forEach((b, idx) => {
    if (trailActive) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 15) b.trail.shift();
      b.trail.forEach((p, i) => {
        const a = (i + 1) / b.trail.length;
        ctx.fillStyle = `rgba(29,185,84,${a * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, b.r * a, 0, Math.PI*2);
        ctx.fill();
      });
    }
    // Move
    b.x += slowmoActive ? b.dx * 0.5 : b.dx;
    b.y += slowmoActive ? b.dy * 0.5 : b.dy;

    // Collisions
    if (b.x + b.dx > WIDTH - b.r || b.x + b.dx < b.r) b.dx = -b.dx;
    if (b.y + b.dy < b.r) b.dy = -b.dy;
    else if (b.y + b.dy > HEIGHT - b.r) {
      if (shieldActive) {
        b.dy = -b.dy; shieldActive = false;
      } else if (b.x > paddlex && b.x < paddlex + paddlew) {
        const diff = (b.x - (paddlex + paddlew/2)) / paddlew;
        b.dx = 8 * diff; b.dy = -Math.abs(b.dy);
      } else {
        balls.splice(idx, 1);
        if (!balls.length) { endGame(); return; }
      }
    }

    // Brick hit
    const row = Math.floor(b.y / (BRICKHEIGHT + PADDING));
    const col = Math.floor(b.x / (BRICKWIDTH + PADDING));
    if (row >= 0 && row < NROWS && col >= 0 && col < NCOLS && bricks[row][col] !== 0) {
      const val = bricks[row][col];
      bricks[row][col] = 0;
      b.dy = -b.dy;
      if (val === 2) {
        tocke += 3;
        const px = col * (BRICKWIDTH + PADDING) + PADDING + BRICKWIDTH/2;
        const py = row * (BRICKHEIGHT + PADDING) + PADDING;
        spawnPowerUp(px, py, powerUps[Math.floor(Math.random()*powerUps.length)]);
      } else {
        tocke += 1;
      }
      if (playlistActive && val === 1) tocke += 1;
      updateScoreboard(); checkLevelComplete();
    }

    drawBall(b.x, b.y, b.r, b.color);
  });

  // Laser beam
  if (beamEffect.active) {
    ctx.strokeStyle = '#FF0040';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(beamEffect.x, HEIGHT);
    ctx.lineTo(beamEffect.x, 0);
    ctx.stroke();
    beamEffect.frames--;
    if (beamEffect.frames <= 0) beamEffect.active = false;
  }
}

// Check level complete
function checkLevelComplete() {
  for (let i=0; i<NROWS; i++)
    for (let j=0; j<NCOLS; j++)
      if (bricks[i][j] !== 0) return;
  canvas.classList.add('shake');
  setTimeout(() => canvas.classList.remove('shake'), 300);
  currentLevel++; initLevel(); animateLevel();
}

// Activate power‑ups
function activatePowerUp(type) {
  switch(type) {
    case 'shuffle':
      balls.forEach(b => {
        const sp = Math.hypot(b.dx,b.dy);
        const ang = Math.random()*Math.PI - Math.PI/2;
        b.dx = sp*Math.cos(ang); b.dy = sp*Math.sin(ang);
        if (b.dy>0) b.dy=-b.dy;
      }); break;
    case 'repeat':
      if (balls.length<3) {
        const b0=balls[0];
        balls.push({x:b0.x,y:b0.y,dx:-b0.dx,dy:b0.dy,r:b0.r,color:b0.color,trail:[]});
      } break;
    case 'crossfade':
      paddlew*=1.5; setTimeout(()=>paddlew/=1.5,5000); break;
    case 'boost':
      balls.forEach(b=>{b.dx*=1.5; b.dy*=1.5;});
      setTimeout(()=>balls.forEach(b=>{b.dx/=1.5; b.dy/=1.5;}),7000); break;
    case 'equalizer':
      balls.forEach(b=>{b.dx*=0.5; b.dy*=0.5;});
      setTimeout(()=>balls.forEach(b=>{b.dx/=0.5; b.dy/=0.5;}),5000); break;
    case 'playlist':
      playlistActive=true;
      setTimeout(()=>playlistActive=false,10000); break;
    case 'slowmo':
      slowmoActive=true; setTimeout(()=>slowmoActive=false,8000); break;
    case 'shield':
      shieldActive=true; break;
    case 'magnet':
      magnetActive=true; setTimeout(()=>magnetActive=false,10000); break;
    case 'laser':
      laserActive=true; setTimeout(()=>laserActive=false,10000); break;
    case 'trail':
      trailActive=true; setTimeout(()=>trailActive=false,10000); break;
  }
}

function updateScoreboard() {
  // nivo in točke
  document.getElementById('level').textContent = currentLevel;
  document.getElementById('tocke').textContent = tocke;

  // čas v MM:SS
  const s = sekunde % 60;
  const m = Math.floor(sekunde / 60);
  const ss = s < 10 ? '0' + s : s;
  const mm = m < 10 ? '0' + m : m;
  document.getElementById('cas').textContent = mm + ':' + ss;

  // animacije
  animateScore();
  animateLevel();
}


// Clear canvas
function clearCanvas() { ctx.clearRect(0,0,WIDTH,HEIGHT); }

// Draw ball
function drawBall(x,y,rr,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(x,y,rr,0,Math.PI*2);
  ctx.closePath();
  ctx.fill();
}

// Draw rect
function rect(x,y,w,h) { ctx.fillRect(x,y,w,h); }

// Leaderboard
function addOrUpdateLeaderboard() {
  const idx=leaderboard.findIndex(e=>e.name===playerName);
  if(idx===-1) leaderboard.push({name:playerName,score:tocke});
  else if(tocke>leaderboard[idx].score) leaderboard[idx].score=tocke;
  leaderboard.sort((a,b)=>b.score-a.score);
  if(leaderboard.length>LEADERBOARD_SIZE)
    leaderboard=leaderboard.slice(0,LEADERBOARD_SIZE);
  localStorage.setItem('spotifyLeaderboard',JSON.stringify(leaderboard));
}

// Show end modal
function showEndModal() {
  document.getElementById('finalScoreMsg').textContent =
    `Bravo, ${playerName}! Dosegel si ${tocke} točk (nivo ${currentLevel})`;
  const lb=document.getElementById('leaderboardList');
  lb.innerHTML='';
  leaderboard.forEach((e,i)=>{
    const li=document.createElement('li');
    if(i===0)      li.innerHTML=`<span class="medal1">🥇</span> ${e.name} – ${e.score}`;
    else if(i===1) li.innerHTML=`<span class="medal2">🥈</span> ${e.name} – ${e.score}`;
    else if(i===2) li.innerHTML=`<span class="medal3">🥉</span> ${e.name} – ${e.score}`;
    else           li.textContent=`${i+1}. ${e.name} – ${e.score}`;
    lb.appendChild(li);
  });
  document.getElementById('endModal').style.display='flex';
}

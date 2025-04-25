// game.js

// ---- GLOBALNE SPREMENLJIVKE ----
let canvas, ctx, WIDTH, HEIGHT;
let balls = [];
const BALL_RADIUS = 10;
let ballColor = "#ffffff";

let paddlex, paddlew = 80, paddleh = 10, paddlecolor = "#1DB954";
let rightDown = false, leftDown = false;

let bricks = [];
let NROWS, NCOLS, BRICKWIDTH, BRICKHEIGHT = 20, PADDING = 2;
const BONUS_CHANCE = 0.2;

let isPlaying = false;
let timerInterval = null;
let sekunde = 0, tocke = 0, currentLevel = 1;

let difficulty = "normal";
let playerName = "Neznani";

let leaderboard = [];
const LEADERBOARD_SIZE = 5;

// Power-up
const powerUpItems = [];
const iconsMap = {
  shuffle: '🔀', repeat: '🎵', crossfade: '↔️', boost: '🚀',
  equalizer: '🎚️', playlist: '📜', slowmo: '🐌', shield: '🛡️',
  magnet: '🧲', laser: '⚡', trail: '✨'
};
const powerUps = Object.keys(iconsMap);

let slowmoActive = false,
    shieldActive = false,
    magnetActive = false,
    laserActive = false,
    trailActive = false,
    playlistActive = false;

let beamEffect = { active:false, x:0, frames:0 };


// ---- POMOŽNE FUNKCIJE ----

function showPowerUpNotif(icon) {
  const n = document.createElement('div');
  n.className = 'powerup-notif';
  n.textContent = icon;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1000);
}

function spawnPowerUp(x, y, type) {
  powerUpItems.push({ x, y, type, icon: iconsMap[type], speed: 2 });
}

function updatePowerUps() {
  for (let i = powerUpItems.length - 1; i >= 0; i--) {
    const pu = powerUpItems[i];
    if (magnetActive) {
      const center = paddlex + paddlew/2;
      pu.x += (center - pu.x)*0.05;
    }
    pu.y += pu.speed;
    ctx.font = "24px Arial";
    ctx.fillText(pu.icon, pu.x - 12, pu.y);
    if (pu.y >= HEIGHT - paddleh && pu.x >= paddlex && pu.x <= paddlex + paddlew) {
      showPowerUpNotif(pu.icon);
      activatePowerUp(pu.type);
      powerUpItems.splice(i, 1);
      continue;
    }
    if (pu.y > HEIGHT) powerUpItems.splice(i, 1);
  }
}

function loadLeaderboard() {
  const data = localStorage.getItem('spotifyLeaderboard');
  if (data) leaderboard = JSON.parse(data);
}

function saveLeaderboard() {
  localStorage.setItem('spotifyLeaderboard', JSON.stringify(leaderboard));
}

function addOrUpdateLeaderboard() {
  const idx = leaderboard.findIndex(e => e.name === playerName);
  if (idx === -1) {
    leaderboard.push({ name: playerName, score: tocke });
  } else if (tocke > leaderboard[idx].score) {
    leaderboard[idx].score = tocke;
  }
  leaderboard.sort((a,b) => b.score - a.score);
  if (leaderboard.length > LEADERBOARD_SIZE) {
    leaderboard.length = LEADERBOARD_SIZE;
  }
  saveLeaderboard();
}

function showEndModal() {
  document.getElementById('finalScoreMsg').textContent =
    `Bravo, ${playerName}! Dosegel si ${tocke} točk (nivo ${currentLevel})`;
  const lb = document.getElementById('leaderboardList');
  lb.innerHTML = '';
  leaderboard.forEach((e,i) => {
    const li = document.createElement('li');
    if (i===0)      li.innerHTML = `<span class="medal1">🥇</span> ${e.name} – ${e.score}`;
    else if (i===1) li.innerHTML = `<span class="medal2">🥈</span> ${e.name} – ${e.score}`;
    else if (i===2) li.innerHTML = `<span class="medal3">🥉</span> ${e.name} – ${e.score}`;
    else            li.textContent = `${i+1}. ${e.name} – ${e.score}`;
    lb.appendChild(li);
  });
  document.getElementById('endModal').style.display = 'flex';
}


// ---- INIT + GLAVNI KRMIŠČEK ----

window.addEventListener('load', () => {
  loadLeaderboard();

  // Glasba
  const musicBtn = document.getElementById('musicBtn');
  const bgMusic  = document.getElementById('bgMusic');
  musicBtn.addEventListener('click', () => {
    if (bgMusic.paused) { bgMusic.play(); musicBtn.textContent = '🔇'; }
    else               { bgMusic.pause(); musicBtn.textContent = '🔊'; }
  });

  // Dvojni modal
  document.getElementById('toInstructionsBtn').addEventListener('click', openInstructions);
  document.getElementById('startGameBtn').addEventListener('click', () => {
    document.getElementById('startModalB').style.display = 'none';
    startGame();
  });

  // Pause / End / Restart / Finish
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('endBtn').addEventListener('click', endGame);

  // Zdaj “Začni znova” z istimi nastavitvami:
  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('endModal').style.display = 'none';
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('endBtn').disabled   = true;
    isPlaying = false;
    clearInterval(timerInterval);
    // ponovno zaženi z istimi playerName, difficulty, ballColor
    startGame();
  });

  // “Končaj” zdaj samo zapre modal
  document.getElementById('finishBtn').addEventListener('click', () => {
    document.getElementById('endModal').style.display = 'none';
  });

  // Arrow keys
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);

  // Prvi modal
  document.getElementById('startModalA').style.display = 'flex';
});

function openInstructions() {
  const nm = document.getElementById('playerName').value.trim();
  playerName = nm || 'Neznani';
  difficulty = document.getElementById('difficultySelect').value;
  ballColor  = document.getElementById('ballColorSelect').value;
  document.getElementById('startModalA').style.display = 'none';
  document.getElementById('startModalB').style.display = 'flex';
}

function startGame() {
  if (isPlaying) return;
  isPlaying = true;
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('endBtn').disabled   = false;

  // reset
  sekunde = 0;
  tocke   = 0;
  currentLevel = 1;
  powerUpItems.length = 0;
  slowmoActive = shieldActive = magnetActive =
  laserActive = trailActive = playlistActive = false;

  updateScoreboard();
  initCanvas();
  initLevel();

  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  requestAnimationFrame(gameLoop);
}

function initCanvas() {
  canvas = document.getElementById('canvas');
  ctx    = canvas.getContext('2d');
  WIDTH  = canvas.width;
  HEIGHT = canvas.height;
  paddlex = (WIDTH - paddlew)/2;
}

function initLevel() {
  switch (difficulty) {
    case 'easy': NROWS=4; NCOLS=6; paddlew=100; break;
    case 'hard': NROWS=6; NCOLS=10; paddlew=70; break;
    default:     NROWS=5; NCOLS=8;  paddlew=80;
  }
  BRICKWIDTH = (WIDTH / NCOLS) - PADDING;
  bricks = Array.from({ length: NROWS }, () =>
    Array.from({ length: NCOLS }, () =>
      Math.random() < BONUS_CHANCE ? 2 : 1
    )
  );
  balls = [];
  const speed = (difficulty==='easy'?3:difficulty==='hard'?7:5) + (currentLevel-1)*0.5;
  const ang   = Math.random()*Math.PI - Math.PI/2;
  balls.push({
    x: paddlex + paddlew/2,
    y: HEIGHT - paddleh - BALL_RADIUS - 2,
    dx: speed * Math.cos(ang),
    dy: -Math.abs(speed * Math.sin(ang)),
    r: BALL_RADIUS,
    color: ballColor,
    trail: []
  });
}

function gameLoop() {
  if (!isPlaying) return;
  draw();
  requestAnimationFrame(gameLoop);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // lopar
  if (rightDown && paddlex + paddlew < WIDTH) paddlex += 5;
  if (leftDown  && paddlex > 0)               paddlex -= 5;
  ctx.fillStyle = paddlecolor;
  ctx.fillRect(paddlex, HEIGHT - paddleh, paddlew, paddleh);

  // opeke
  for (let i=0; i<NROWS; i++) {
    for (let j=0; j<NCOLS; j++) {
      const v = bricks[i][j];
      if (v !== 0) {
        ctx.fillStyle = (v===2 ? '#f1c40f' : '#1DB954');
        ctx.fillRect(
          j*(BRICKWIDTH+PADDING)+PADDING,
          i*(BRICKHEIGHT+PADDING)+PADDING,
          BRICKWIDTH, BRICKHEIGHT
        );
      }
    }
  }

  updatePowerUps();

  // žogice
  balls.forEach((b, idx) => {
    if (trailActive) {
      b.trail.push({ x:b.x, y:b.y });
      if (b.trail.length > 15) b.trail.shift();
      b.trail.forEach((p,i) => {
        const a = (i+1)/b.trail.length;
        ctx.fillStyle = `rgba(29,185,84,${a*0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, b.r * a, 0, Math.PI*2);
        ctx.fill();
      });
    }
    b.x += slowmoActive ? b.dx*0.5 : b.dx;
    b.y += slowmoActive ? b.dy*0.5 : b.dy;
    if (b.x + b.dx > WIDTH - b.r || b.x + b.dx < b.r) b.dx = -b.dx;
    if (b.y + b.dy < b.r) b.dy = -b.dy;
    else if (b.y + b.dy > HEIGHT - b.r) {
      if (shieldActive) { b.dy = -b.dy; shieldActive = false; }
      else if (b.x > paddlex && b.x < paddlex + paddlew) {
        const diff = (b.x-(paddlex+paddlew/2))/paddlew;
        b.dx = 8*diff; b.dy = -Math.abs(b.dy);
      } else {
        balls.splice(idx,1);
        if (!balls.length) { endGame(); return; }
      }
    }
    const row = Math.floor(b.y/(BRICKHEIGHT+PADDING)),
          col = Math.floor(b.x/(BRICKWIDTH +PADDING));
    if (row>=0 && row<NROWS && col>=0 && col<NCOLS && bricks[row][col]!==0) {
      const val = bricks[row][col];
      bricks[row][col] = 0;
      b.dy = -b.dy;
      if (val===2) {
        tocke += 3;
        const px = col*(BRICKWIDTH+PADDING)+PADDING+BRICKWIDTH/2;
        const py = row*(BRICKHEIGHT+PADDING)+PADDING;
        spawnPowerUp(px, py, powerUps[Math.floor(Math.random()*powerUps.length)]);
      } else tocke += 1;
      if (playlistActive && val===1) tocke += 1;
      updateScoreboard();
      checkLevelComplete();
    }
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  });

  if (beamEffect.active) {
    ctx.strokeStyle = '#FF0040';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.moveTo(beamEffect.x, HEIGHT);
    ctx.lineTo(beamEffect.x, 0);
    ctx.stroke();
    beamEffect.frames--;
    if (beamEffect.frames <= 0) beamEffect.active = false;
  }
}

function checkLevelComplete() {
  for (let i=0; i<NROWS; i++)
    for (let j=0; j<NCOLS; j++)
      if (bricks[i][j] !== 0) return;
  canvas.classList.add('shake');
  setTimeout(() => canvas.classList.remove('shake'), 300);
  currentLevel++;
  initLevel();
}

function activatePowerUp(type) {
  switch(type) {
    case 'shuffle': balls.forEach(b=>{
      const sp=Math.hypot(b.dx,b.dy),
            ang=Math.random()*Math.PI-Math.PI/2;
      b.dx=sp*Math.cos(ang);
      b.dy=-Math.abs(sp*Math.sin(ang));
    }); break;
    case 'repeat':
      if (balls.length<3) {
        const b0=balls[0];
        balls.push({ x:b0.x, y:b0.y, dx:-b0.dx, dy:b0.dy, r:b0.r, color:b0.color, trail:[] });
      } break;
    case 'crossfade': paddlew*=1.5; setTimeout(()=>paddlew/=1.5,5000); break;
    case 'boost':
      balls.forEach(b=>{b.dx*=1.5; b.dy*=1.5;});
      setTimeout(()=>balls.forEach(b=>{b.dx/=1.5; b.dy/=1.5;}),7000);
      break;
    case 'equalizer':
      balls.forEach(b=>{b.dx*=0.5; b.dy*=0.5;});
      setTimeout(()=>balls.forEach(b=>{b.dx/=0.5; b.dy/=0.5;}),5000);
      break;
    case 'playlist': playlistActive=true; setTimeout(()=>playlistActive=false,10000); break;
    case 'slowmo': slowmoActive=true; setTimeout(()=>slowmoActive=false,8000); break;
    case 'shield': shieldActive=true; break;
    case 'magnet': magnetActive=true; setTimeout(()=>magnetActive=false,10000); break;
    case 'laser':  laserActive=true; setTimeout(()=>laserActive=false,10000); break;
    case 'trail':  trailActive=true; setTimeout(()=>trailActive=false,10000); break;
  }
}

function updateScoreboard() {
  document.getElementById('level').textContent = currentLevel;
  document.getElementById('tocke').textContent = tocke;
  const s = sekunde%60, m = Math.floor(sekunde/60);
  document.getElementById('cas').textContent = (m<10?'0'+m:m)+':'+(s<10?'0'+s:s);
}

function togglePause() {
  if (!isPlaying) return;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    isPlaying = false;
    document.getElementById('pauseBtn').textContent = 'Resume';
  } else {
    isPlaying = true;
    timerInterval = setInterval(updateTimer,1000);
    document.getElementById('pauseBtn').textContent = 'Pause';
    requestAnimationFrame(gameLoop);
  }
}

function endGame() {
  if (!isPlaying) return;
  isPlaying = false;
  clearInterval(timerInterval);
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('endBtn').disabled   = true;
  addOrUpdateLeaderboard();
  showEndModal();
}

function updateTimer() {
  if (!isPlaying) return;
  sekunde++;
  updateScoreboard();
}

function onKeyDown(e) {
  if (e.key==='ArrowRight') rightDown=true;
  if (e.key==='ArrowLeft')  leftDown=true;
  if (e.key===' '&& laserActive) shootLaser();
}
function onKeyUp(e) {
  if (e.key==='ArrowRight') rightDown=false;
  if (e.key==='ArrowLeft')  leftDown=false;
}

function shootLaser() {
  beamEffect = { active:true, x:paddlex+paddlew/2, frames:8 };
  const col = Math.floor(beamEffect.x/(BRICKWIDTH+PADDING));
  for (let row=0; row<NROWS; row++) {
    if (bricks[row][col]!==0) {
      tocke += (bricks[row][col]===2?3:1);
      bricks[row][col]=0;
      updateScoreboard();
    }
  }
  laserActive=false;
}

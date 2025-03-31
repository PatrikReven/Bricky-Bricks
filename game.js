/************************************************************
  Spotify Breakout – Final Neon
  -----------------------------------------------------------
  - Modal A → (Ime, Težavnost, Barva) → Naprej
  - Modal B → (Navodila) → Začni igro
  - End Modal ob koncu:
    “Začni znova” → vrnemo se na Start Modal A
    “Končaj” → skrijemo End Modal, igra ostane končana
  - Leaderboard: en zapis na ime, bonus opeke, več nivojev, pavza …
************************************************************/

var canvas, ctx;
var WIDTH, HEIGHT;

// Žogica
var x, y;
var dx, dy;
var r = 10;
var ballColor = "#ffffff";

// Ploščica
var paddlex;
var paddlew = 80;
var paddleh = 10;

// Tipke
var rightDown = false;
var leftDown  = false;

// Opeke
var bricks;
var NROWS;
var NCOLS;
var BRICKWIDTH;
var BRICKHEIGHT = 20;
var PADDING = 2;
var BONUS_CHANCE = 0.2;

// Barve
var rowcolors   = ["#1DB954","#1DB954","#1DB954","#1DB954","#1DB954"];
var paddlecolor = "#1DB954";

// Stanje
var isPlaying    = false;
var sekunde      = 0;
var tocke        = 0;
var currentLevel = 1;
var drawInterval = null;
var timerInterval= null;

// Težavnost + ime
var difficulty   = "normal";
var playerName   = "Neznani";

// Leaderboard
var leaderboard  = [];
var LEADERBOARD_SIZE = 5;

// Dom naložen
window.addEventListener("load", function(){
  // Preveri, če imamo kaj v localStorage
  var data = localStorage.getItem("spotifyLeaderboard");
  if(data){
    leaderboard = JSON.parse(data);
  }

  // Gumbi
  var toInstructionsBtn = document.getElementById("toInstructionsBtn");
  var startGameBtn      = document.getElementById("startGameBtn");
  var pauseBtn          = document.getElementById("pauseBtn");
  var endBtn            = document.getElementById("endBtn");
  var restartBtn        = document.getElementById("restartBtn");
  var finishBtn         = document.getElementById("finishBtn");

  // Modal A -> Naprej => prikaže Modal B
  toInstructionsBtn.addEventListener("click", function(){
    var nameVal = document.getElementById("playerName").value.trim();
    playerName = nameVal || "Neznani";

    difficulty = document.getElementById("difficultySelect").value;
    ballColor  = document.getElementById("ballColorSelect").value;

    // Zapremo A, odpremo B
    document.getElementById("startModalA").style.display="none";
    document.getElementById("startModalB").style.display="flex";
  });

  // Modal B -> Začni igro
  startGameBtn.addEventListener("click", function(){
    // Zapri B
    document.getElementById("startModalB").style.display="none";
    // Začni
    startGame();
  });

  // Pause / End
  pauseBtn.addEventListener("click", togglePause);
  endBtn.addEventListener("click", endGame);

  // End Modal – “Začni znova”
  restartBtn.addEventListener("click", function(){
    document.getElementById("endModal").style.display="none";
    // Vrni se nazaj na startModalA (da vpišeš ime, spet izbereš težavnost …)
    document.getElementById("startModalA").style.display="flex";
  });

  // End Modal – “Končaj”
  finishBtn.addEventListener("click", function(){
    document.getElementById("endModal").style.display="none";
    // Ostaneš v končani igri
  });

  // Tipke
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Za začetek prikaži Modal A
  document.getElementById("startModalA").style.display="flex";
});

// Začni igro
function startGame(){
  if(isPlaying) return;

  isPlaying = true;
  document.getElementById("pauseBtn").disabled=false;
  document.getElementById("endBtn").disabled=false;

  initGame();
}

// init
function initGame(){
  canvas = document.getElementById("canvas");
  ctx    = canvas.getContext("2d");
  WIDTH  = canvas.width;
  HEIGHT = canvas.height;

  currentLevel = 1;
  tocke = 0;
  sekunde = 0;

  updateScoreboard();
  setDifficultyParams();
  initLevel();

  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);

  if(drawInterval) clearInterval(drawInterval);
  drawInterval = setInterval(draw, 10);
}

function initLevel(){
  switch(difficulty){
    case "easy":
      NROWS=4; NCOLS=6; 
      break;
    case "hard":
      NROWS=6; NCOLS=10;
      break;
    case "normal":
    default:
      NROWS=5; NCOLS=8;
      break;
  }

  BRICKWIDTH = (WIDTH / NCOLS) - PADDING;

  bricks = [];
  for(var i=0; i<NROWS; i++){
    bricks[i]=[];
    for(var j=0; j<NCOLS; j++){
      bricks[i][j] = (Math.random() < BONUS_CHANCE)?2:1;
    }
  }

  paddlex=(WIDTH - paddlew)/2;
  x=paddlex + paddlew/2;
  y=HEIGHT - paddleh - r - 2;
  dy=-Math.abs(dy);
}

function setDifficultyParams(){
  switch(difficulty){
    case "easy":
      dx=2; dy=3; paddlew=100;
      break;
    case "hard":
      dx=4; dy=6; paddlew=70;
      break;
    case "normal":
    default:
      dx=3; dy=5; paddlew=80;
      break;
  }
}

// Pavza
function togglePause(){
  if(!isPlaying) return;
  var pauseBtn=document.getElementById("pauseBtn");

  if(drawInterval){
    clearInterval(drawInterval);
    drawInterval=null;
    clearInterval(timerInterval);
    timerInterval=null;
    pauseBtn.textContent="Resume";
  } else {
    drawInterval=setInterval(draw, 10);
    timerInterval=setInterval(updateTimer, 1000);
    pauseBtn.textContent="Pause";
  }
}

// End
function endGame(){
  if(!isPlaying) return;
  isPlaying=false;

  if(drawInterval) clearInterval(drawInterval);
  drawInterval=null;
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=null;

  document.getElementById("pauseBtn").disabled=true;
  document.getElementById("pauseBtn").textContent="Pause";
  document.getElementById("endBtn").disabled=true;

  addOrUpdateLeaderboard();
  showEndModal();
}

// Timer
function updateTimer(){
  if(!isPlaying) return;
  sekunde++;
  updateScoreboard();
}

function onKeyDown(e){
  if(e.keyCode===39) rightDown=true;
  else if(e.keyCode===37) leftDown=true;
}
function onKeyUp(e){
  if(e.keyCode===39) rightDown=false;
  else if(e.keyCode===37) leftDown=false;
}

// Risanje
function draw(){
  clearCanvas();

  drawBall(x, y, r);

  // Ploščica
  if(rightDown && paddlex+paddlew<WIDTH) paddlex+=5;
  else if(leftDown && paddlex>0) paddlex-=5;
  ctx.fillStyle=paddlecolor;
  rect(paddlex, HEIGHT-paddleh, paddlew, paddleh);

  // Opeke
  for(var i=0; i<NROWS; i++){
    for(var j=0; j<NCOLS; j++){
      var val=bricks[i][j];
      if(val!==0){
        ctx.fillStyle=(val===2)?"#f1c40f":rowcolors[i%rowcolors.length];
        rect(
          j*(BRICKWIDTH+PADDING)+PADDING,
          i*(BRICKHEIGHT+PADDING)+PADDING,
          BRICKWIDTH,
          BRICKHEIGHT
        );
      }
    }
  }

  // Odboji
  if(x+dx>WIDTH-r || x+dx<r) dx=-dx;
  if(y+dy<r){
    dy=-dy;
  } else if(y+dy>HEIGHT-r){
    // Ploščica?
    if(x>paddlex && x<paddlex+paddlew){
      dx=8*((x-(paddlex+paddlew/2))/paddlew);
      dy=-Math.abs(dy);
    } else {
      endGame();
      return;
    }
  }

  checkBrickCollision();

  x+=dx; 
  y+=dy;
}

function checkBrickCollision(){
  var rowheight=BRICKHEIGHT+PADDING;
  var colwidth =BRICKWIDTH+PADDING;
  var row=Math.floor(y/rowheight);
  var col=Math.floor(x/colwidth);

  if(
    row>=0 && row<NROWS &&
    col>=0 && col<NCOLS &&
    bricks[row][col]!==0
  ){
    var val=bricks[row][col];
    tocke += (val===2)?3:1;
    bricks[row][col]=0;
    dy=-dy;
    updateScoreboard();
    checkLevelComplete();
  }
}

function checkLevelComplete(){
  for(var i=0; i<NROWS; i++){
    for(var j=0; j<NCOLS; j++){
      if(bricks[i][j]!==0) return;
    }
  }
  currentLevel++;
  dx*=1.2; 
  dy*=1.2;
  updateScoreboard();
  initLevel();
}

function updateScoreboard(){
  document.getElementById("level").textContent=currentLevel;
  document.getElementById("tocke").textContent=tocke;

  var s=sekunde%60;
  var m=Math.floor(sekunde/60);
  var ss=(s<10)?"0"+s:s;
  var mm=(m<10)?"0"+m:m;
  document.getElementById("cas").textContent = mm+":"+ss;
}

function clearCanvas(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);
}
function drawBall(cx,cy,rr){
  ctx.fillStyle=ballColor;
  ctx.beginPath();
  ctx.arc(cx,cy,rr,0,Math.PI*2,true);
  ctx.closePath();
  ctx.fill();
}
function rect(xx,yy,ww,hh){
  ctx.beginPath();
  ctx.rect(xx,yy,ww,hh);
  ctx.closePath();
  ctx.fill();
}

// Leaderboard (1 zapis na ime)
function addOrUpdateLeaderboard(){
  var idx=leaderboard.findIndex(e=> e.name===playerName);
  if(idx===-1){
    leaderboard.push({ name: playerName, score:tocke });
  } else {
    if(tocke>leaderboard[idx].score){
      leaderboard[idx].score=tocke;
    }
  }
  leaderboard.sort((a,b)=> b.score-a.score);
  if(leaderboard.length>LEADERBOARD_SIZE){
    leaderboard=leaderboard.slice(0,LEADERBOARD_SIZE);
  }
  localStorage.setItem("spotifyLeaderboard", JSON.stringify(leaderboard));
}

// Pokaži end modal
function showEndModal(){
  var msg="Bravo, "+playerName+"! Dosegel si "+tocke+" točk (nivo "+currentLevel+")";
  document.getElementById("finalScoreMsg").textContent=msg;

  renderLeaderboard();
  document.getElementById("endModal").style.display="flex";
}

function renderLeaderboard(){
  var lb=document.getElementById("leaderboardList");
  lb.innerHTML="";

  leaderboard.forEach(function(e,index){
    var li=document.createElement("li");
    if(index===0){
      li.innerHTML=`<span class="medal1">🥇</span> ${e.name} – ${e.score}`;
    } else if(index===1){
      li.innerHTML=`<span class="medal2">🥈</span> ${e.name} – ${e.score}`;
    } else if(index===2){
      li.innerHTML=`<span class="medal3">🥉</span> ${e.name} – ${e.score}`;
    } else {
      li.textContent=`${index+1}. ${e.name} – ${e.score}`;
    }
    lb.appendChild(li);
  });
}

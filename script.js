/*******************************************************
 *  GLOBALNE SPREMENLJIVKE & OSNOVA
 *******************************************************/
let currentUser = "";
let currentDifficulty = "easy";

// Zasloni
const welcomeScreen = document.getElementById("welcomeScreen");
const gameScreen = document.getElementById("gameScreen");

// Platno
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ŽOGICA (z opcijsko sliko)
let x = WIDTH / 2;
let y = HEIGHT - 30;
let dx = 3;  
let dy = -3;
let ballRadius = 10;

// Če želiš sliko za žogico
const ballImg = new Image();
ballImg.src = "slike/ball.png";
let useBallImage = true; // True, če želiš risati sliko

// PLOŠČICA (z opcijsko sliko)
const paddleHeight = 20;     // Lahko malo več
const paddleWidth = 80;
let paddleX = (WIDTH - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
const paddleImg = new Image();
paddleImg.src = "slike/paddle.png";
let usePaddleImage = true;

// OPEKE
let brickRowCount = 3;
let brickColumnCount = 5;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
let bricks = [];

// Uporabimo 2 sliki za opeke (navadno, bonus)
const brickImgGreen = new Image();
brickImgGreen.src = "slike/brickGreen.png";
const brickImgGold = new Image();
brickImgGold.src = "slike/brickGold.png";

// TOČKE in ČAS
let score = 0;
let sekunde = 0;
let timerInterval = null;

// LOKALNI REZULTATI (osebni)
let bestScore = 0;
let bestTime = 999999; // v sekundah

// NIVO
let level = 1;
let maxLevel = 5;
let isGameRunning = false;
let isPaused = false;

/*******************************************************
 *  INIT
 *******************************************************/
window.onload = () => {
  // Gumbi na začetnem zaslonu
  document.getElementById("startGameBtn").addEventListener("click", handleStartGame);
  document.getElementById("showInstructionsBtn").addEventListener("click", showInstructions);

  // Modal navodila
  const modal = document.getElementById("instructionsModal");
  const spanClose = document.getElementById("closeInstructions");
  spanClose.onclick = () => {
    modal.style.display = "none";
  };
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Gumbi v igri
  document.getElementById("pauseBtn").addEventListener("click", pauseGame);
  document.getElementById("resetBtn").addEventListener("click", resetGame);
  document.getElementById("leaderboardBtn").addEventListener("click", showLeaderboard);

  // Tipke
  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);

  // Miška
  document.addEventListener("mousemove", mouseMoveHandler, false);

  // Začetni zaslon
  switchScreen("welcome");
};

/*******************************************************
 *  FUNKCIJE ZA ZASLONE
 *******************************************************/
function switchScreen(screenName) {
  if (screenName === "welcome") {
    welcomeScreen.classList.add("active");
    gameScreen.classList.remove("active");
  } else if (screenName === "game") {
    welcomeScreen.classList.remove("active");
    gameScreen.classList.add("active");
  }
}

function showInstructions() {
  const modal = document.getElementById("instructionsModal");
  modal.style.display = "block";
}

/*******************************************************
 *  LOGIN / TEŽAVNOST, ZAČETEK IGRE
 *******************************************************/
function handleStartGame() {
  const userField = document.getElementById("username");
  const difficultyField = document.getElementById("difficulty");

  if (!userField.value.trim()) {
    Swal.fire({
      title: "Napaka",
      text: "Prosim, vnesi svoje uporabniško ime!",
      icon: "warning",
      confirmButtonText: "V redu"
    });
    return;
  }
  
  currentUser = userField.value.trim();
  currentDifficulty = difficultyField.value;

  setDifficulty(currentDifficulty);

  switchScreen("game");

  document.getElementById("displayUser").textContent = currentUser;
  document.getElementById("displayDifficulty").textContent = mapDifficultyLabel(currentDifficulty);

  loadBestResultsForUser(currentUser);

  resetGame(true);
  startGame();
}

function setDifficulty(diff) {
  if (diff === "easy") {
    dx = 2; dy = -2;
    brickRowCount = 3;
    brickColumnCount = 5;
  } else if (diff === "medium") {
    dx = 3; dy = -3;
    brickRowCount = 4;
    brickColumnCount = 6;
  } else if (diff === "hard") {
    dx = 4; dy = -4;
    brickRowCount = 5;
    brickColumnCount = 7;
  }
}
function mapDifficultyLabel(diff) {
  switch (diff) {
    case "easy": return "Lahko";
    case "medium": return "Srednje";
    case "hard": return "Težko";
    default: return diff;
  }
}

/*******************************************************
 *  CREATE BRICKS
 *******************************************************/
function createBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      // Bonus ~20%
      let randStatus = Math.random() < 0.2 ? 2 : 1;
      bricks[c][r] = { x: 0, y: 0, status: randStatus };
    }
  }
}

/*******************************************************
 *  RISANJE OPEK - SLIKE
 *******************************************************/
function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      let b = bricks[c][r];
      if (b.status > 0) {
        let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
        let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
        b.x = brickX;
        b.y = brickY;

        ctx.beginPath();
        // Bonus = 2 => zlata opeka, sicer zelena
        if (b.status === 2) {
          // slika zlate opeke
          ctx.drawImage(brickImgGold, brickX, brickY, brickWidth, brickHeight);
        } else {
          // slika zelene opeke
          ctx.drawImage(brickImgGreen, brickX, brickY, brickWidth, brickHeight);
        }
        ctx.closePath();
      }
    }
  }
}

/*******************************************************
 *  RISANJE ŽOGICE
 *******************************************************/
function drawBall() {
  ctx.beginPath();
  if (useBallImage) {
    // Risanje slike žogice
    ctx.drawImage(ballImg, x - ballRadius, y - ballRadius, ballRadius * 2, ballRadius * 2);
  } else {
    // Navadna risba kroga
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#1DB954";
    ctx.fill();
  }
  ctx.closePath();
}

/*******************************************************
 *  RISANJE PLOŠČICE
 *******************************************************/
function drawPaddle() {
  ctx.beginPath();
  if (usePaddleImage) {
    ctx.drawImage(paddleImg, paddleX, HEIGHT - paddleHeight, paddleWidth, paddleHeight);
  } else {
    ctx.rect(paddleX, HEIGHT - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = "#1DB954";
    ctx.fill();
  }
  ctx.closePath();
}

/*******************************************************
 *  TRKI (z opekami, robovi)
 *******************************************************/
function collisionDetection() {
  for (let c = 0; c < bricks.length; c++) {
    for (let r = 0; r < bricks[c].length; r++) {
      let b = bricks[c][r];
      if (b.status > 0) {
        if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
          dy = -dy;
          if (b.status === 2) {
            score += 3;
          } else {
            score += 1;
          }
          b.status = 0;
          document.getElementById("score").textContent = score;

          checkLevelComplete();
        }
      }
    }
  }
}

/*******************************************************
 *  PREHOD NA NASLEDNJI NIVO
 *******************************************************/
function checkLevelComplete() {
  let allBroken = true;
  for (let c = 0; c < bricks.length; c++) {
    for (let r = 0; r < bricks[c].length; r++) {
      if (bricks[c][r].status > 0) {
        allBroken = false;
        break;
      }
    }
    if (!allBroken) break;
  }

  if (allBroken) {
    if (level >= maxLevel) {
      stopGame(true); // zmaga
    } else {
      level++;
      document.getElementById("level").textContent = level;

      // Povečaj hitrost 
      if (dx > 0) dx++; else dx--;
      if (dy > 0) dy++; else dy--;

      brickRowCount++;
      createBricks();
      x = WIDTH / 2;
      y = HEIGHT - 30;
      paddleX = (WIDTH - paddleWidth) / 2;
    }
  }
}

/*******************************************************
 *  GLAVNA FUNKCIJA RISANJA
 *******************************************************/
function draw() {
  if (!isGameRunning || isPaused) return;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawBricks();
  drawBall();
  drawPaddle();
  collisionDetection();

  // Odboji robov
  if (x + dx > WIDTH - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }
  if (y + dy < ballRadius) {
    dy = -dy;
  } 
  else if (y + dy > HEIGHT - ballRadius) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      // dinamičen odboj
      let deltaX = x - (paddleX + paddleWidth / 2);
      dx = deltaX * 0.35;
      dy = -dy;
    } else {
      stopGame(false);
    }
  }

  x += dx;
  y += dy;

  // Premik ploščice
  if (rightPressed && paddleX < WIDTH - paddleWidth) {
    paddleX += 7;
  } else if (leftPressed && paddleX > 0) {
    paddleX -= 7;
  }

  requestAnimationFrame(draw);
}

/*******************************************************
 *  TIPKOVNICA & MIŠKA
 *******************************************************/
function keyDownHandler(e) {
  if (e.keyCode === 39) {
    rightPressed = true;
  } else if (e.keyCode === 37) {
    leftPressed = true;
  }
}
function keyUpHandler(e) {
  if (e.keyCode === 39) {
    rightPressed = false;
  } else if (e.keyCode === 37) {
    leftPressed = false;
  }
}
function mouseMoveHandler(e) {
  let relativeX = e.clientX - canvas.offsetLeft;
  if (relativeX > 0 && relativeX < WIDTH) {
    paddleX = relativeX - paddleWidth / 2;
  }
}

/*******************************************************
 *  GAME FLOW: START, PAUSE, STOP, RESET
 *******************************************************/
function startGame() {
  if (!isGameRunning) {
    isGameRunning = true;
    isPaused = false;
    startTimer();
    requestAnimationFrame(draw);
  } else if (isGameRunning && isPaused) {
    isPaused = false;
    startTimer();
    requestAnimationFrame(draw);
  }
}

function pauseGame() {
  if (isGameRunning && !isPaused) {
    isPaused = true;
    stopTimer();
    // Obvestilo
    Swal.fire({
      title: "Pavza",
      text: "Igra je ustavljena. Klikni 'V redu' za nadaljevanje.",
      icon: "info",
      confirmButtonText: "V redu"
    }).then(() => {
      // Nadaljuj
      if (isGameRunning && isPaused) {
        startGame();
      }
    });
  }
}

function stopGame(winner) {
  isGameRunning = false;
  stopTimer();

  saveResultForUser(currentUser);  
  saveToLeaderboard(currentUser, score, sekunde);

  if (winner) {
    // Zmaga
    Swal.fire({
      title: "Čestitke, zmagal si!",
      html: `<img src="slike/trophy.png" alt="Trophy" style="width:100px;"><p>Končal si vse nivoje!</p>`,
      icon: "success",
      confirmButtonText: "Pokaži leaderboard"
    }).then(() => {
      showLeaderboard();
    });
  } else {
    // Poraz
    Swal.fire({
      title: "Konec igre!",
      html: `<img src="slike/gameover.png" alt="Game Over" style="width:120px;"><p>Kroglica je ušla mimo ploščice.</p>`,
      icon: "error",
      confirmButtonText: "Pokaži leaderboard"
    }).then(() => {
      showLeaderboard();
    });
  }
}

function resetGame(justPrepare = false) {
  isGameRunning = false;
  isPaused = false;
  stopTimer();

  sekunde = 0;
  updateTime(0);
  score = 0;
  document.getElementById("score").textContent = score;
  level = 1;
  document.getElementById("level").textContent = level;

  setDifficulty(currentDifficulty);

  x = WIDTH / 2;
  y = HEIGHT - 30;
  paddleX = (WIDTH - paddleWidth) / 2;

  createBricks();

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBricks();
  drawBall();
  drawPaddle();

  if (!justPrepare) {
    startGame();
  }
}

/*******************************************************
 *  TIMER
 *******************************************************/
function startTimer() {
  if (!timerInterval) {
    timerInterval = setInterval(() => {
      sekunde++;
      updateTime(sekunde);
    }, 1000);
  }
}
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
function updateTime(sec) {
  let s = sec % 60;
  let m = Math.floor(sec / 60);
  let ss = s < 10 ? "0" + s : s;
  let mm = m < 10 ? "0" + m : m;
  document.getElementById("time").textContent = mm + ":" + ss;
}

/*******************************************************
 *  OSEBNI REZULTATI (BEST SCORE / TIME)
 *******************************************************/
function loadBestResultsForUser(username) {
  let storedScore = localStorage.getItem("theBricks_score_" + username);
  let storedTime = localStorage.getItem("theBricks_time_" + username);

  bestScore = storedScore ? parseInt(storedScore, 10) : 0;
  bestTime = storedTime ? parseInt(storedTime, 10) : 999999;
  drawBestResults();
}

function saveResultForUser(username) {
  if (score > bestScore) {
    bestScore = score;
    bestTime = sekunde;
    localStorage.setItem("theBricks_score_" + username, bestScore.toString());
    localStorage.setItem("theBricks_time_" + username, bestTime.toString());
  } else if (score === bestScore && sekunde < bestTime) {
    bestTime = sekunde;
    localStorage.setItem("theBricks_time_" + username, bestTime.toString());
  }
  drawBestResults();
}

function drawBestResults() {
  document.getElementById("bestScore").textContent = bestScore;
  let s = bestTime % 60;
  let m = Math.floor(bestTime / 60);
  let ss = s < 10 ? "0" + s : s;
  let mm = m < 10 ? "0" + m : m;
  document.getElementById("bestTime").textContent = mm + ":" + ss;
}

/*******************************************************
 *  LEADERBOARD (GLOBALNO) - SweetAlert
 *******************************************************/
function saveToLeaderboard(username, score, time) {
  let leaderboard = loadLeaderboard();
  leaderboard.push({ user: username, score: score, time: time });
  localStorage.setItem("theBricks_leaderboard", JSON.stringify(leaderboard));
}

function loadLeaderboard() {
  let data = localStorage.getItem("theBricks_leaderboard");
  if (!data) {
    return [];
  }
  return JSON.parse(data);
}

/* 
  Prikažemo SweetAlert z HTML tabelo.
*/
function showLeaderboard() {
  let leaderboard = loadLeaderboard();
  // Sortiraj: score desc, time asc
  leaderboard.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    } else {
      return a.time - b.time;
    }
  });
  // Prikaz top 10
  let top10 = leaderboard.slice(0, 10);

  // Sestavi HTML
  let html = `
    <div style="text-align:center;">
      <img src="slike/leaderboard.png" alt="Leaderboard" style="width:100px;">
      <h2 style="color:#fff;">Najboljši Rezultati</h2>
    </div>
    <table style="margin:0 auto; color:#fff; border-collapse: collapse; min-width:300px;">
      <thead>
        <tr style="background:#333;">
          <th style="padding:8px; border:1px solid #666;">#</th>
          <th style="padding:8px; border:1px solid #666;">Igralec</th>
          <th style="padding:8px; border:1px solid #666;">Točke</th>
          <th style="padding:8px; border:1px solid #666;">Čas (s)</th>
        </tr>
      </thead>
      <tbody>
  `;
  top10.forEach((item, idx) => {
    html += `
      <tr style="background:${idx % 2 === 0 ? '#2b2b2b' : '#1e1e1e'};">
        <td style="padding:8px; border:1px solid #666;">${idx + 1}</td>
        <td style="padding:8px; border:1px solid #666;">${item.user}</td>
        <td style="padding:8px; border:1px solid #666;">${item.score}</td>
        <td style="padding:8px; border:1px solid #666;">${item.time}</td>
      </tr>
    `;
  });
  html += `
      </tbody>
    </table>
  `;

  Swal.fire({
    title: "LEADERBOARD",
    html: html,
    background: "rgba(0,0,0,0.9)",  /* polprosojno črno ozadje v sweetalert */
    confirmButtonText: "Zapri",
    // Ikono lahko izpustiš ali nastaviš na 'info', ker nam bo slika prikazana ročno.
    icon: "info"
  });
}

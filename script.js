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

// ŽOGICA
let x = WIDTH / 2;
let y = HEIGHT - 30;
let dx = 3;  
let dy = -3;
let ballRadius = 10;
let ballColor = "#1DB954";

// PLOŠČICA
const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (WIDTH - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;

// OPEKE
let brickRowCount = 3;
let brickColumnCount = 5;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
let bricks = [];

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
  // Dogodki na začetnem zaslonu
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

  // Tipke
  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);

  // Miška
  document.addEventListener("mousemove", mouseMoveHandler, false);

  // Začetna nastavitev
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
    // SweetAlert2 namesto alert:
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

  // Nastavi parametre glede na težavnost
  setDifficulty(currentDifficulty);

  // Preklop v Game Screen
  switchScreen("game");

  // Izpiši ime in težavnost
  document.getElementById("displayUser").textContent = currentUser;
  document.getElementById("displayDifficulty").textContent = mapDifficultyLabel(currentDifficulty);

  // Naloži osebni rekord
  loadBestResultsForUser(currentUser);

  // Pripravi igro
  resetGame(true);  // justPrepare = true
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
 *  RISANJE OPEK
 *******************************************************/
/*
  TU LAHKO DODAŠ SLIKE ZA OPEKE:
  - Kreiraj npr. let img = new Image(); img.src = "slike/brick.png";
  - Namesto ctx.rect() in ctx.fill() uporabi: ctx.drawImage(img, brickX, brickY, brickWidth, brickHeight);
  - Ali pa pogoju, če je status 2 (bonus), kakšna druga slika...
*/
function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status > 0) {
        let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
        let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
        b.x = brickX;
        b.y = brickY;

        // Bonus (status=2) zlata, sicer zelena
        ctx.fillStyle = (b.status === 2) ? "#FFD700" : "#1DB954";
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

/*******************************************************
 *  RISANJE ŽOGICE (lahko dodaš animacije)
 *******************************************************/
/*
  Če želiš animirano spreminjanje barve žogice, 
  lahko v draw() preverjaš kakšne parametre časa ali 
  sinusno spreminjaš barvo. 
*/
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = ballColor;
  ctx.fill();
  ctx.closePath();
}

/*******************************************************
 *  RISANJE PLOŠČICE
 *******************************************************/
/*
  Tudi tu lahko uporabiš sliko ploščice (drawImage).
*/
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, HEIGHT - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#1DB954";
  ctx.fill();
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
      stopGame(true);
    } else {
      level++;
      document.getElementById("level").textContent = level;

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
    // ploščica?
    if (x > paddleX && x < paddleX + paddleWidth) {
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
  }
  else if (leftPressed && paddleX > 0) {
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
    // SweetAlert obvestilo (opcijsko)
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
  // Shranimo rezultat (osebno in v leaderboard)
  saveResultForUser(currentUser);
  saveToLeaderboard(currentUser, score, sekunde);

  if (winner) {
    Swal.fire({
      title: "Zmagal si!",
      text: "Čestitke, končal si vse nivoje!",
      icon: "success",
      confirmButtonText: "Pokaži leaderboard"
    }).then(() => {
      showLeaderboard();
    });
  } else {
    Swal.fire({
      title: "Konec igre!",
      text: "Kroglica je ušla mimo ploščice.",
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

  // Spet nastavimo parametre glede na difficulty
  setDifficulty(currentDifficulty);

  // Začetna pozicija
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
 *  LEADERBOARD (GLOBALNO)
 *******************************************************/
/*
  Shranjujemo array objektov: { username, score, time } v localStorage.
  Ključ: "theBricks_leaderboard".
  Ko se konča igra, dodamo nov zapis in prikažemo top 5.
*/

function saveToLeaderboard(username, score, time) {
  let leaderboard = loadLeaderboard();
  
  // Dodaj nov rezultat
  leaderboard.push({ user: username, score: score, time: time });
  
  // Shrani nazaj
  localStorage.setItem("theBricks_leaderboard", JSON.stringify(leaderboard));
}

// Prebere leaderboard iz localStorage
function loadLeaderboard() {
  let data = localStorage.getItem("theBricks_leaderboard");
  if (!data) {
    return []; // Ni še nič
  }
  return JSON.parse(data);
}

// Prikaže leaderboard (top 5) s SweetAlert2
function showLeaderboard() {
  let leaderboard = loadLeaderboard();
  
  // Sortiramo: najprej po score desc, nato po time asc
  leaderboard.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // večji score -> višje
    } else {
      return a.time - b.time; // manjši čas -> višje
    }
  });

  // Odrežemo na top 5
  let top5 = leaderboard.slice(0, 5);

  // Pripravimo HTML za prikaz
  let html = "<table style='width:100%; text-align:left; color:#fff;'>"
           + "<thead><tr><th>Mesto</th><th>Igralec</th><th>Točke</th><th>Čas (s)</th></tr></thead>"
           + "<tbody>";
  top5.forEach((item, index) => {
    html += `<tr>
      <td>${index + 1}.</td>
      <td>${item.user}</td>
      <td>${item.score}</td>
      <td>${item.time}</td>
    </tr>`;
  });
  html += "</tbody></table>";

  // SweetAlert s HTML-jem
  Swal.fire({
    title: "Leaderboard",
    html: html,
    icon: "info",
    confirmButtonText: "Zapri"
  });
}

// Globalne spremenljivke
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var ballRadius = 10;
var x, y, dx, dy;
var ballSpeed = 2; // Hitrost, ki se prilagaja glede na težavnost

var paddleWidth = 75;
var paddleHeight = 10;
var paddleX;
var paddleSpeed = 5;

var rightPressed = false;
var leftPressed = false;

// Opeke
var brickRowCount = 3;
var brickColumnCount = 5;
var brickWidth = 75;
var brickHeight = 20;
var brickPadding = 10;
var brickOffsetTop = 30;
var brickOffsetLeft = 30;
var bricks = [];

// Točke, timer in nivo
var score = 0;
var seconds = 0;
var level = 1;
var timerInterval, gameInterval;
var isPlaying = false;

var highScore = localStorage.getItem("highScore") || 0;
$("#highScore").html(highScore);

// Globalno igralčevo ime
var playerName = "";

// Leaderboard funkcije
function updateLeaderboard(name, score) {
  var leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  leaderboard.push({ name: name, score: score });
  leaderboard.sort(function(a, b) {
    return b.score - a.score;
  });
  leaderboard = leaderboard.slice(0, 10);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
}

function showLeaderboard() {
  var leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  if (leaderboard.length === 0) {
    Swal.fire({
      title: 'Leaderboard',
      text: 'Ni še rezultatov.',
      icon: 'info'
    });
    return;
  }
  var content = "<ul style='list-style: none; padding: 0; text-align: left;'>";
  leaderboard.forEach(function(entry, index) {
    content += `<li>${index + 1}. ${entry.name} - ${entry.score}</li>`;
  });
  content += "</ul>";
  Swal.fire({
    title: 'Leaderboard',
    html: content,
    icon: 'info'
  });
}

// Inicializacija opeke
function initBricks() {
  bricks = [];
  for (var c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (var r = 0; r < brickRowCount; r++) {
      var isBonus = Math.random() < 0.2;
      bricks[c][r] = { x: 0, y: 0, status: 1, bonus: isBonus };
    }
  }
}

// Inicializacija žogice in ploščice
function initBall() {
  x = canvas.width / 2;
  y = canvas.height - 30;
  dx = ballSpeed;
  dy = -ballSpeed;
  paddleX = (canvas.width - paddleWidth) / 2;
}

// Risanje žogice
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

// Risanje ploščice
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

// Risanje opeke
function drawBricks() {
  for (var c = 0; c < brickColumnCount; c++) {
    for (var r = 0; r < brickRowCount; r++) {
      var b = bricks[c][r];
      if (b.status === 1) {
        var brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        var brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        b.x = brickX;
        b.y = brickY;
        ctx.beginPath();
        ctx.fillStyle = b.bonus ? "#FFD700" : "#0095DD";
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

// Posodobitev točk in timerja
function drawScore() {
  $("#score").html(score);
}
function updateTimer() {
  seconds++;
  var sec = seconds % 60;
  var min = Math.floor(seconds / 60);
  $("#timer").html((min < 10 ? "0" + min : min) + ":" + (sec < 10 ? "0" + sec : sec));
}

// Glavna zanka igre
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawPaddle();
  drawBricks();
  movePaddle();
  collisionDetection();
  
  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }
  if (y + dy < ballRadius) {
    dy = -dy;
  } else if (y + dy > canvas.height - ballRadius) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
      score++;
      drawScore();
    } else {
      updateLeaderboard(playerName, score);
      showLeaderboard();
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        $("#highScore").html(highScore);
      }
      endGame();
      return;
    }
  }
  
  x += dx;
  y += dy;
}

// Premikanje ploščice
function movePaddle() {
  if (rightPressed && paddleX < canvas.width - paddleWidth) {
    paddleX += paddleSpeed;
  }
  if (leftPressed && paddleX > 0) {
    paddleX -= paddleSpeed;
  }
}

// Zaznavanje trkov med žogico in opeko
function collisionDetection() {
  for (var c = 0; c < brickColumnCount; c++) {
    for (var r = 0; r < brickRowCount; r++) {
      var b = bricks[c][r];
      if (b.status === 1) {
        if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
          dy = -dy;
          b.status = 0;
          score += b.bonus ? 5 : 1;
          drawScore();
          if (allBricksCleared()) {
            levelUp();
            return;
          }
        }
      }
    }
  }
}
function allBricksCleared() {
  for (var c = 0; c < brickColumnCount; c++) {
    for (var r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        return false;
      }
    }
  }
  return true;
}

// Nadgradnja nivoja
function levelUp() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  Swal.fire({
    title: 'Nivo ' + level + ' zaključen!',
    text: 'Napredujemo na naslednji nivo.',
    icon: 'success',
    confirmButtonText: 'Naprej'
  }).then(() => {
    level++;
    $("#level").html(level);
    ballSpeed += 1;
    initBricks();
    initBall();
    timerInterval = setInterval(updateTimer, 1000);
    gameInterval = setInterval(gameLoop, 10);
  });
}

// Konec igre
function endGame() {
  clearInterval(timerInterval);
  clearInterval(gameInterval);
  Swal.fire({
    title: 'Game Over',
    text: `Tvoje točke: ${score}`,
    icon: 'error',
    confirmButtonText: 'Igraj znova'
  }).then(() => {
    isPlaying = false;
    $("#startBtn").prop("disabled", false);
  });
}

// Začetek igre
function startGame() {
  if (!isPlaying) {
    isPlaying = true;
    $("#startBtn").prop("disabled", true);
    initBricks();
    initBall();
    score = 0;
    seconds = 0;
    level = 1;
    $("#score").html(score);
    $("#timer").html("00:00");
    $("#level").html(level);
    timerInterval = setInterval(updateTimer, 1000);
    gameInterval = setInterval(gameLoop, 10);
  }
}
function initGame() {
  score = 0;
  seconds = 0;
  level = 1;
  $("#score").html(score);
  $("#timer").html("00:00");
  $("#level").html(level);
}

// Dogodki tipkovnice (puščice in A/D)
document.addEventListener("keydown", function(event) {
  if (event.key === "Right" || event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    rightPressed = true;
  }
  if (event.key === "Left" || event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    leftPressed = true;
  }
});
document.addEventListener("keyup", function(event) {
  if (event.key === "Right" || event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    rightPressed = false;
  }
  if (event.key === "Left" || event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    leftPressed = false;
  }
});

// Gumbi
$("#startBtn").click(function() {
  startGame();
});
$("#pauseBtn").click(function() {
  if (isPlaying) {
    clearInterval(timerInterval);
    clearInterval(gameInterval);
    isPlaying = false;
    $(this).text("Nadaljuj");
  } else {
    isPlaying = true;
    timerInterval = setInterval(updateTimer, 1000);
    gameInterval = setInterval(gameLoop, 10);
    $(this).text("Pavza");
  }
});
$("#difficultyBtn").click(function() {
  chooseDifficulty();
});
$("#leaderboardBtn").click(function() {
  showLeaderboard();
});

// Najprej pridobi ime igralca, nato nastavi težavnost
$(document).ready(function() {
  $("#startBtn").prop("disabled", true);
  Swal.fire({
    title: 'Vnesi svoje ime',
    input: 'text',
    inputPlaceholder: 'Tvoje ime',
    confirmButtonText: 'Nadaljuj',
    allowOutsideClick: false,
    inputValidator: (value) => {
      if (!value) {
        return 'Prosim, vnesi svoje ime!';
      }
    }
  }).then((result) => {
    playerName = result.value;
    chooseDifficulty();
  });
});

// Funkcija za nastavitev težavnosti
function chooseDifficulty() {
  Swal.fire({
    title: 'Izberi težavnost',
    input: 'select',
    inputOptions: {
      easy: 'Enostavno',
      medium: 'Srednje',
      hard: 'Težko'
    },
    inputPlaceholder: 'Izberi težavnost',
    showCancelButton: false,
    confirmButtonText: 'Izberi'
  }).then((result) => {
    if (result.value) {
      var diff = result.value;
      if (diff === 'easy') {
        ballSpeed = 1.5;
        paddleSpeed = 5;
      } else if (diff === 'medium') {
        ballSpeed = 2.5;
        paddleSpeed = 5;
      } else if (diff === 'hard') {
        ballSpeed = 3.5;
        paddleSpeed = 5;
      }
      Swal.fire({
        title: 'Težavnost nastavljena!',
        text: 'Izbrana: ' + (diff === 'easy' ? 'Enostavno' : diff === 'medium' ? 'Srednje' : 'Težko'),
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        $("#startBtn").prop("disabled", false);
      });
    }
  });
}

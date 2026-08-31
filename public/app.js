const socket = io();

let GAME_DATA_LOCAL = typeof GAME_DATA !== "undefined" ? GAME_DATA : [];
let currentGameState = {
  currentRound: 0,
  currentSubmission: 0,
  isMemeRevealed: false,
  isAuthorRevealed: false,
};
let myPlayerName = "";
let playersList = [];

// Ricezione Stato Iniziale dal Server
socket.on("init_game", (data) => {
  if (data && data.gameData && data.gameData.length > 0) {
    GAME_DATA_LOCAL = data.gameData;
  }
  if (data && data.state) {
    currentGameState = data.state;
  }
  updateViews();
});

// Navigazione tra le schermate
function goToView(viewId) {
  document
    .querySelectorAll(".view-section")
    .forEach((el) => el.classList.add("hidden"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.remove("hidden");
    // Aggiorna subito i testi e le schede quando entri nella vista
    updateViews();
  }
}

// ==================== CONTROLLER GIOCATORE ====================
function joinGame() {
  const input = document.getElementById("player-name-input");
  const name = input.value.trim();
  if (!name) return;

  myPlayerName = name;
  socket.emit("join_game", myPlayerName);
}

socket.on("joined_successfully", () => {
  document.getElementById("player-login-box").classList.add("hidden");
  document.getElementById("player-game-box").classList.remove("hidden");
  document.getElementById("player-name-display").textContent = myPlayerName;
});

function hitBuzzer() {
  socket.emit("press_buzzer");
}

// ==================== NAVIGAZIONE CARTE ====================
function nextCard() {
  if (!GAME_DATA_LOCAL || GAME_DATA_LOCAL.length === 0) return;
  const round = GAME_DATA_LOCAL[currentGameState.currentRound];
  const validSubs = round.submissions.filter(
    (s) => s.player && s.player !== "a a",
  );

  if (currentGameState.currentSubmission < validSubs.length - 1) {
    currentGameState.currentSubmission++;
  } else if (currentGameState.currentRound < GAME_DATA_LOCAL.length - 1) {
    currentGameState.currentRound++;
    currentGameState.currentSubmission = 0;
  }
  socket.emit("change_card", {
    roundIdx: currentGameState.currentRound,
    subIdx: currentGameState.currentSubmission,
  });
}

function prevCard() {
  if (!GAME_DATA_LOCAL || GAME_DATA_LOCAL.length === 0) return;
  if (currentGameState.currentSubmission > 0) {
    currentGameState.currentSubmission--;
  } else if (currentGameState.currentRound > 0) {
    currentGameState.currentRound--;
    const validSubs = GAME_DATA_LOCAL[
      currentGameState.currentRound
    ].submissions.filter((s) => s.player && s.player !== "a a");
    currentGameState.currentSubmission = validSubs.length - 1;
  }
  socket.emit("change_card", {
    roundIdx: currentGameState.currentRound,
    subIdx: currentGameState.currentSubmission,
  });
}

function triggerMemeReveal() {
  socket.emit("reveal_meme");
}

function triggerAuthorReveal() {
  socket.emit("reveal_author");
}

function triggerBuzzerReset() {
  socket.emit("reset_buzzer");
}

// ==================== EVENTI SOCKET.IO ====================
socket.on("card_updated", (state) => {
  currentGameState = state;
  updateViews();
});

socket.on("meme_revealed", () => {
  currentGameState.isMemeRevealed = true;
  document.getElementById("host-btn-meme").classList.add("hidden");
  document.getElementById("host-meme-box").classList.remove("hidden");
});

socket.on("author_revealed", () => {
  currentGameState.isAuthorRevealed = true;
  document.getElementById("host-btn-author").classList.add("hidden");
  document.getElementById("host-author-box").classList.remove("hidden");
});

socket.on("buzzer_locked", ({ player }) => {
  document.getElementById("host-buzzer-winner").textContent = player;
  document.getElementById("host-buzzer-banner").classList.remove("hidden");

  document.getElementById("regia-buzzer-player").textContent = player;
  document.getElementById("regia-buzzer-alert").classList.remove("hidden");

  const btn = document.getElementById("buzzer-btn");
  const status = document.getElementById("player-status-msg");
  if (btn) btn.classList.add("disabled");
  if (status) {
    if (player === myPlayerName) {
      status.textContent = "🎉 TI SEI PRENOTATO! RISPONDI!";
      status.style.color = "#00ff66";
    } else {
      status.textContent = `⏳ Prenotato da: ${player}`;
      status.style.color = "#ff007f";
    }
  }
});

socket.on("buzzer_reset", () => {
  document.getElementById("host-buzzer-banner").classList.add("hidden");
  document.getElementById("regia-buzzer-alert").classList.add("hidden");

  const btn = document.getElementById("buzzer-btn");
  const status = document.getElementById("player-status-msg");
  if (btn) btn.classList.remove("disabled");
  if (status) {
    status.textContent = "Buzzer Pronto! Premi appena sai la risposta!";
    status.style.color = "#00f0ff";
  }
});

socket.on("update_players", (players) => {
  playersList = players;
  renderScoreboards();

  const me = players.find((p) => p.name === myPlayerName);
  if (me) {
    const scoreEl = document.getElementById("player-score-display");
    if (scoreEl) scoreEl.textContent = `${me.score} PT`;
  }
});

function modifyScore(playerName, delta) {
  socket.emit("update_score", { playerName, delta });
}

// ==================== RENDERING UI ====================
function updateViews() {
  if (!GAME_DATA_LOCAL || GAME_DATA_LOCAL.length === 0) return;

  const round = GAME_DATA_LOCAL[currentGameState.currentRound];
  if (!round) return;

  const validSubs = round.submissions.filter(
    (s) => s.player && s.player !== "a a",
  );
  const sub = validSubs[currentGameState.currentSubmission] || validSubs[0];
  if (!sub) return;

  // 1. Schermo Host
  document.getElementById("host-round-badge").textContent =
    `Round ${round.round} / ${GAME_DATA_LOCAL.length}`;
  document.getElementById("host-card-counter").textContent =
    `Scheda ${currentGameState.currentSubmission + 1} di ${validSubs.length}`;
  document.getElementById("host-story").textContent = round.story;
  document.getElementById("host-ans-1").textContent = sub.top3[0] || "---";
  document.getElementById("host-ans-2").textContent = sub.top3[1] || "---";
  document.getElementById("host-ans-3").textContent = sub.top3[2] || "---";
  document.getElementById("host-ans-meme").textContent = sub.meme || "---";
  document.getElementById("host-author-name").textContent = sub.player;

  if (currentGameState.isMemeRevealed) {
    document.getElementById("host-btn-meme").classList.add("hidden");
    document.getElementById("host-meme-box").classList.remove("hidden");
  } else {
    document.getElementById("host-btn-meme").classList.remove("hidden");
    document.getElementById("host-meme-box").classList.add("hidden");
  }

  if (currentGameState.isAuthorRevealed) {
    document.getElementById("host-btn-author").classList.add("hidden");
    document.getElementById("host-author-box").classList.remove("hidden");
  } else {
    document.getElementById("host-btn-author").classList.remove("hidden");
    document.getElementById("host-author-box").classList.add("hidden");
  }

  // 2. Pannello Regia
  document.getElementById("regia-round-title").textContent =
    `Round ${round.round}: ${round.story.substring(0, 50)}...`;
  document.getElementById("regia-card-counter").textContent =
    `Scheda ${currentGameState.currentSubmission + 1} / ${validSubs.length}`;
  document.getElementById("regia-author-name").textContent = sub.player;
  document.getElementById("regia-ans-1").textContent = sub.top3[0] || "---";
  document.getElementById("regia-ans-2").textContent = sub.top3[1] || "---";
  document.getElementById("regia-ans-3").textContent = sub.top3[2] || "---";
  document.getElementById("regia-ans-meme").textContent = sub.meme || "---";
}

function renderScoreboards() {
  const hostBoard = document.getElementById("host-scoreboard");
  const regiaBoard = document.getElementById("regia-scoreboard");
  if (!hostBoard || !regiaBoard) return;

  hostBoard.innerHTML = "";
  regiaBoard.innerHTML = "";

  playersList.forEach((p) => {
    const cardHtml = `
      <span class="score-name" title="${p.name}">${p.name}</span>
      <div class="score-controls">
        <button class="score-btn" onclick="modifyScore('${p.name}', -1)">-</button>
        <span class="score-val">${p.score}</span>
        <button class="score-btn" onclick="modifyScore('${p.name}', 1)">+</button>
      </div>
    `;

    const c1 = document.createElement("div");
    c1.className = "score-card";
    c1.innerHTML = cardHtml;
    hostBoard.appendChild(c1);

    const c2 = document.createElement("div");
    c2.className = "score-card";
    c2.innerHTML = cardHtml;
    regiaBoard.appendChild(c2);
  });
}

// Inizializza subito con i dati locali se già caricati
document.addEventListener("DOMContentLoaded", () => {
  updateViews();
});

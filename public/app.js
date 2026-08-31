const socket = io();

let GAME_DATA = [];
let roundIdx = 0;
let subIdx = 0;
let myPlayerName = "";
let playersList = [];

// Ricezione Stato Iniziale dal Server
socket.on("init_game", (data) => {
  GAME_DATA = data.gameData;
  roundIdx = data.state.currentRound;
  subIdx = data.state.currentSubmission;
  updateViews(data.state);
});

// Gestione Navigazione Viste
function goToView(viewId) {
  document
    .querySelectorAll(".view-section")
    .forEach((el) => el.classList.add("hidden"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.remove("hidden");
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

// ==================== NAVIGAZIONE CARTE E SYNC ====================
function nextCard() {
  const round = GAME_DATA[roundIdx];
  const validSubs = round.submissions.filter(
    (s) => s.player && s.player !== "a a",
  );

  if (subIdx < validSubs.length - 1) {
    subIdx++;
  } else if (roundIdx < GAME_DATA.length - 1) {
    roundIdx++;
    subIdx = 0;
  }
  socket.emit("change_card", { roundIdx, subIdx });
}

function prevCard() {
  if (subIdx > 0) {
    subIdx--;
  } else if (roundIdx > 0) {
    roundIdx--;
    const validSubs = GAME_DATA[roundIdx].submissions.filter(
      (s) => s.player && s.player !== "a a",
    );
    subIdx = validSubs.length - 1;
  }
  socket.emit("change_card", { roundIdx, subIdx });
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
  roundIdx = state.currentRound;
  subIdx = state.currentSubmission;
  updateViews(state);
});

socket.on("meme_revealed", () => {
  document.getElementById("host-btn-meme").classList.add("hidden");
  document.getElementById("host-meme-box").classList.remove("hidden");
});

socket.on("author_revealed", () => {
  document.getElementById("host-btn-author").classList.add("hidden");
  document.getElementById("host-author-box").classList.remove("hidden");
});

socket.on("buzzer_locked", ({ player }) => {
  // Host
  document.getElementById("host-buzzer-winner").textContent = player;
  document.getElementById("host-buzzer-banner").classList.remove("hidden");

  // Regia
  document.getElementById("regia-buzzer-player").textContent = player;
  document.getElementById("regia-buzzer-alert").classList.remove("hidden");

  // Giocatore
  const btn = document.getElementById("buzzer-btn");
  const status = document.getElementById("player-status-msg");
  btn.classList.add("disabled");
  if (player === myPlayerName) {
    status.textContent = "🎉 TI SEI PRENOTATO! RISPONDI!";
    status.style.color = "#00ff66";
  } else {
    status.textContent = `⏳ Prenotato da: ${player}`;
    status.style.color = "#ff007f";
  }
});

socket.on("buzzer_reset", () => {
  document.getElementById("host-buzzer-banner").classList.add("hidden");
  document.getElementById("regia-buzzer-alert").classList.add("hidden");

  const btn = document.getElementById("buzzer-btn");
  const status = document.getElementById("player-status-msg");
  btn.classList.remove("disabled");
  status.textContent = "Buzzer Pronto! Premi appena sai la risposta!";
  status.style.color = "#00f0ff";
});

socket.on("update_players", (players) => {
  playersList = players;
  renderScoreboards();

  const me = players.find((p) => p.name === myPlayerName);
  if (me) {
    document.getElementById("player-score-display").textContent =
      `${me.score} PT`;
  }
});

function modifyScore(playerName, delta) {
  socket.emit("update_score", { playerName, delta });
}

// ==================== RENDERING UI ====================
function updateViews(state) {
  if (!GAME_DATA || GAME_DATA.length === 0) return;

  const round = GAME_DATA[roundIdx];
  const validSubs = round.submissions.filter(
    (s) => s.player && s.player !== "a a",
  );
  const sub = validSubs[subIdx];

  // Host
  document.getElementById("host-round-badge").textContent =
    `Round ${round.round} / ${GAME_DATA.length}`;
  document.getElementById("host-card-counter").textContent =
    `Scheda ${subIdx + 1} di ${validSubs.length}`;
  document.getElementById("host-story").textContent = round.story;
  document.getElementById("host-ans-1").textContent = sub.top3[0] || "---";
  document.getElementById("host-ans-2").textContent = sub.top3[1] || "---";
  document.getElementById("host-ans-3").textContent = sub.top3[2] || "---";
  document.getElementById("host-ans-meme").textContent = sub.meme || "---";
  document.getElementById("host-author-name").textContent = sub.player;

  if (state.isMemeRevealed) {
    document.getElementById("host-btn-meme").classList.add("hidden");
    document.getElementById("host-meme-box").classList.remove("hidden");
  } else {
    document.getElementById("host-btn-meme").classList.remove("hidden");
    document.getElementById("host-meme-box").classList.add("hidden");
  }

  if (state.isAuthorRevealed) {
    document.getElementById("host-btn-author").classList.add("hidden");
    document.getElementById("host-author-box").classList.remove("hidden");
  } else {
    document.getElementById("host-btn-author").classList.remove("hidden");
    document.getElementById("host-author-box").classList.add("hidden");
  }

  // Regia
  document.getElementById("regia-round-title").textContent =
    `Round ${round.round}: ${round.story.substring(0, 45)}...`;
  document.getElementById("regia-card-counter").textContent =
    `Scheda ${subIdx + 1} / ${validSubs.length}`;
  document.getElementById("regia-author-name").textContent = sub.player;
  document.getElementById("regia-ans-1").textContent = sub.top3[0] || "---";
  document.getElementById("regia-ans-2").textContent = sub.top3[1] || "---";
  document.getElementById("regia-ans-3").textContent = sub.top3[2] || "---";
  document.getElementById("regia-ans-meme").textContent = sub.meme || "---";
}

function renderScoreboards() {
  const hostBoard = document.getElementById("host-scoreboard");
  const regiaBoard = document.getElementById("regia-scoreboard");

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

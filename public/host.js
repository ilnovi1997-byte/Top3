const socket = io();
let GAME_DATA = [];
let roundIdx = 0;
let subIdx = 0;

socket.emit("get_initial_state");

socket.on("init_game", (data) => {
  GAME_DATA = data.gameData;
  loadCard();
});

function loadCard() {
  const round = GAME_DATA[roundIdx];
  const validSubs = round.submissions.filter(
    (s) => s.player && s.player !== "a a",
  );
  const sub = validSubs[subIdx];

  document.getElementById("round-badge").textContent =
    `Round ${round.round} / ${GAME_DATA.length}`;
  document.getElementById("round-story").textContent = round.story;
  document.getElementById("card-counter").textContent =
    `Scheda ${subIdx + 1} di ${validSubs.length}`;

  document.getElementById("ans-1").textContent = sub.top3[0] || "---";
  document.getElementById("ans-2").textContent = sub.top3[1] || "---";
  document.getElementById("ans-3").textContent = sub.top3[2] || "---";
  document.getElementById("ans-meme").textContent = sub.meme || "---";
  document.getElementById("author-name").textContent = sub.player;

  // Reset visibilità
  document.getElementById("meme-box").classList.add("hidden");
  document.getElementById("btn-meme").classList.remove("hidden");
  document.getElementById("author-box").classList.add("hidden");
  document.getElementById("btn-author").classList.remove("hidden");
  document.getElementById("buzzer-banner").classList.add("hidden");

  socket.emit("host_change_card", { roundIdx, subIdx });
}

function nextCard() {
  const validSubs = GAME_DATA[roundIdx].submissions.filter(
    (s) => s.player && s.player !== "a a",
  );
  if (subIdx < validSubs.length - 1) {
    subIdx++;
  } else if (roundIdx < GAME_DATA.length - 1) {
    roundIdx++;
    subIdx = 0;
  }
  loadCard();
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
  loadCard();
}

function revealMeme() {
  document.getElementById("btn-meme").classList.add("hidden");
  document.getElementById("meme-box").classList.remove("hidden");
}

function revealAuthor() {
  document.getElementById("btn-author").classList.add("hidden");
  document.getElementById("author-box").classList.remove("hidden");
}

function resetBuzzer() {
  document.getElementById("buzzer-banner").classList.add("hidden");
  socket.emit("reset_buzzer");
}

socket.on("buzzer_locked", ({ player }) => {
  document.getElementById("buzzer-winner").textContent = player;
  document.getElementById("buzzer-banner").classList.remove("hidden");
});

socket.on("update_players", (players) => {
  const container = document.getElementById("scoreboard");
  container.innerHTML = "";
  players.forEach((p) => {
    const card = document.createElement("div");
    card.className = "score-card";
    card.innerHTML = `
      <span class="score-name">${p.name}</span>
      <div class="score-controls">
        <button class="score-btn" onclick="modifyScore('${p.name}', -1)">-</button>
        <span class="score-val">${p.score}</span>
        <button class="score-btn" onclick="modifyScore('${p.name}', 1)">+</button>
      </div>
    `;
    container.appendChild(card);
  });
});

function modifyScore(playerName, delta) {
  socket.emit("update_score", { playerName, delta });
}

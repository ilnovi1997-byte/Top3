// Stato del Gioco
let currentRoundIndex = 0;
let currentSubmissionIndex = 0;
let teams = [];
let timerInterval = null;
let timeLeft = 30;
let isTimerRunning = false;

// Inizializzazione
window.addEventListener("DOMContentLoaded", () => {
  populateRoundSelect();
  loadTeamsFromStorage();
});

function populateRoundSelect() {
  const select = document.getElementById("round-select");
  select.innerHTML = "";
  GAME_DATA.forEach((r, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `Round ${r.round}: ${r.story.substring(0, 60)}...`;
    select.appendChild(opt);
  });
}

// Gestione Squadre / Giocatori
function addTeam() {
  const input = document.getElementById("player-input");
  const name = input.value.trim();
  if (name && !teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    teams.push({ name, score: 0 });
    input.value = "";
    renderTeams();
    saveTeamsToStorage();
  }
}

function removeTeam(index) {
  teams.splice(index, 1);
  renderTeams();
  saveTeamsToStorage();
}

function renderTeams() {
  const container = document.getElementById("teams-list");
  container.innerHTML = "";
  teams.forEach((t, idx) => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `${t.name} <button onclick="removeTeam(${idx})">×</button>`;
    container.appendChild(tag);
  });
}

function saveTeamsToStorage() {
  localStorage.setItem("party_game_teams", JSON.stringify(teams));
}

function loadTeamsFromStorage() {
  const saved = localStorage.getItem("party_game_teams");
  if (saved) {
    teams = JSON.parse(saved);
    renderTeams();
  }
}

// Avvio Partita
function startGame() {
  const select = document.getElementById("round-select");
  currentRoundIndex = parseInt(select.value, 10) || 0;
  currentSubmissionIndex = 0;

  document.getElementById("setup-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  renderScoreboard();
  loadCurrentSubmission();
}

function exitToSetup() {
  clearInterval(timerInterval);
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("setup-screen").classList.remove("hidden");
}

// Caricamento Dati Round & Submissions
function loadCurrentSubmission() {
  const roundData = GAME_DATA[currentRoundIndex];

  // Filtra partecipanti validi (escludi righe vuote o meme di test)
  const validSubmissions = roundData.submissions.filter(
    (s) => s.player && s.player !== "a a",
  );
  const sub = validSubmissions[currentSubmissionIndex];

  // Aggiorna Badge e Storia
  document.getElementById("round-badge").textContent =
    `Round ${roundData.round} / ${GAME_DATA.length}`;
  document.getElementById("round-story").textContent = roundData.story;
  document.getElementById("submission-counter").textContent =
    `Scheda ${currentSubmissionIndex + 1} di ${validSubmissions.length}`;

  // Popola Top 3
  document.getElementById("ans-1").textContent = sub.top3[0] || "---";
  document.getElementById("ans-2").textContent = sub.top3[1] || "---";
  document.getElementById("ans-3").textContent = sub.top3[2] || "---";

  // Popola Meme & Autore (nascosti di default)
  document.getElementById("ans-meme").textContent =
    sub.meme || "Nessuna risposta meme";
  document.getElementById("author-name").textContent = sub.player;

  // Reset visuale
  document.getElementById("meme-box").classList.add("hidden");
  document.getElementById("btn-reveal-meme").classList.remove("hidden");
  document.getElementById("author-box").classList.add("hidden");
  document.getElementById("btn-reveal-author").classList.remove("hidden");

  resetTimer();
}

function nextSubmission() {
  const validSubmissions = GAME_DATA[currentRoundIndex].submissions.filter(
    (s) => s.player && s.player !== "a a",
  );
  if (currentSubmissionIndex < validSubmissions.length - 1) {
    currentSubmissionIndex++;
    loadCurrentSubmission();
  } else if (currentRoundIndex < GAME_DATA.length - 1) {
    currentRoundIndex++;
    currentSubmissionIndex = 0;
    loadCurrentSubmission();
  }
}

function prevSubmission() {
  if (currentSubmissionIndex > 0) {
    currentSubmissionIndex--;
    loadCurrentSubmission();
  } else if (currentRoundIndex > 0) {
    currentRoundIndex--;
    const validSubmissions = GAME_DATA[currentRoundIndex].submissions.filter(
      (s) => s.player && s.player !== "a a",
    );
    currentSubmissionIndex = validSubmissions.length - 1;
    loadCurrentSubmission();
  }
}

// Reveal Buttons
function revealMeme() {
  document.getElementById("btn-reveal-meme").classList.add("hidden");
  document.getElementById("meme-box").classList.remove("hidden");
}

function revealAuthor() {
  document.getElementById("btn-reveal-author").classList.add("hidden");
  document.getElementById("author-box").classList.remove("hidden");
}

// Timer
function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timeLeft = 30;
  document.getElementById("timer-display").textContent = timeLeft;
}

function toggleTimer() {
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
  } else {
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById("timer-display").textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
      }
    }, 1000);
  }
}

// Scoreboard & Punteggi
function renderScoreboard() {
  const container = document.getElementById("scoreboard");
  container.innerHTML = "";
  teams.forEach((t, idx) => {
    const card = document.createElement("div");
    card.className = "score-card";
    card.innerHTML = `
      <span class="score-name" title="${t.name}">${t.name}</span>
      <div class="score-controls">
        <button class="score-btn" onclick="updateScore(${idx}, -1)">-</button>
        <span class="score-val">${t.score}</span>
        <button class="score-btn" onclick="updateScore(${idx}, 1)">+</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateScore(index, delta) {
  teams[index].score = Math.max(0, teams[index].score + delta);
  saveTeamsToStorage();
  renderScoreboard();
}

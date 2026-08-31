const socket = io();
let myName = "";

function joinGame() {
  const input = document.getElementById("player-name");
  const name = input.value.trim();
  if (!name) return;

  myName = name;
  socket.emit("join_game", myName);
}

socket.on("joined_successfully", () => {
  document.getElementById("login-view").classList.add("hidden");
  document.getElementById("game-view").classList.remove("hidden");
  document.getElementById("display-name").textContent = myName;
});

function hitBuzzer() {
  socket.emit("press_buzzer");
}

socket.on("buzzer_locked", ({ player }) => {
  const btn = document.getElementById("buzzer-btn");
  const status = document.getElementById("buzzer-status");

  btn.classList.add("disabled");
  if (player === myName) {
    status.textContent = "🎉 TI SEI PRENOTATO! RISPONDI!";
    status.style.color = "#00ff66";
  } else {
    status.textContent = `⏳ Prenotato da: ${player}`;
    status.style.color = "#ff007f";
  }
});

socket.on("buzzer_reset", () => {
  const btn = document.getElementById("buzzer-btn");
  const status = document.getElementById("buzzer-status");
  btn.classList.remove("disabled");
  status.textContent = "Buzzer Pronto! Premi appena sai la risposta!";
  status.style.color = "#00f0ff";
});

socket.on("update_players", (players) => {
  const me = players.find((p) => p.name === myName);
  if (me) {
    document.getElementById("player-score").textContent = `${me.score} PT`;
  }
});

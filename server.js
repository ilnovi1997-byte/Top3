const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const GAME_DATA = require("./gameData.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Rotte esplicite
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "player.html")),
);
app.get("/host", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "host.html")),
);

// Stato Globale del Gioco
let gameState = {
  currentRound: 0,
  currentSubmission: 0,
  isBuzzerActive: false,
  buzzedPlayer: null,
  players: {}, // socketId: { name, score }
};

io.on("connection", (socket) => {
  // Connessione Giocatore
  socket.on("join_game", (playerName) => {
    gameState.players[socket.id] = { name: playerName, score: 0 };
    io.emit("update_players", Object.values(gameState.players));
    socket.emit("joined_successfully", { name: playerName });
  });

  // Host richiede stato iniziale
  socket.on("get_initial_state", () => {
    socket.emit("init_game", {
      gameData: GAME_DATA,
      state: gameState,
    });
  });

  // Host cambia scheda / round
  socket.on("host_change_card", ({ roundIdx, subIdx }) => {
    gameState.currentRound = roundIdx;
    gameState.currentSubmission = subIdx;
    gameState.isBuzzerActive = true;
    gameState.buzzedPlayer = null;

    io.emit("card_updated", {
      roundIdx,
      subIdx,
      isBuzzerActive: true,
    });
  });

  // Giocatore preme il Buzzer da telefono
  socket.on("press_buzzer", () => {
    if (
      gameState.isBuzzerActive &&
      !gameState.buzzedPlayer &&
      gameState.players[socket.id]
    ) {
      gameState.isBuzzerActive = false;
      gameState.buzzedPlayer = gameState.players[socket.id].name;

      io.emit("buzzer_locked", {
        player: gameState.buzzedPlayer,
        playerId: socket.id,
      });
    }
  });

  // Host assegna punti
  socket.on("update_score", ({ playerName, delta }) => {
    for (let id in gameState.players) {
      if (gameState.players[id].name === playerName) {
        gameState.players[id].score = Math.max(
          0,
          gameState.players[id].score + delta,
        );
      }
    }
    io.emit("update_players", Object.values(gameState.players));
  });

  // Host sblocca buzzer per nuovo tentativo
  socket.on("reset_buzzer", () => {
    gameState.isBuzzerActive = true;
    gameState.buzzedPlayer = null;
    io.emit("buzzer_reset");
  });

  // Disconnessione
  socket.on("disconnect", () => {
    delete gameState.players[socket.id];
    io.emit("update_players", Object.values(gameState.players));
  });
});

server.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
  console.log(`Schermo Host: http://localhost:${PORT}/host`);
});

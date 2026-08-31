const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
// server.js
const GAME_DATA = require("./gameData.js") || require("./public/gameData.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Fallback su index.html per qualsiasi rotta
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Stato Globale del Gioco
let gameState = {
  currentRound: 0,
  currentSubmission: 0,
  isMemeRevealed: false,
  isAuthorRevealed: false,
  isBuzzerActive: true,
  buzzedPlayer: null,
  players: {}, // socketId: { name, score }
};

io.on("connection", (socket) => {
  // Invio stato iniziale
  socket.emit("init_game", {
    gameData: GAME_DATA,
    state: gameState,
  });

  // Login Giocatore
  socket.on("join_game", (playerName) => {
    gameState.players[socket.id] = { name: playerName, score: 0 };
    io.emit("update_players", Object.values(gameState.players));
    socket.emit("joined_successfully", { name: playerName });
  });

  // Cambio scheda / round (da Host o da Regia)
  socket.on("change_card", ({ roundIdx, subIdx }) => {
    gameState.currentRound = roundIdx;
    gameState.currentSubmission = subIdx;
    gameState.isMemeRevealed = false;
    gameState.isAuthorRevealed = false;
    gameState.isBuzzerActive = true;
    gameState.buzzedPlayer = null;

    io.emit("card_updated", gameState);
  });

  // Reveal Meme
  socket.on("reveal_meme", () => {
    gameState.isMemeRevealed = true;
    io.emit("meme_revealed");
  });

  // Reveal Autore
  socket.on("reveal_author", () => {
    gameState.isAuthorRevealed = true;
    io.emit("author_revealed");
  });

  // Buzzer premuto da Smartphone
  socket.on("press_buzzer", () => {
    if (
      gameState.isBuzzerActive &&
      !gameState.buzzedPlayer &&
      gameState.players[socket.id]
    ) {
      gameState.isBuzzerActive = false;
      gameState.buzzedPlayer = gameState.players[socket.id].name;

      io.emit("buzzer_locked", { player: gameState.buzzedPlayer });
    }
  });

  // Reset Buzzer
  socket.on("reset_buzzer", () => {
    gameState.isBuzzerActive = true;
    gameState.buzzedPlayer = null;
    io.emit("buzzer_reset");
  });

  // Aggiornamento punteggio
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

  socket.on("disconnect", () => {
    delete gameState.players[socket.id];
    io.emit("update_players", Object.values(gameState.players));
  });
});

server.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});

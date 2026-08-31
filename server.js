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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Stato Globale
let gameState = {
  currentRound: 0,
  currentSubmission: 0,
  isMemeRevealed: false,
  isAuthorRevealed: false,
  isBuzzerActive: true,
  buzzerQueue: [], // Array ordinato: [{ name, socketId, time }]
  players: {},
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

  // Cambio scheda / round
  socket.on("change_card", ({ roundIdx, subIdx }) => {
    gameState.currentRound = roundIdx;
    gameState.currentSubmission = subIdx;
    gameState.isMemeRevealed = false;
    gameState.isAuthorRevealed = false;
    gameState.isBuzzerActive = true;
    gameState.buzzerQueue = [];

    io.emit("card_updated", gameState);
  });

  // Reveal Meme & Autore
  socket.on("reveal_meme", () => {
    gameState.isMemeRevealed = true;
    io.emit("meme_revealed");
  });

  socket.on("reveal_author", () => {
    gameState.isAuthorRevealed = true;
    io.emit("author_revealed");
  });

  // Giocatore preme il Buzzer (Aggiunta in Coda)
  socket.on("press_buzzer", () => {
    if (!gameState.isBuzzerActive || !gameState.players[socket.id]) return;

    const alreadyInQueue = gameState.buzzerQueue.some(
      (item) => item.socketId === socket.id,
    );
    if (!alreadyInQueue) {
      gameState.buzzerQueue.push({
        name: gameState.players[socket.id].name,
        socketId: socket.id,
        time: Date.now(),
      });

      io.emit("buzzer_queue_updated", {
        queue: gameState.buzzerQueue,
        firstPlayer: gameState.buzzerQueue[0].name,
      });
    }
  });

  // Host/Regia passa al prossimo giocatore della coda
  socket.on("pass_buzzer_turn", () => {
    if (gameState.buzzerQueue.length > 0) {
      gameState.buzzerQueue.shift(); // Rimuove il primo
      io.emit("buzzer_queue_updated", {
        queue: gameState.buzzerQueue,
        firstPlayer:
          gameState.buzzerQueue.length > 0
            ? gameState.buzzerQueue[0].name
            : null,
      });
    }
  });

  // Reset completo del Buzzer
  socket.on("reset_buzzer", () => {
    gameState.isBuzzerActive = true;
    gameState.buzzerQueue = [];
    io.emit("buzzer_reset");
  });

  // Punti
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
    gameState.buzzerQueue = gameState.buzzerQueue.filter(
      (item) => item.socketId !== socket.id,
    );
    io.emit("update_players", Object.values(gameState.players));
    io.emit("buzzer_queue_updated", {
      queue: gameState.buzzerQueue,
      firstPlayer:
        gameState.buzzerQueue.length > 0 ? gameState.buzzerQueue[0].name : null,
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});

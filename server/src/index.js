import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createGame,
  getPublicState,
  processTurn,
  drawTile,
  nextTurn,
} from "./gameManager.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  socket.on("room:join", ({ name, code }) => {
    socket.join(code);

    if (!rooms[code]) {
      rooms[code] = { players: [], gameState: null };
    }

    rooms[code].players.push({ id: socket.id, name });

    io.to(code).emit("room:updated", {
      players: rooms[code].players,
    });

    console.log(`${name} joined room ${code}`);
  });

  socket.on("game:start", ({ code }) => {
    const room = rooms[code];
    if (!room) return;

    const firstPlayer = room.players[0];
    if (firstPlayer.id !== socket.id) return;

    room.gameState = createGame(room.players);
    room.gameState.log.push({
      message: `Game started with ${room.players.length} players`,
      timestamp: Date.now(),
    });

    for (const player of room.players) {
      const state = getPublicState(room.gameState, player.id);
      io.to(player.id).emit("game:started", state);
    }

    console.log(`game started in room ${code}`);
  });

  socket.on("turn:submit", ({ code, board, rack }) => {
    const room = rooms[code];
    if (!room || !room.gameState) return;

    const result = processTurn(room.gameState, socket.id, board, rack);

    if (!result.success) {
      socket.emit("turn:invalid", { reason: result.reason });
      return;
    }

    if (result.finished) {
      for (const player of room.players) {
        const state = getPublicState(room.gameState, player.id);
        io.to(player.id).emit("game:over", { ...state, winner: result.winner });
      }
      return;
    }

    for (const player of room.players) {
      const state = getPublicState(room.gameState, player.id);
      io.to(player.id).emit("state:update", state);
    }
  });

  socket.on("turn:draw", ({ code }) => {
    const room = rooms[code];
    if (!room || !room.gameState) return;

    if (room.gameState.pool.length === 0) {
      const player = room.gameState.players[socket.id];
      room.gameState.log.push({
        message: `${player.name} passed (pool empty)`,
        timestamp: Date.now(),
      });
      nextTurn(room.gameState);

      for (const player of room.players) {
        const state = getPublicState(room.gameState, player.id);
        io.to(player.id).emit("state:update", {
          ...state,
          message: "Pool is empty — turn passed automatically.",
        });
      }
      return;
    }

    const result = drawTile(room.gameState, socket.id);

    if (!result.success) {
      socket.emit("turn:invalid", { reason: result.reason });
      return;
    }

    for (const player of room.players) {
      const state = getPublicState(room.gameState, player.id);
      io.to(player.id).emit("state:update", state);
    }
  });

  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id);

    for (const code in rooms) {
      rooms[code].players = rooms[code].players.filter(
        (p) => p.id !== socket.id,
      );
      if (rooms[code].players.length === 0) {
        delete rooms[code];
      } else {
        io.to(code).emit("room:updated", { players: rooms[code].players });
      }
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

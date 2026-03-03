import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

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

    io.to(code).emit("game:started", {
      board: [],
      rack: [],
      currentTurn: room.players[0].id,
    });

    console.log(`game started in room ${code}`);
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

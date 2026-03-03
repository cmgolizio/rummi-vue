import { defineStore } from "pinia";
import { ref } from "vue";
import socket from "../socket/index.js";

export const useGameStore = defineStore("game", () => {
  const playerName = ref("");
  const roomCode = ref("");
  const players = ref([]);
  const gamePhase = ref("lobby");
  const myRack = ref([]);
  const board = ref([]);
  const currentTurn = ref(null);
  const mySocketId = ref(null);

  function joinRoom(name, code) {
    playerName.value = name;
    roomCode.value = code;
    socket.connect();
    socket.emit("room:join", { name, code });
  }

  function registerSocketEvents() {
    socket.on("connect", () => {
      mySocketId.value = socket.id;
    });

    socket.on("room:updated", (data) => {
      players.value = data.players;
    });

    socket.on("game:started", (data) => {
      gamePhase.value = "playing";
      board.value = data.board;
      myRack.value = data.rack;
      currentTurn.value = data.currentTurn;
    });

    socket.on("state:update", (data) => {
      board.value = data.board;
      myRack.value = data.rack;
      currentTurn.value = data.currentTurn;
      players.value = data.players;
    });
  }

  return {
    playerName,
    roomCode,
    players,
    gamePhase,
    myRack,
    board,
    currentTurn,
    mySocketId,
    joinRoom,
    registerSocketEvents,
  };
});

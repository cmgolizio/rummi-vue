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
  const lastPlayedIds = ref([]);
  const log = ref([]);
  const currentTurn = ref(null);
  const mySocketId = ref(null);
  const poolCount = ref(0);
  const serverMessage = ref("");

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
      poolCount.value = data.poolCount || 0;
      lastPlayedIds.value = [];
      log.value = data.log || [];
    });

    socket.on("state:update", (data) => {
      board.value = data.board;
      myRack.value = data.rack;
      currentTurn.value = data.currentTurn;
      players.value = data.players;
      poolCount.value = data.poolCount || 0;
      lastPlayedIds.value = data.lastPlayedIds || [];
      log.value = data.log || [];
      if (data.message) {
        serverMessage.value = data.message;
        setTimeout(() => {
          serverMessage.value = "";
        }, 4000);
      }
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
    poolCount,
    serverMessage,
    lastPlayedIds,
    log,
    joinRoom,
    registerSocketEvents,
  };
});

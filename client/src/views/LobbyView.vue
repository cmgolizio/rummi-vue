<template>
  <div class="lobby">
    <h1>Rummikub</h1>
    <div class="card">
      <input v-model="nameInput" placeholder="Your name" maxlength="20" />
      <input v-model="codeInput" placeholder="Room code" maxlength="6" />
      <button :disabled="!canJoin" @click="handleJoin">Join Room</button>
    </div>

    <div v-if="store.players.length" class="room">
      <h2>Room: {{ store.roomCode }}</h2>
      <ul>
        <li v-for="p in store.players" :key="p.id">{{ p.name }}</li>
      </ul>
      <button v-if="isHost" @click="handleStart">Start Game</button>
      <p v-else>Waiting for host to start...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/gameStore.js";
import socket from "../socket/index.js";

const store = useGameStore();
const router = useRouter();

const nameInput = ref("");
const codeInput = ref("");

const canJoin = computed(
  () => nameInput.value.trim() && codeInput.value.trim(),
);
const isHost = computed(() => store.players[0]?.id === store.mySocketId);

function handleJoin() {
  store.joinRoom(nameInput.value.trim(), codeInput.value.trim());
}

function handleStart() {
  socket.emit("game:start", { code: store.roomCode });
}

socket.on("game:started", () => {
  router.push("/game");
});
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 2rem;
}

h1 {
  font-size: 3rem;
  letter-spacing: 0.2rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: #16213e;
  padding: 2rem;
  border-radius: 12px;
  width: 300px;
}

input {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #444;
  background: #0f3460;
  color: #eee;
  font-size: 1rem;
}

button {
  padding: 0.75rem;
  border-radius: 8px;
  border: none;
  background: #e94560;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.room {
  background: #16213e;
  padding: 2rem;
  border-radius: 12px;
  width: 300px;
  text-align: center;
}

.room ul {
  list-style: none;
  margin: 1rem 0;
}

.room li {
  padding: 0.4rem 0;
  border-bottom: 1px solid #333;
}
</style>

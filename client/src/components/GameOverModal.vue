<template>
  <div class="overlay">
    <div class="modal">
      <h1>🎉 Game Over!</h1>
      <p class="winner-text">{{ winnerName }} wins!</p>
      <div class="scores">
        <div
          v-for="p in players"
          :key="p.id"
          class="score-row"
          :class="{ winner: p.id === winnerId }"
        >
          <span class="score-name">{{ p.name }}</span>
          <span class="score-tiles">{{ p.rackCount }} tiles remaining</span>
        </div>
      </div>
      <button @click="emit('playAgain')">Play Again</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  winnerName: { type: String, required: true },
  winnerId: { type: String, required: true },
  players: { type: Array, required: true },
});

const emit = defineEmits(["playAgain"]);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #16213e;
  border-radius: 16px;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  min-width: 340px;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
}

h1 {
  font-size: 2.5rem;
}

.winner-text {
  font-size: 1.5rem;
  color: #e94560;
  font-weight: bold;
}

.scores {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score-row {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: #0f3460;
  border-radius: 8px;
  border: 2px solid transparent;
}

.score-row.winner {
  border-color: #e94560;
}

.score-name {
  font-weight: bold;
}

.score-tiles {
  color: #aaa;
  font-size: 0.9rem;
}

button {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  border: none;
  background: #e94560;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  opacity: 0.85;
}
</style>

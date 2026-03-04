<template>
  <div class="overlay">
    <div class="modal">
      <h2>★ Joker Tile</h2>
      <p>What number should this joker represent?</p>
      <div class="number-grid">
        <button v-for="n in 13" :key="n" @click="emit('select', n)">
          {{ n }}
        </button>
      </div>
      <button class="cancel" @click="emit('cancel')">Cancel</button>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(["select", "cancel"]);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: #16213e;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  min-width: 320px;
}

h2 {
  color: #8e44ad;
  font-size: 1.8rem;
}

p {
  color: #aaa;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  width: 100%;
}

.number-grid button {
  padding: 0.6rem;
  border-radius: 6px;
  border: none;
  background: #0f3460;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.number-grid button:hover {
  background: #8e44ad;
}

.cancel {
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: #666;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>

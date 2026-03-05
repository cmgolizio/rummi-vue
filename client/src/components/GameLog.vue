<template>
  <div class="game-log">
    <span class="log-label">Game Log</span>
    <div class="log-entries" ref="logContainer">
      <div
        v-for="(entry, index) in log"
        :key="index"
        class="log-entry"
        :class="{ 'log-win': entry.message.includes('wins') }"
      >
        <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
        <span class="log-message">{{ entry.message }}</span>
      </div>
      <div v-if="log.length === 0" class="log-empty">No moves yet</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";

const props = defineProps({
  log: {
    type: Array,
    required: true,
  },
});

const logContainer = ref(null);

function formatTime(timestamp) {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

watch(
  () => props.log.length,
  async () => {
    await nextTick();
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  },
);
</script>

<style scoped>
.game-log {
  background: #16213e;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
}

.log-label {
  font-size: 0.75rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
  flex-shrink: 0;
}

.log-entries {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-height: 0;
}

.log-entry {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.35rem 0.5rem;
  background: #0f3460;
  border-radius: 6px;
  border-left: 3px solid #333;
}

.log-entry.log-win {
  border-left-color: #e94560;
  background: #1a1a3e;
}

.log-time {
  font-size: 0.65rem;
  color: #555;
}

.log-message {
  font-size: 0.8rem;
  color: #ccc;
}

.log-empty {
  font-size: 0.8rem;
  color: #444;
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
}
</style>

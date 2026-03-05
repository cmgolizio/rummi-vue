<template>
  <div
    class="tile"
    :class="[tile.isJoker ? 'joker' : tile.color, { 'tile-new': isNew }]"
  >
    <template v-if="tile.isJoker">
      <span class="joker-star">★</span>
      <span v-if="tile.represents" class="joker-rep">{{
        tile.represents.number
      }}</span>
    </template>
    <template v-else>
      {{ tile.number }}
    </template>
  </div>
</template>

<script setup>
defineProps({
  tile: {
    type: Object,
    required: true,
  },
  isNew: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.tile {
  width: 48px;
  height: 64px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: bold;
  background: #f5f0e8;
  cursor: grab;
  user-select: none;
  border: 2px solid #ccc;
  position: relative;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}

.tile.red {
  color: #e74c3c;
}
.tile.blue {
  color: #2980b9;
}
.tile.yellow {
  color: #f39c12;
}
.tile.black {
  color: #2c3e50;
}
.tile.joker {
  color: #8e44ad;
  background: #ffeaa7;
}

.tile-new {
  border-color: #ffa71a;
  border-width: 3px;
  box-shadow: 0 0 10px rgba(255, 167, 26, 0.7);
}

.joker-star {
  font-size: 1.1rem;
}

.joker-rep {
  font-size: 0.7rem;
  color: #555;
  line-height: 1;
}
</style>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useGameStore } from "./stores/gameStore.js";

const store = useGameStore();

onMounted(() => {
  store.registerSocketEvents();
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: sans-serif;
  background: #1a1a2e;
  color: #eee;
}
</style>

<template>
  <div class="game">
    <GameOverModal
      v-if="gameOver && gameOverData"
      :winnerName="
        store.players.find((p) => p.id === gameOverData.winner)?.name ||
        'Unknown'
      "
      :winnerId="gameOverData.winner"
      :players="gameOverData.players"
      @playAgain="playAgain"
    />

    <JokerModal
      v-if="showJokerModal"
      @select="resolveJoker"
      @cancel="cancelJoker"
    />

    <div class="sidebar">
      <div class="players">
        <div
          v-for="p in store.players"
          :key="p.id"
          class="player-card"
          :class="{ active: p.id === store.currentTurn }"
        >
          <span class="player-name">{{ p.name }}</span>
          <span class="tile-count">{{ p.rackCount }} tiles</span>
          <span v-if="p.hasInitialMeld" class="melded">✓ melded</span>
        </div>
      </div>
      <div class="pool-info">🎲 {{ store.poolCount }} tiles in pool</div>
    </div>

    <div class="main">
      <div class="board" @dragover.prevent>
        <TransitionGroup name="group-fade">
          <div
            v-for="(group, groupIndex) in workingBoard"
            :key="groupKeys[groupIndex]"
            class="group"
            :class="{ 'drag-over': dragOverGroup === groupIndex }"
            @dragover.prevent="dragOverGroup = groupIndex"
            @dragleave="dragOverGroup = null"
            @drop.stop="onDropExistingGroup($event, groupIndex)"
          >
            <span class="group-label">{{ groupIndex + 1 }}</span>
            <TileComponent
              v-for="tile in group"
              :key="tile.id"
              :tile="tile"
              :isNew="!snapshotBoardIds.has(tile.id)"
              :isExisting="snapshotBoardIds.has(tile.id)"
              draggable="true"
              @dragstart="onDragStart($event, tile, 'board', groupIndex)"
            />
          </div>
        </TransitionGroup>

        <div
          class="new-group-hint"
          :class="{ 'drag-over': dragOverNewGroup }"
          @dragover.prevent="dragOverNewGroup = true"
          @dragleave="dragOverNewGroup = false"
          @drop.stop="onDropNewGroup"
        >
          <span>Drop here to start a new group</span>
        </div>
      </div>

      <div v-if="serverMessage" class="server-message">
        {{ serverMessage }}
      </div>

      <div class="actions" v-if="isMyTurn">
        <button @click="submitTurn" class="btn-submit">✓ Submit Turn</button>
        <button @click="drawTile" class="btn-draw">Draw Tile</button>
        <button @click="sortRack" class="btn-sort">
          Sort by {{ sortMode === "color" ? "Color" : "Number" }}
        </button>
        <button @click="cancelTurn" class="btn-cancel">↺ Clear</button>
      </div>
      <div class="waiting" v-else>
        ⏳ Waiting for {{ currentPlayerName }}...
      </div>

      <div
        class="rack"
        @dragover.prevent="dragOverRack = true"
        @dragleave="dragOverRack = false"
        @drop="onDropRack"
        :class="{ 'drag-over': dragOverRack }"
      >
        <span class="rack-label">Your Rack</span>
        <div class="rack-tiles">
          <TileComponent
            v-for="tile in workingRack"
            :key="tile.id"
            :tile="tile"
            draggable="true"
            @dragstart="onDragStart($event, tile, 'rack', null)"
          />
          <span v-if="workingRack.length === 0" class="rack-empty"
            >Empty rack — you're winning!</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useGameStore } from "../stores/gameStore.js";
import TileComponent from "../components/TileComponent.vue";
import GameOverModal from "../components/GameOverModal.vue";
import JokerModal from "../components/JokerModal.vue";
import socket from "../socket/index.js";

const store = useGameStore();
const router = useRouter();
const { serverMessage } = storeToRefs(store);

const workingBoard = ref([]);
const workingRack = ref([]);
const boardSnapshot = ref([]);
const rackSnapshot = ref([]);
const groupKeys = ref([]);

const dragOverGroup = ref(null);
const dragOverNewGroup = ref(false);
const dragOverRack = ref(false);

const gameOver = ref(false);
const gameOverData = ref(null);

const showJokerModal = ref(false);
const pendingJokerPlacement = ref(null);

const sortMode = ref("color");
const COLOR_ORDER = { red: 0, blue: 1, yellow: 2, black: 3 };

const isMyTurn = computed(() => store.currentTurn === store.mySocketId);
const currentPlayerName = computed(() => {
  return store.players.find((p) => p.id === store.currentTurn)?.name || "";
});
const snapshotBoardIds = computed(
  () => new Set(boardSnapshot.value.flat().map((t) => t.id)),
);

function generateGroupKeys(board) {
  return board.map((_, i) => `group-${Date.now()}-${i}`);
}

function takeSnapshot() {
  boardSnapshot.value = JSON.parse(JSON.stringify(workingBoard.value));
  rackSnapshot.value = JSON.parse(JSON.stringify(workingRack.value));
}

function syncFromStore() {
  const newBoard = JSON.parse(JSON.stringify(store.board));
  const newRack = JSON.parse(JSON.stringify(store.myRack));

  const existingIds = new Set(workingRack.value.map((t) => t.id));
  const incoming = newRack.filter((t) => !existingIds.has(t.id));
  const stillPresent = workingRack.value.filter((t) =>
    newRack.some((r) => r.id === t.id),
  );

  workingRack.value = [...stillPresent, ...incoming];
  workingBoard.value = newBoard;
  groupKeys.value = generateGroupKeys(workingBoard.value);
  takeSnapshot();
}

watch(() => [store.board, store.myRack], syncFromStore, {
  deep: true,
  flush: "post",
});

syncFromStore();

let draggedTile = null;
let dragSource = null;
let dragGroupIndex = null;

function onDragStart(event, tile, source, groupIndex) {
  const myPlayer = store.players.find((p) => p.id === store.mySocketId);
  const hasInitialMeld = myPlayer?.hasInitialMeld;

  if (source === "board" && !hasInitialMeld) {
    event.preventDefault();
    return;
  }

  draggedTile = tile;
  dragSource = source;
  dragGroupIndex = groupIndex;
  event.dataTransfer.effectAllowed = "move";
}

function removeTileFromSource() {
  if (dragSource === "rack") {
    workingRack.value = workingRack.value.filter(
      (t) => t.id !== draggedTile.id,
    );
  } else if (dragSource === "board") {
    workingBoard.value[dragGroupIndex] = workingBoard.value[
      dragGroupIndex
    ].filter((t) => t.id !== draggedTile.id);
  }
}

function cleanEmptyGroups() {
  workingBoard.value = workingBoard.value.filter((g) => g.length > 0);
  groupKeys.value = generateGroupKeys(workingBoard.value);
}

function placeJokerWithContext(placement) {
  pendingJokerPlacement.value = placement;
  showJokerModal.value = true;
}

function resolveJoker(number) {
  showJokerModal.value = false;
  const tile = { ...draggedTile, represents: { number } };
  const { type, groupIndex } = pendingJokerPlacement.value;

  if (type === "existing") {
    const group = workingBoard.value[groupIndex];
    group.push(tile);

    const allSameNumber = group
      .filter((t) => !t.isJoker)
      .every((t, _, arr) => t.number === arr[0].number);

    if (!allSameNumber) {
      workingBoard.value[groupIndex] = [...group].sort((a, b) => {
        const numA = a.isJoker ? (a.represents?.number ?? 0) : a.number;
        const numB = b.isJoker ? (b.represents?.number ?? 0) : b.number;
        return numA - numB;
      });
    }
  } else {
    workingBoard.value.push([tile]);
  }

  groupKeys.value = generateGroupKeys(workingBoard.value);
  cleanEmptyGroups();
  draggedTile = null;
  pendingJokerPlacement.value = null;
}

function cancelJoker() {
  showJokerModal.value = false;
  if (dragSource === "rack") {
    workingRack.value.push(draggedTile);
  } else if (dragSource === "board") {
    workingBoard.value[dragGroupIndex].push(draggedTile);
  }
  draggedTile = null;
  pendingJokerPlacement.value = null;
}

function onDropExistingGroup(event, groupIndex) {
  if (!draggedTile) return;
  removeTileFromSource();
  cleanEmptyGroups();

  const adjustedIndex =
    groupIndex >= workingBoard.value.length
      ? workingBoard.value.length - 1
      : groupIndex;

  if (draggedTile.isJoker) {
    draggedTile = { ...draggedTile };
    placeJokerWithContext({ type: "existing", groupIndex: adjustedIndex });
    dragOverGroup.value = null;
    return;
  }

  if (adjustedIndex >= 0) {
    const group = workingBoard.value[adjustedIndex];
    const nonJokers = group.filter((t) => !t.isJoker);
    const duplicate = nonJokers.find((t) => t.number === draggedTile.number);

    if (duplicate) {
      const allSameNumber = group.every(
        (t) => t.isJoker || t.number === draggedTile.number,
      );

      if (allSameNumber) {
        group.push(draggedTile);
      } else {
        const splitIndex = group.findIndex(
          (t) => !t.isJoker && t.number === draggedTile.number,
        );
        const groupBefore = group.slice(0, splitIndex);
        const groupAfter = group.slice(splitIndex);
        const newGroups = [];
        if (groupBefore.length > 0)
          newGroups.push([...groupBefore, draggedTile]);
        if (groupAfter.length > 0) newGroups.push(groupAfter);
        workingBoard.value.splice(adjustedIndex, 1, ...newGroups);
      }
    } else if (nonJokers.length > 0) {
      const insertIndex = group.findIndex(
        (t) => !t.isJoker && t.number > draggedTile.number,
      );
      if (insertIndex === -1) {
        group.push(draggedTile);
      } else {
        group.splice(insertIndex, 0, draggedTile);
      }
    } else {
      group.push(draggedTile);
    }
  } else {
    workingBoard.value.push([draggedTile]);
  }

  groupKeys.value = generateGroupKeys(workingBoard.value);
  dragOverGroup.value = null;
  draggedTile = null;
}

function onDropNewGroup() {
  if (!draggedTile) return;
  removeTileFromSource();
  cleanEmptyGroups();

  if (draggedTile.isJoker) {
    placeJokerWithContext({ type: "new" });
    dragOverNewGroup.value = false;
    return;
  }

  workingBoard.value.push([draggedTile]);
  groupKeys.value = generateGroupKeys(workingBoard.value);
  dragOverNewGroup.value = false;
  draggedTile = null;
}

function onDropRack() {
  if (!draggedTile) return;
  removeTileFromSource();
  workingRack.value.push(draggedTile);
  cleanEmptyGroups();
  dragOverRack.value = false;
  draggedTile = null;
}

function submitTurn() {
  const snapshotBoardIds = new Set(boardSnapshot.value.flat().map((t) => t.id));
  const currentBoardIds = new Set(workingBoard.value.flat().map((t) => t.id));

  for (const id of snapshotBoardIds) {
    if (!currentBoardIds.has(id)) {
      alert("You cannot remove tiles that were already on the board.");
      cancelTurn();
      return;
    }
  }

  const rackSnapshotIds = new Set(rackSnapshot.value.map((t) => t.id));
  const currentRackIds = new Set(workingRack.value.map((t) => t.id));
  const playedFromRack = [...rackSnapshotIds].some(
    (id) => !currentRackIds.has(id),
  );
  const boardGainedNewTiles = [...currentBoardIds].some(
    (id) => !snapshotBoardIds.has(id),
  );

  if (!playedFromRack && boardGainedNewTiles) {
    alert(
      "You must play at least one tile from your rack if you rearrange the board.",
    );
    cancelTurn();
    return;
  }

  if (!playedFromRack && !boardGainedNewTiles) {
    alert("You must either play a tile or draw.");
    cancelTurn();
    return;
  }

  socket.emit("turn:submit", {
    code: store.roomCode,
    board: workingBoard.value,
    rack: workingRack.value,
  });
}

function drawTile() {
  socket.emit("turn:draw", { code: store.roomCode });
}

function cancelTurn() {
  workingBoard.value = JSON.parse(JSON.stringify(boardSnapshot.value));
  workingRack.value = JSON.parse(JSON.stringify(rackSnapshot.value));
  groupKeys.value = generateGroupKeys(workingBoard.value);
}

function sortRack() {
  if (sortMode.value === "color") {
    workingRack.value = [...workingRack.value].sort((a, b) => {
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      if (a.color !== b.color)
        return COLOR_ORDER[a.color] - COLOR_ORDER[b.color];
      return a.number - b.number;
    });
    sortMode.value = "number";
  } else {
    workingRack.value = [...workingRack.value].sort((a, b) => {
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      if (a.number !== b.number) return a.number - b.number;
      return COLOR_ORDER[a.color] - COLOR_ORDER[b.color];
    });
    sortMode.value = "color";
  }
}

function playAgain() {
  gameOver.value = false;
  gameOverData.value = null;
  router.push("/");
}

socket.on("turn:invalid", ({ reason }) => {
  alert(`Invalid move: ${reason}`);
  cancelTurn();
});

socket.on("game:over", (data) => {
  gameOverData.value = data;
  gameOver.value = true;
});
</script>

<style scoped>
.game {
  display: flex;
  height: 100vh;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
}

.sidebar {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;
}

.player-card {
  background: #16213e;
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.player-card.active {
  border-color: #e94560;
}

.player-name {
  font-weight: bold;
  font-size: 0.95rem;
}

.tile-count {
  font-size: 0.8rem;
  color: #aaa;
}

.melded {
  font-size: 0.75rem;
  color: #4caf50;
}

.pool-info {
  background: #16213e;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #aaa;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.board {
  flex: 1;
  background: #16213e;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-content: flex-start;
  overflow-y: auto;
}

.group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
  background: #0f3460;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  border-radius: 8px;
  align-items: center;
  min-width: 80px;
  min-height: 72px;
  position: relative;
  border: 2px solid transparent;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.group.drag-over {
  border-color: #e94560;
  box-shadow: 0 0 12px rgba(233, 69, 96, 0.4);
}

.group-label {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 0.65rem;
  color: #555;
  font-weight: bold;
}

.new-group-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
  min-height: 72px;
  border: 2px dashed #333;
  border-radius: 8px;
  color: #444;
  font-size: 0.8rem;
  transition:
    border-color 0.15s,
    color 0.15s;
  cursor: default;
}

.new-group-hint.drag-over {
  border-color: #e94560;
  color: #e94560;
}

.server-message {
  text-align: center;
  color: #f39c12;
  font-style: italic;
  font-size: 0.95rem;
  animation: fadeout 4s forwards;
}

@keyframes fadeout {
  0% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-shrink: 0;
}

.waiting {
  text-align: center;
  color: #aaa;
  font-style: italic;
  flex-shrink: 0;
}

button {
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

button:hover {
  opacity: 0.85;
}

.btn-submit {
  background: #4caf50;
  color: white;
}
.btn-draw {
  background: #2196f3;
  color: white;
}
.btn-sort {
  background: #9c27b0;
  color: white;
}
.btn-cancel {
  background: #666;
  color: white;
}

.rack {
  background: #16213e;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  flex-shrink: 0;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}

.rack.drag-over {
  border-color: #2196f3;
}

.rack-label {
  font-size: 0.75rem;
  color: #555;
  display: block;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1rem;
}

.rack-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 72px;
  align-items: center;
}

.rack-empty {
  color: #555;
  font-style: italic;
  font-size: 0.9rem;
}

.group-fade-enter-active,
.group-fade-leave-active {
  transition: all 0.2s ease;
}

.group-fade-enter-from,
.group-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

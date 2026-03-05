import { createTileset, shuffle, dealTiles } from "./tiles.js";
import { isValidBoard, groupScore } from "./validator.js";

function addLog(gameState, message) {
  gameState.log.push({
    message,
    timestamp: Date.now(),
  });
  if (gameState.log.length > 50) gameState.log.shift();
}

export function createGame(players) {
  const pool = shuffle(createTileset());

  const playerStates = {};
  for (const player of players) {
    playerStates[player.id] = {
      id: player.id,
      name: player.name,
      rack: dealTiles(pool, 14),
      hasInitialMeld: false,
    };
  }

  return {
    pool,
    players: playerStates,
    board: [],
    turnOrder: players.map((p) => p.id),
    currentTurn: players[0].id,
    phase: "playing",
    lastPlayedIds: [],
    log: [],
  };
}

export function getPublicState(gameState, socketId) {
  const players = Object.values(gameState.players).map((p) => ({
    id: p.id,
    name: p.name,
    rackCount: p.rack.length,
    hasInitialMeld: p.hasInitialMeld,
  }));

  return {
    board: gameState.board,
    rack: gameState.players[socketId]?.rack || [],
    currentTurn: gameState.currentTurn,
    players,
    poolCount: gameState.pool.length,
    lastPlayedIds: gameState.lastPlayedIds || [],
    log: gameState.log || [],
  };
}

export function nextTurn(gameState) {
  const order = gameState.turnOrder;
  const currentIndex = order.indexOf(gameState.currentTurn);
  const nextIndex = (currentIndex + 1) % order.length;
  gameState.currentTurn = order[nextIndex];
}

export function processTurn(gameState, socketId, proposedBoard, proposedRack) {
  if (gameState.currentTurn !== socketId) {
    return { success: false, reason: "not your turn" };
  }

  if (!isValidBoard(proposedBoard)) {
    return { success: false, reason: "invalid board" };
  }

  const player = gameState.players[socketId];
  const previousBoardTileIds = new Set(gameState.board.flat().map((t) => t.id));
  const proposedBoardTileIds = new Set(proposedBoard.flat().map((t) => t.id));

  if (!player.hasInitialMeld) {
    for (const id of previousBoardTileIds) {
      if (!proposedBoardTileIds.has(id)) {
        return {
          success: false,
          reason: "you cannot use board tiles before your initial meld",
        };
      }
    }

    const rackTileIds = new Set(player.rack.map((t) => t.id));
    const playedFromRack = proposedBoard
      .flat()
      .filter((t) => rackTileIds.has(t.id));
    const playedScore = playedFromRack.reduce((sum, t) => {
      if (t.isJoker && t.represents) return sum + t.represents.number;
      if (t.isJoker) return sum + 30;
      return sum + t.number;
    }, 0);

    if (playedScore < 30) {
      return { success: false, reason: "initial meld must total at least 30" };
    }

    for (const id of previousBoardTileIds) {
      if (!proposedBoardTileIds.has(id)) {
        return {
          success: false,
          reason:
            "you cannot remove existing board tiles before your initial meld",
        };
      }
    }

    player.hasInitialMeld = true;
  }

  const previousBoardIds = new Set(gameState.board.flat().map((t) => t.id));
  const newlyPlayedIds = proposedBoard
    .flat()
    .map((t) => t.id)
    .filter((id) => !previousBoardIds.has(id));

  gameState.lastPlayedIds = newlyPlayedIds;
  gameState.board = proposedBoard;
  player.rack = proposedRack;

  addLog(
    gameState,
    `${player.name} played ${newlyPlayedIds.length} tile${newlyPlayedIds.length !== 1 ? "s" : ""}`,
  );

  if (player.rack.length === 0) {
    gameState.phase = "finished";
    gameState.winner = socketId;
    addLog(gameState, `🎉 ${player.name} wins!`);
    return { success: true, finished: true, winner: socketId };
  }

  nextTurn(gameState);
  return { success: true, finished: false };
}

export function drawTile(gameState, socketId) {
  if (gameState.currentTurn !== socketId) {
    return { success: false, reason: "not your turn" };
  }

  if (gameState.pool.length === 0) {
    return { success: false, reason: "pool is empty" };
  }

  const tile = gameState.pool.splice(0, 1)[0];
  gameState.players[socketId].rack.push(tile);
  addLog(gameState, `${gameState.players[socketId].name} drew a tile`);
  nextTurn(gameState);
  return { success: true, tile };
}

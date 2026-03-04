const COLORS = ["red", "blue", "yellow", "black"];

export function createTileset() {
  const tiles = [];

  for (let copy = 0; copy < 2; copy++) {
    for (const color of COLORS) {
      for (let number = 1; number <= 13; number++) {
        tiles.push({
          id: `${color}-${number}-${copy}`,
          color,
          number,
          isJoker: false,
        });
      }
    }
  }

  tiles.push({ id: "joker-0", color: null, number: null, isJoker: true });
  tiles.push({ id: "joker-1", color: null, number: null, isJoker: true });

  return tiles;
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealTiles(pool, count) {
  const hand = pool.splice(0, count);
  return hand;
}

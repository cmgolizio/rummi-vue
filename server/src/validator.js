function resolvedNumber(tile) {
  if (!tile.isJoker) return tile.number;
  if (tile.represents) return tile.represents.number;
  return null;
}

function isValidRun(group) {
  const nonJokers = group.filter((t) => !t.isJoker);
  if (nonJokers.length === 0) return false;

  const color = nonJokers[0].color;
  if (!nonJokers.every((t) => t.color === color)) return false;

  const resolved = group
    .map((t) => resolvedNumber(t))
    .filter((n) => n !== null);

  if (resolved.length !== group.length) {
    const jokerCount = group.filter((t) => t.isJoker && !t.represents).length;
    const knownNumbers = group
      .filter((t) => !t.isJoker || t.represents)
      .map((t) => resolvedNumber(t))
      .sort((a, b) => a - b);

    if (knownNumbers.length === 0) return false;

    const min = knownNumbers[0];
    const max = knownNumbers[knownNumbers.length - 1];
    const expectedLength = group.length;
    const expectedMax = min + expectedLength - 1;

    if (expectedMax > 13) return false;

    const uniqueKnown = new Set(knownNumbers);
    if (uniqueKnown.size !== knownNumbers.length) return false;

    return true;
  }

  const sorted = [...resolved].sort((a, b) => a - b);
  const uniqueSorted = new Set(sorted);
  if (uniqueSorted.size !== sorted.length) return false;
  if (sorted[sorted.length - 1] - sorted[0] !== sorted.length - 1) return false;
  if (sorted[sorted.length - 1] > 13) return false;

  return true;
}

function isValidSet(group) {
  const nonJokers = group.filter((t) => !t.isJoker);
  if (nonJokers.length === 0) return false;

  const number = nonJokers[0].number;
  if (!nonJokers.every((t) => t.number === number)) return false;

  const colors = nonJokers.map((t) => t.color);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size !== colors.length) return false;

  if (group.length > 4) return false;

  return true;
}

export function isValidGroup(group) {
  if (group.length < 3) return false;
  return isValidRun(group) || isValidSet(group);
}

export function isValidBoard(board) {
  return board.every((group) => isValidGroup(group));
}

export function groupScore(group) {
  return group.reduce((sum, t) => {
    if (t.isJoker && t.represents) return sum + t.represents.number;
    if (t.isJoker) return sum + 30;
    return sum + t.number;
  }, 0);
}

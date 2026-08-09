const STOCK_EPSILON = 0.0005;

export function calculateAvailableStock(
  currentQuantity: number,
  committedQuantity: number,
  ownCommitment = 0,
): number {
  return Math.max(
    0,
    currentQuantity - committedQuantity + ownCommitment,
  );
}

export function hasSufficientStock(
  requestedQuantity: number,
  availableQuantity: number,
): boolean {
  return requestedQuantity <= availableQuantity + STOCK_EPSILON;
}

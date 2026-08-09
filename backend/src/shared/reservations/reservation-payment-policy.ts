export const RESERVATION_PAYMENT_EPSILON = 0.001;

export function calculateRemainingRequiredAdvance(
  requiredAdvance: number,
  committedPayments: number,
): number {
  return Math.max(
    0,
    requiredAdvance - committedPayments,
  );
}

export function hasOutstandingRequiredAdvance(
  remainingAdvance: number,
): boolean {
  return remainingAdvance > RESERVATION_PAYMENT_EPSILON;
}

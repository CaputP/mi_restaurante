export const PRE_DELIVERY_PAYABLE_ORDER_STATES = [
  "ENVIADO",
  "EN_PREPARACION",
  "LISTO",
  "ENTREGA_PARCIAL",
] as const;

export const PAYABLE_ORDER_STATES = [
  ...PRE_DELIVERY_PAYABLE_ORDER_STATES,
  "ENTREGADO",
] as const;

export type PayableOrderState =
  (typeof PAYABLE_ORDER_STATES)[number];

export function isOrderPayable(
  status: string,
): status is PayableOrderState {
  return (
    PAYABLE_ORDER_STATES as readonly string[]
  ).includes(status);
}

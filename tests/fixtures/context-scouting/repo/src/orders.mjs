import { enqueueDelivery } from "./delivery.mjs";

export function submitOrder(order) {
  if (!Number.isInteger(order.quantity) || order.quantity < 1) {
    throw new RangeError("Order quantity must be a positive integer");
  }
  return enqueueDelivery({ orderId: order.id, units: order.quantity });
}

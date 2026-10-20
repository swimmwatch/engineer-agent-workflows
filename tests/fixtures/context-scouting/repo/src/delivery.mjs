export const deliveryQueue = [];

export function enqueueDelivery(delivery) {
  const entry = { ...delivery, status: "pending" };
  deliveryQueue.push(entry);
  return entry;
}

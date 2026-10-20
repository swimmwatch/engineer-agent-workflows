import assert from "node:assert/strict";
import test from "node:test";
import { deliveryQueue } from "../src/delivery.mjs";
import { submitOrder } from "../src/orders.mjs";

test("accepted order reaches the delivery queue", () => {
  const entry = submitOrder({ id: "order-1", quantity: 2 });
  assert.deepEqual(entry, { orderId: "order-1", units: 2, status: "pending" });
  assert.equal(deliveryQueue.at(-1), entry);
});

test("invalid quantity does not enqueue a delivery", () => {
  const before = deliveryQueue.length;
  assert.throws(() => submitOrder({ id: "order-2", quantity: 0 }), RangeError);
  assert.equal(deliveryQueue.length, before);
});

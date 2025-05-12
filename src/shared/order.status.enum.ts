export enum OrderStatus {
  PENDING = 'PENDING', // Waiting to be taken over by a driver.
  IN_CENTRAL_WAREHOUSE = 'IN_CENTRAL_WAREHOUSE', // The package is in a central warehouse.
  ASSIGNED = 'ASSIGNED', // Assigned to a driver.
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', // Currently being delivered.
  DELIVERED = 'DELIVERED', // Successfully delivered.
  DELIVERY_FAILED = 'DELIVERY_FAILED', // Delivery attempt failed (e.g., customer not found, incorrect address, etc.).
  RETURNED = 'RETURNED', // Returned to partner (if undeliverable).
  CANCELED = 'CANCELED', // Canceled by the customer or partner.
  PENDING_RESOLUTION = 'PENDING_RESOLUTION', // Waiting for resolution of an issue (e.g., damaged package).
  FOLLOW_UP = 'FOLLOW_UP', // Follow-up after a failed attempt.
  DELAYED = 'DELAYED', // Delivery delayed (e.g., due to weather conditions).
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED', // Part of the package has been delivered.
  IN_WAREHOUSE = 'IN_WAREHOUSE', // Temporarily stored in a warehouse.
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION', // Waiting for customer confirmation after a delivery attempt.
  VERIFICATION = 'VERIFICATION', // Under verification (e.g., identity, contents, etc.).
}

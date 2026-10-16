'use strict';

class PaymentStatus {
  /** @param {any} data */
  constructor(data) {
    this.id = Number(data.id);
    this.amount = Number(data.amount);
    this.status = String(data.status);
    this.createdAt = String(data.created_at);
    this.paidAt = data.paid_at ?? null;
  }

  isPaid() {
    return this.status === 'paid';
  }

  isPending() {
    return this.status === 'pending';
  }
}

module.exports = PaymentStatus;

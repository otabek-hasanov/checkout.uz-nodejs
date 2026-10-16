'use strict';

class PaymentStatusV2 {
  /** @param {any} data */
  constructor(data) {
    this.id = Number(data.id);
    this.amount = Number(data.amount);
    this.description = String(data.description || '');
    this.status = String(data.status);
    this.createdAt = String(data.created_at);
    this.paidAt = data.paid_at ?? null;
    /** Payment system the order was actually paid through (payme/click/plum/...), null if unpaid. */
    this.provider = data.provider ?? null;
  }

  isPaid() {
    return this.status === 'paid';
  }

  isPending() {
    return this.status === 'pending';
  }

  isCanceled() {
    return this.status === 'canceled';
  }
}

module.exports = PaymentStatusV2;

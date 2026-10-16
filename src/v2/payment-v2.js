'use strict';

class PaymentV2 {
  /**
   * @param {any} payment
   * @param {boolean} [idempotentReplay]
   */
  constructor(payment, idempotentReplay = false) {
    this.id = Number(payment._id);
    this.uuid = String(payment._uuid);
    this.url = String(payment._url);
    this.amount = Number(payment._amount);
    this.status = String(payment._status);
    this.payVia = payment._pay_via || {};
    this.returnUrl = payment._return_url ?? null;
    this.lifetime = payment._lifteme || {};
    this.idempotentReplay = idempotentReplay;
  }

  isPending() {
    return this.status === 'pending';
  }

  isPaid() {
    return this.status === 'paid';
  }

  /**
   * True if this response is a replay of a previously created invoice,
   * returned because the same Idempotency-Key was reused.
   */
  isIdempotentReplay() {
    return this.idempotentReplay;
  }
}

module.exports = PaymentV2;

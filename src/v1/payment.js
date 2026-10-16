'use strict';

class Payment {
  /** @param {any} data */
  constructor(data) {
    this.id = Number(data._id);
    this.uuid = String(data._uuid);
    this.url = String(data._url);
    this.amount = Number(data._amount);
    this.status = String(data._status);
    this.lifetime = data._lifteme || {};
  }

  isPending() {
    return this.status === 'pending';
  }

  isPaid() {
    return this.status === 'paid';
  }
}

module.exports = Payment;

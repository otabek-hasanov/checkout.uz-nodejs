'use strict';

class Stats {
  /** @param {any} data */
  constructor(data) {
    this.totalOrders = Number(data.total_orders);
    this.totalAmount = Number(data.total_amount);
  }
}

module.exports = Stats;

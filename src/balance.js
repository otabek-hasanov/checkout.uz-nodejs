'use strict';

class Balance {
  /** @param {Record<string, number>} data */
  constructor(data) {
    this._data = data || {};
    this._lower = {};
    for (const key of Object.keys(this._data)) {
      this._lower[key.toLowerCase()] = this._data[key];
    }
  }

  /**
   * Get balance by currency code - case-insensitive. checkout.uz currently
   * only operates in UZS; use getUzs() for that.
   * @param {string} currency
   * @returns {number}
   */
  get(currency) {
    const key = String(currency).toLowerCase();
    return this._lower[key] !== undefined ? Number(this._lower[key]) : 0;
  }

  /** Balance in UZS (so'm) - the only currency checkout.uz currently supports. */
  getUzs() {
    return this.get('uzs');
  }

  all() {
    return this._data;
  }
}

module.exports = Balance;

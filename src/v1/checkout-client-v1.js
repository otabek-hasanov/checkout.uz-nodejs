'use strict';

const HttpClient = require('../http-client');
const Balance = require('../balance');
const Payment = require('./payment');
const PaymentStatus = require('./payment-status');
const Stats = require('./stats');
const { ApiError } = require('../errors');

const BASE_URL = 'https://checkout.uz/api/v1';

/**
 * Client for checkout.uz API v1 (https://checkout.uz/api/v1).
 */
class CheckoutClientV1 {
  /**
   * @param {string} apiKey
   * @param {number} [timeoutMs]
   */
  constructor(apiKey, timeoutMs = 30000) {
    this.http = new HttpClient(BASE_URL, apiKey, timeoutMs);
  }

  /**
   * Create a new payment invoice.
   * @param {number} amount
   * @param {string} [description]
   * @returns {Promise<Payment>}
   */
  async createPayment(amount, description = '') {
    const body = { amount };
    if (description !== '') body.description = description;

    const res = await this.http.post('/create_payment', body);
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to create payment: ${JSON.stringify(res)}`);
    }
    return new Payment(res.payment);
  }

  /** @param {number} id @returns {Promise<PaymentStatus>} */
  async getStatusById(id) {
    return this._fetchStatus({ id });
  }

  /** @param {string} uuid @returns {Promise<PaymentStatus>} */
  async getStatusByUuid(uuid) {
    return this._fetchStatus({ uuid });
  }

  /**
   * Start a direct card payment (step 1: sends SMS code to the card holder).
   * @param {number} orderId @param {string} cardNumber @param {string} cardExpiry
   */
  async payViaCard(orderId, cardNumber, cardExpiry) {
    const res = await this.http.post('/pay_via_card', {
      order_id: orderId,
      card_number: cardNumber,
      card_expiry: cardExpiry,
    });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to start card payment: ${JSON.stringify(res)}`);
    }
    return res;
  }

  /**
   * Confirm a direct card payment (step 2: SMS code).
   * @param {string} paymentToken @param {string} smsCode
   */
  async confirmCardPayment(paymentToken, smsCode) {
    const res = await this.http.post('/confirm_card_payment', {
      payment_token: paymentToken,
      sms_code: smsCode,
    });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to confirm card payment: ${JSON.stringify(res)}`);
    }
    return res;
  }

  /** @returns {Promise<Balance>} */
  async getBalance() {
    const res = await this.http.post('/get_balance');
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get balance: ${JSON.stringify(res)}`);
    }
    return new Balance(res.balance);
  }

  /** @param {number} [limit] @returns {Promise<any[]>} Raw transactions array */
  async getHistory(limit = 10) {
    const res = await this.http.post('/get_history', { limit });
    return res.data ?? res;
  }

  /** @returns {Promise<Stats>} */
  async getStats() {
    const res = await this.http.post('/get_stats');
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get stats: ${JSON.stringify(res)}`);
    }
    return new Stats(res.stats);
  }

  /**
   * Fetch the fiscal (tax) receipt for a paid order (Payme/Click/Plum).
   * @param {number} orderId
   */
  async getFiscal(orderId) {
    const res = await this.http.post('/get_fiscal', { order_id: orderId });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get fiscal receipt: ${JSON.stringify(res)}`);
    }
    return res;
  }

  /** @private */
  async _fetchStatus(body) {
    const res = await this.http.post('/status_payment', body);
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get payment status: ${JSON.stringify(res)}`);
    }
    return new PaymentStatus(res.data);
  }
}

module.exports = CheckoutClientV1;

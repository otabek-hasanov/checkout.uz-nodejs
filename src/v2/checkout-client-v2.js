'use strict';

const HttpClient = require('../http-client');
const Balance = require('../balance');
const PaymentV2 = require('./payment-v2');
const PaymentStatusV2 = require('./payment-status-v2');
const { ApiError } = require('../errors');

const BASE_URL = 'https://checkout.uz/api/v2';

function withoutNullish(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== null && obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

/**
 * Client for checkout.uz API v2 (https://checkout.uz/api/v2).
 *
 * v2 adds: optional expire_time/webhook_url/return_url/idempotency_key on
 * create_payment, refund_payment/cancel_payment, richer status_payment
 * (provider/description), and account-level ("profile") endpoints.
 *
 * Pass your SHOP api_key for shop-scoped methods (payments, balance,
 * history, stats, withdrawals history, fiscal receipts) and your
 * ACCOUNT-level profile_api_key for profile-scoped methods (verifyCard,
 * createWithdrawalRequest, getProfile, getShops, getProfileStats).
 */
class CheckoutClientV2 {
  /**
   * @param {string} apiKey
   * @param {number} [timeoutMs]
   */
  constructor(apiKey, timeoutMs = 30000) {
    this.http = new HttpClient(BASE_URL, apiKey, timeoutMs);
  }

  // ==================== To'lovlar ====================

  /**
   * Create a new payment invoice. Auth: shop.
   *
   * `options` supports:
   *  - expireTime (number, seconds, 60-432000, default 3600)
   *  - webhookUrl (string)
   *  - returnUrl (string)
   *  - idempotencyKey (string) - sent as an "Idempotency-Key" header, NOT
   *    in the body. If the same key was used for this shop within the last
   *    24 hours, the previously created invoice is returned instead of a
   *    new one (see PaymentV2#isIdempotentReplay()).
   *
   * @param {number} amount
   * @param {string} [description]
   * @param {{expireTime?: number, webhookUrl?: string, returnUrl?: string, idempotencyKey?: string}} [options]
   * @returns {Promise<PaymentV2>}
   */
  async createPayment(amount, description = '', options = {}) {
    const body = { amount };
    if (description !== '') body.description = description;
    if (options.expireTime !== undefined) body.expire_time = options.expireTime;
    if (options.webhookUrl !== undefined) body.webhook_url = options.webhookUrl;
    if (options.returnUrl !== undefined) body.return_url = options.returnUrl;

    const headers = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = String(options.idempotencyKey);

    const res = await this.http.post('/create_payment', body, headers);
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to create payment: ${JSON.stringify(res)}`);
    }
    return new PaymentV2(res.payment, Boolean(res.idempotent_replay));
  }

  /** Check payment status by ID. Auth: shop. @param {number} id @returns {Promise<PaymentStatusV2>} */
  async getStatusById(id) {
    return this._fetchStatus({ id });
  }

  /** Check payment status by UUID. Auth: shop. @param {string} uuid @returns {Promise<PaymentStatusV2>} */
  async getStatusByUuid(uuid) {
    return this._fetchStatus({ uuid });
  }

  /** Start a direct card payment (step 1: sends SMS code). Auth: shop. */
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

  /** Confirm a direct card payment (step 2: SMS code). Auth: shop. */
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

  // ==================== Qaytarish va bekor qilish ====================

  /** Refund a paid order (Plum/Payme/Click only, within 22h of payment). Auth: shop. */
  async refundPayment(orderId) {
    const res = await this.http.post('/refund_payment', { order_id: orderId });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to refund payment: ${JSON.stringify(res)}`);
    }
    return res;
  }

  /** Cancel a pending (unpaid) invoice. Auth: shop. */
  async cancelPayment(orderId) {
    const res = await this.http.post('/cancel_payment', { order_id: orderId });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to cancel payment: ${JSON.stringify(res)}`);
    }
    return res;
  }

  // ==================== Hisobot ====================

  /** Get merchant balance. Auth: shop. @returns {Promise<Balance>} */
  async getBalance() {
    const res = await this.http.post('/get_balance');
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get balance: ${JSON.stringify(res)}`);
    }
    return new Balance(res.balance);
  }

  /**
   * Get transaction history. Auth: shop.
   * @param {{limit?: number, offset?: number, status?: string, dateFrom?: string, dateTo?: string}} [options]
   */
  async getHistory(options = {}) {
    const { limit = 10, offset = 0, status, dateFrom, dateTo } = options;
    return this.http.post(
      '/get_history',
      withoutNullish({ limit, offset, status, date_from: dateFrom, date_to: dateTo })
    );
  }

  /**
   * Get merchant statistics. Auth: shop.
   * @param {{dateFrom?: string, dateTo?: string}} [options]
   */
  async getStats(options = {}) {
    return this.http.post('/get_stats', withoutNullish({ date_from: options.dateFrom, date_to: options.dateTo }));
  }

  /** Get active payment methods for this shop. Auth: shop. */
  async getPaymentMethods() {
    return this.http.post('/get_payment_methods');
  }

  // ==================== Pul yechish ====================

  /** Get available withdrawal methods. Auth: shop or profile. @param {string} [currency] */
  async getWithdrawalMethods(currency) {
    return this.http.post('/get_withdrawal_methods', currency ? { currency } : {});
  }

  /**
   * Verify that a card belongs to the authenticated account owner before
   * withdrawing to it. Auth: profile.
   */
  async verifyCard(cardNumber) {
    return this.http.post('/verify_card', { card_number: cardNumber });
  }

  /**
   * Create a withdrawal request. Auth: profile (dual-key: profile_api_key
   * via Authorization header + the target shop's own api_key as
   * shopToken, to prove you also control that specific shop).
   *
   * `fields` must match the withdrawal method's required field names (see
   * getWithdrawalMethods()), e.g. { card_number: '8600...' }.
   *
   * @param {number} shopId @param {string} shopToken @param {number} methodId
   * @param {number} amount @param {string} currency @param {Record<string, string>} fields
   */
  async createWithdrawalRequest(shopId, shopToken, methodId, amount, currency, fields) {
    const res = await this.http.post('/create_withdrawal_request', {
      shop_id: shopId,
      shop_token: shopToken,
      method_id: methodId,
      amount,
      currency,
      fields,
    });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to create withdrawal request: ${JSON.stringify(res)}`);
    }
    return res;
  }

  /**
   * Get withdrawal request history for this shop. Auth: shop.
   * @param {{limit?: number, offset?: number, status?: string, dateFrom?: string, dateTo?: string}} [options]
   */
  async getWithdrawals(options = {}) {
    const { limit = 10, offset = 0, status, dateFrom, dateTo } = options;
    return this.http.post(
      '/get_withdrawals',
      withoutNullish({ limit, offset, status, date_from: dateFrom, date_to: dateTo })
    );
  }

  // ==================== Fiskal chek ====================

  /** Fetch the fiscal (tax) receipt for a paid order. Auth: shop. */
  async getFiscal(orderId) {
    const res = await this.http.post('/get_fiscal', { order_id: orderId });
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get fiscal receipt: ${JSON.stringify(res)}`);
    }
    return res;
  }

  // ==================== Profil (hisob darajasida) ====================

  /** Get the authenticated account's profile. Auth: profile. */
  async getProfile() {
    return this.http.post('/get_profile');
  }

  /** List all shops owned by the authenticated account. Auth: profile. */
  async getShops() {
    return this.http.post('/get_shops');
  }

  /**
   * Aggregated statistics across all of the account's shops. Auth: profile.
   * @param {{dateFrom?: string, dateTo?: string}} [options]
   */
  async getProfileStats(options = {}) {
    return this.http.post(
      '/get_profile_stats',
      withoutNullish({ date_from: options.dateFrom, date_to: options.dateTo })
    );
  }

  /** @private */
  async _fetchStatus(body) {
    const res = await this.http.post('/status_payment', body);
    if ((res && res.status) !== 'success') {
      throw new ApiError(`Failed to get payment status: ${JSON.stringify(res)}`);
    }
    return new PaymentStatusV2(res.data);
  }
}

module.exports = CheckoutClientV2;

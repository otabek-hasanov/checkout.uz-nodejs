'use strict';

const ProviderDetails = require('./provider-details');

/**
 * Represents the parsed webhook payload sent by checkout.uz.
 */
class WebhookPayload {
  /** @param {any} payload */
  constructor(payload) {
    this.webhookType = String(payload.webhook_type || '');
    this.status = String(payload.status || '');
    this.event = String(payload.event || '');
    this.paymentSystem = String(payload.payment_system || '');
    this.shopId = Number(payload.shop_id || 0);
    this.timestamp = Number(payload.timestamp || 0);

    const data = payload.data || {};
    this.rawData = data;
    this.orderId = Number(data.order_id || 0);
    this.amount = Number(data.amount || 0);
    this.currency = String(data.currency || '');
    this.paymentStatus = String(data.status || '');

    this.providerDetails = new ProviderDetails(data.provider_details || {});
  }

  isSuccess() {
    return this.status === 'success';
  }

  isPaid() {
    return this.paymentStatus === 'paid';
  }

  isPaymentConfirmed() {
    return this.event === 'payment_confirmed';
  }
}

module.exports = WebhookPayload;

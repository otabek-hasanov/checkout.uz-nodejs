'use strict';

class CheckoutError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ApiError extends CheckoutError {}
class WebhookError extends CheckoutError {}

module.exports = { CheckoutError, ApiError, WebhookError };

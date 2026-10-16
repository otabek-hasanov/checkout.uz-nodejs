'use strict';

const WebhookPayload = require('./webhook-payload');
const { WebhookError } = require('../errors');

class WebhookHandler {
  /**
   * Read and parse the raw request body from a Node `http.IncomingMessage`
   * (works with the plain `http`/`https` modules AND with Express/Koa,
   * as long as no body-parsing middleware has already consumed the stream).
   *
   * @param {import('http').IncomingMessage} req
   * @returns {Promise<WebhookPayload>}
   */
  async capture(req) {
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    if (!raw) {
      throw new WebhookError('Empty webhook payload received.');
    }

    return this.parse(raw);
  }

  /**
   * Parse a webhook from a raw JSON string (use this if your framework -
   * e.g. Express with express.json()/express.text() - already read the body
   * for you).
   *
   * @param {string} rawJson
   * @returns {WebhookPayload}
   */
  parse(rawJson) {
    let data;
    try {
      data = JSON.parse(rawJson);
    } catch (err) {
      throw new WebhookError(`Invalid JSON: ${err.message}`);
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new WebhookError('Webhook payload must be a JSON object.');
    }

    return new WebhookPayload(data);
  }

  /**
   * Respond to checkout.uz with HTTP 200 OK and a JSON success body.
   * Call this after you have successfully processed the webhook.
   *
   * @param {import('http').ServerResponse} res
   */
  respond(res) {
    if (!res.headersSent) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ status: 'ok' }));
  }
}

module.exports = WebhookHandler;

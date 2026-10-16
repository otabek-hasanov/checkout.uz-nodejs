'use strict';

const { ApiError } = require('./errors');

class HttpClient {
  /**
   * @param {string} baseUrl
   * @param {string} apiKey
   * @param {number} timeoutMs
   */
  constructor(baseUrl, apiKey, timeoutMs = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /**
   * @param {string} endpoint
   * @param {Record<string, any>} [body]
   * @param {Record<string, string>} [extraHeaders] e.g. { 'Idempotency-Key': 'order-123' }
   * @returns {Promise<any>}
   */
  async post(endpoint, body = {}, extraHeaders = {}) {
    const url = `${this.baseUrl}/${String(endpoint).replace(/^\//, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new ApiError(`Network error: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 403) {
      throw new ApiError('Access denied: IP not whitelisted or invalid API key.');
    }

    let decoded;
    try {
      decoded = await res.json();
    } catch (err) {
      throw new ApiError('Invalid JSON response from API.');
    }

    return decoded;
  }
}

module.exports = HttpClient;

'use strict';

/**
 * Example: Webhook qabul qilish endpointi (sof Node `http` moduli bilan,
 * hech qanday qo'shimcha paket talab qilmaydi).
 *
 * Bu URL'ni checkout.uz dashboard'ida webhook URL sifatida ko'rsating.
 *
 * Express ishlatsangiz ham xuddi shunday ishlaydi - handler.capture(req)
 * `req`ni to'g'ridan-to'g'ri o'qiydi, shuning uchun bu middleware'dan OLDIN
 * chaqirilishi kerak (express.json()/express.urlencoded() ishlatmang bu
 * route uchun, aks holda body allaqachon o'qib bo'linadi).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebhookHandler, WebhookError } = require('../src');

const handler = new WebhookHandler();

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404).end();
    return;
  }

  try {
    const payload = await handler.capture(req);

    if (!payload.isSuccess() || !payload.isPaymentConfirmed()) {
      handler.respond(res);
      return;
    }

    const orderId = payload.orderId;
    const amount = payload.amount;
    const currency = payload.currency;
    const system = payload.paymentSystem; // click, payme, uzcard ...

    // provider_details - to'lov tizimi yuborgan har qanday field
    const details = payload.providerDetails;

    // Click uchun misol (boshqa tizimlar o'z fieldlarini yuboradi)
    const transId = details.click_trans_id;
    const serviceId = details.service_id;
    const signString = details.sign_string;
    const error = details.error;
    const errorNote = details.error_note;

    const log = `[${new Date().toISOString()}] Order #${orderId} | ${amount} ${currency} | System: ${system} | Trans: ${transId} | Error: ${error} (${errorNote})\n`;
    fs.appendFileSync(path.join(__dirname, 'webhook.log'), log);

    // Buyurtmani tasdiqlash (o'z logikangiz):
    // await markOrderAsPaid(orderId, amount);

    handler.respond(res); // checkout.uz ga 200 OK qaytarish - majburiy!
  } catch (err) {
    if (err instanceof WebhookError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    throw err;
  }
});

server.listen(3000, () => console.log('Webhook server: http://localhost:3000/webhook'));

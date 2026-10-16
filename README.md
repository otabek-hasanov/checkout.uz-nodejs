# Checkout.uz Node.js SDK

Node.js (>=18) SDK for [checkout.uz](https://checkout.uz) payment gateway.

Qo'llab-quvvatlaydi **API v1** va **API v2** (ikkisi ham bitta paket ichida,
alohida klasslar bilan) + webhook qabul qilish. Tashqi dependency YO'Q -
Node'ning o'z built-in `fetch`'idan foydalanadi.

---

## Yuklab olish

```bash
npm install checkout-uz
```

yoki to'g'ridan-to'g'ri GitHub'dan:

```bash
npm install github:otabek-hasanov/checkout.uz-nodejs
```

---

## v1 yoki v2 - qaysi birini ishlatish kerak?

| | v1 | v2 |
|---|---|---|
| Klass | `CheckoutClientV1` | `CheckoutClientV2` |
| Asos URL | `https://checkout.uz/api/v1` | `https://checkout.uz/api/v2` |
| To'lov yaratishda `expireTime`/`webhookUrl`/`returnUrl` | yo'q | bor |
| `idempotencyKey` (takroriy so'rovdan himoya) | yo'q | bor |
| `refundPayment` / `cancelPayment` | yo'q | bor |
| `getStatusById`/`getStatusByUuid` javobida `provider`/`description` | yo'q | bor |
| Profil darajasidagi endpointlar (`getProfile`, `getShops`) | yo'q | bor |

Yangi integratsiyalar uchun **v2** tavsiya etiladi.

---

## v1 - Tezkor boshlash

```js
const { CheckoutClientV1 } = require('checkout-uz');

const client = new CheckoutClientV1('YOUR_API_KEY');
```

### To'lov yaratish

```js
const payment = await client.createPayment(50000, 'Order #12345');

console.log(payment.id);     // 152
console.log(payment.uuid);   // 550e8400-e29b-41d4-a716-446655440000
console.log(payment.url);    // https://checkout.uz/pay/...
console.log(payment.amount); // 50000
console.log(payment.status); // pending

// foydalanuvchini to'lov sahifasiga yo'naltirish (Express misoli):
// res.redirect(payment.url);
```

### To'lov holatini tekshirish

```js
// ID orqali
const status = await client.getStatusById(152);

// UUID orqali
const status2 = await client.getStatusByUuid('550e8400-e29b-41d4-a716-446655440000');

console.log(status.status);    // paid
console.log(status.createdAt); // 2026-01-31 10:00:00
console.log(status.paidAt);    // 2026-01-31 10:05:22

if (status.isPaid()) {
  // buyurtma to'langan
}
```

### Balansni tekshirish

checkout.uz hozircha faqat **UZS** (so'm) bilan ishlaydi.

```js
const balance = await client.getBalance();
console.log(balance.getUzs()); // 2500000
console.log(balance.all());    // xom javob, masalan { UZS: 2500000 }
```

### Tranzaksiyalar tarixi va statistika

```js
const history = await client.getHistory(20); // limit = 20
for (const tx of history) {
  console.log(tx.id, '-', tx.amount);
}

const stats = await client.getStats();
console.log(stats.totalOrders); // 450
console.log(stats.totalAmount); // 12500000.5
```

### Karta orqali to'g'ridan-to'g'ri to'lov

```js
// 1-qadam: SMS kod yuborish
const resp = await client.payViaCard(orderId, '8600123412341234', '12/28');
const paymentToken = resp.payment_token;

// 2-qadam: SMS kod bilan tasdiqlash
await client.confirmCardPayment(paymentToken, '123456');
```

### Fiskal (soliq) chek

```js
const fiscal = await client.getFiscal(orderId); // Payme, Click, Plum orqali to'langan buyurtmalar uchun
```

---

## v2 - Tezkor boshlash

```js
const { CheckoutClientV2 } = require('checkout-uz');

const client = new CheckoutClientV2('YOUR_SHOP_API_KEY');
```

### To'lov yaratish (idempotency bilan)

```js
const payment = await client.createPayment(50000, 'Order #12345', {
  expireTime: 86400,                       // ixtiyoriy, sekundda (standart 3600)
  webhookUrl: 'https://site.com/webhook',  // ixtiyoriy, qo'shimcha webhook
  returnUrl: 'https://site.com/thanks',    // ixtiyoriy
  idempotencyKey: 'order-12345',           // ixtiyoriy, lekin TAVSIYA ETILADI
});

console.log(payment.id);
console.log(payment.url);
console.log(payment.payVia); // { payme: '...', click: '...' }

// Agar shu idempotencyKey bilan so'nggi 24 soatda allaqachon invoice
// yaratilgan bo'lsa - yangisi ochilmaydi, ESKISI qaytariladi:
if (payment.isIdempotentReplay()) {
  // ...
}
```

`idempotencyKey` berilsa, tarmoq xatosi yoki qayta urinish tufayli so'rov
ikki marta yuborilib qolsa ham, bitta buyurtma uchun ikki marta invoys
ochilmaydi - bu kalit JSON tanasida emas, `Idempotency-Key` HTTP sarlavhasi
orqali yuboriladi (SDK buni avtomatik qiladi).

### To'lov holatini tekshirish

```js
const status = await client.getStatusById(152);
// yoki: await client.getStatusByUuid('550e8400-...');

console.log(status.status);      // paid
console.log(status.provider);    // click (qaysi tizim orqali to'langani)
console.log(status.description); // createPayment'da berilgan izoh
```

### Qaytarish va bekor qilish (YANGI, faqat v2'da)

```js
await client.cancelPayment(orderId); // hali to'lanmagan invoysni bekor qilish
await client.refundPayment(orderId); // to'langan to'lovni qaytarish (Plum/Payme/Click, 22 soat ichida)
```

### Balans, tarix, statistika

```js
console.log((await client.getBalance()).getUzs());

const history = await client.getHistory({ limit: 20, dateFrom: '2026-10-01', dateTo: '2026-10-31' });
const stats   = await client.getStats({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
const methods = await client.getPaymentMethods();
```

### Pul yechish

```js
const methods = await client.getWithdrawalMethods('UZS');

// Profil darajasida (profile_api_key bilan alohida klient):
const profileClient = new CheckoutClientV2('YOUR_PROFILE_API_KEY');
await profileClient.verifyCard('8600123412341234');

await profileClient.createWithdrawalRequest(
  shopId,
  shopApiKey, // shu kassaning o'z api_key'i, qo'shimcha isbot sifatida
  methodId,
  50000,
  'UZS',
  { card_number: '8600123412341234' }
);

const withdrawals = await client.getWithdrawals({ limit: 10 }); // shop-darajasida
```

### Fiskal chek

```js
const fiscal = await client.getFiscal(orderId);
```

### Profil darajasidagi endpointlar

```js
const profileClient = new CheckoutClientV2('YOUR_PROFILE_API_KEY');

const profile = await profileClient.getProfile();
const shops   = await profileClient.getShops();
const stats   = await profileClient.getProfileStats({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
```

---

## Webhook Handling

checkout.uz sizga webhook ma'lumot yuborganida uni ushbu ko'rinishda qabul
qilib olasiz (v1 va v2 uchun bir xil):

```js
const http = require('http');
const { WebhookHandler, WebhookError } = require('checkout-uz');

const handler = new WebhookHandler();

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404).end();
    return;
  }

  try {
    const payload = await handler.capture(req); // req'ning o'zidan o'qiydi

    if (payload.isSuccess() && payload.isPaymentConfirmed()) {
      const orderId  = payload.orderId;   // 3
      const amount   = payload.amount;    // 5000
      const currency = payload.currency;  // UZS
      const system   = payload.paymentSystem; // click

      // provider_details dagi ma'lumotlarni olish
      const details = payload.providerDetails;
      console.log(details.service_id);     // 78828
      console.log(details.click_trans_id); // 3529269357
      console.log(details.sign_string);    // 7826a6940de7...

      // bu yerda sizning logikangiz bo'ladi, masalan:
      // await markOrderAsPaid(orderId, amount);
    }

    handler.respond(res); // HTTP 200 qaytarish - majburiy!
  } catch (err) {
    if (err instanceof WebhookError) {
      res.writeHead(400).end(JSON.stringify({ error: err.message }));
      return;
    }
    throw err;
  }
});

server.listen(3000);
```

**Express ishlatsangiz**: `handler.capture(req)` ni `express.json()` kabi
body-parser middleware'lardan OLDIN chaqiring (yoki ular ishlatilmagan
alohida route'da), chunki u `req` stream'ini to'g'ridan-to'g'ri o'qiydi.
Agar body allaqachon boshqa middleware tomonidan o'qib bo'lingan bo'lsa,
`handler.parse(JSON.stringify(req.body))` orqali ishlatishingiz mumkin.

---

## Error Handling

Barcha metodlar xatolikda `ApiError` tashlaydi (v1 va v2 uchun bir xil),
webhook xato bersa `WebhookError` tashlanadi.

```js
const { ApiError, WebhookError } = require('checkout-uz');

try {
  const payment = await client.createPayment(50000);
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.message);
  }
}
```

---

## Author

**Hasanov Otabek** - [t.me/stoyishi](https://t.me/stoyishi) - otabek@hasanov.uz

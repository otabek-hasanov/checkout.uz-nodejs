'use strict';

/**
 * Example: API v2 - idempotency bilan to'lov yaratish, holatini tekshirish,
 * qaytarish va profil darajasidagi endpointlar.
 */

const { CheckoutClientV2, ApiError } = require('../src');

const client = new CheckoutClientV2('YOUR_SHOP_API_KEY');

async function main() {
  // --- To'lov yaratish (idempotencyKey bilan - tarmoq xatosi bo'lsa qayta
  //     yuborilganda ikki marta invoice ochilmaydi) ---
  let payment;
  try {
    payment = await client.createPayment(50000, 'Buyurtma #12345', {
      expireTime: 86400, // 24 soat
      returnUrl: 'https://yoursite.com/thank-you',
      idempotencyKey: 'order-12345', // o'zingizning buyurtma ID'ingiz
    });

    console.log("To'lov yaratildi:");
    console.log('  ID      :', payment.id);
    console.log('  URL     :', payment.url);
    console.log('  Pay via :', payment.payVia);
    console.log('  Replay  :', payment.isIdempotentReplay() ? "ha (eski invoice qaytdi)" : "yo'q (yangi yaratildi)");
  } catch (err) {
    if (err instanceof ApiError) {
      console.error('Xato:', err.message);
      process.exit(1);
    }
    throw err;
  }

  // --- Holatini tekshirish (v2'da provider + description ham qaytadi) ---
  try {
    const status = await client.getStatusById(payment.id);
    console.log('\nHolat     :', status.status);
    console.log('Provider  :', status.provider || '-');
    console.log('Izoh      :', status.description);
  } catch (err) {
    console.error('Xato:', err.message);
  }

  // --- To'langan buyurtmani bekor qilish / qaytarish (YANGI, faqat v2'da) ---
  // await client.cancelPayment(payment.id);   // hali to'lanmagan bo'lsa
  // await client.refundPayment(payment.id);   // to'langan bo'lsa (22 soat ichida)

  // --- Profil darajasidagi endpointlar (profile_api_key talab qiladi) ---
  const profileClient = new CheckoutClientV2('YOUR_PROFILE_API_KEY');

  try {
    const shops = await profileClient.getShops();
    console.log('\nKassalaringiz:', shops);
  } catch (err) {
    console.error('Xato:', err.message);
  }
}

main();
